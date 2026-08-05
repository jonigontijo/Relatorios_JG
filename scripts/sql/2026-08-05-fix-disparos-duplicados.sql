-- =====================================================================
-- Correcao: relatorios saindo DUPLICADOS e presos em "Pendente"
-- =====================================================================
--
-- STATUS EM 05/08/2026
--   [x] PASSO 1 - fila limpa (feito via API, nao pelo SQL abaixo):
--                 299 pendentes -> 152 'sent' (1 por relatorio, sent_at =
--                 horario do lote) + 147 'cancelled' (as duplicatas).
--                 Resultado: 0 pendentes, nada foi reenviado no WhatsApp.
--   [x] PASSO 2 - job 'auto_weekly_reports_friday_1745_brt' desagendado.
--                 Sobraram so purge_old_reports_daily_00brt e
--                 sm_sheets_autosync_every_min (esse ultimo e do JG Interno).
--   [ ] PASSO 3 - indice unico parcial (pendente)
--   [ ] PASSO 4 - confirmar que o cron de ENVIO roda (pendente)
--   [x] PASSO 5 - get_public_report nao depende mais de reports_enabled.
--                 Revalidados os 303 links: 303 vivos, 0 mortos (antes eram
--                 23 mortos). Token errado / slug inexistente continuam
--                 devolvendo null.
--
-- Os PASSOS 1 e 2 ficam registrados abaixo como documentacao; nao rode de
-- novo (o 1 nao tem mais o que cancelar, o 2 dara erro de job inexistente).
-- =====================================================================
--
-- DIAGNOSTICO (05/08/2026)
--
-- 1) DUPLICACAO: dois gatilhos independentes chamam /api/cron/weekly-reports
--    toda sexta-feira:
--      a. Vercel Cron  -> vercel.json, "0 16 * * 5" (no plano Hobby o disparo
--         acontece em qualquer minuto da hora: observado 16:47 e 16:55 UTC)
--      b. pg_cron      -> job 'auto_weekly_reports_friday_1745_brt',
--         "45 20 * * 5" (exato: observado 20:45:0x UTC toda sexta)
--    O job do pg_cron nasceu como "fallback" quando o Vercel Cron era
--    "45 20 * * 5"; quando o horario do Vercel mudou (commits f292a3b e
--    e0667a6), ninguem reagendou o pg_cron. Resultado: 2 execucoes por semana.
--    Como runWeeklyAutoDispatch REAPROVEITA o relatorio mas enfileirava um
--    disparo novo sem checar, sobravam 2 linhas em report_dispatches por
--    cliente por semana.
--
-- 2) PENDENTE: nada drena a fila. Em 303 disparos existentes: 0 'sent',
--    0 'failed', attempts = 0 em todos. O endpoint /api/cron/whatsapp-dispatch
--    nunca executou com sucesso.
--
-- ATENCAO: rode o passo 1 ANTES de religar o cron de envio. Senao, a primeira
-- execucao bem-sucedida despeja relatorios de julho no WhatsApp dos clientes.
-- =====================================================================


-- ---------------------------------------------------------------------
-- PASSO 0 - Diagnostico (so leitura, rode primeiro e guarde o resultado)
-- ---------------------------------------------------------------------

-- 0.1 Quais jobs de cron existem hoje no banco?
select jobid, jobname, schedule, active, command
from cron.job
order by jobname;

-- 0.2 Ultimas execucoes do pg_cron (confirma o gatilho das 20:45 UTC)
select jobid, runid, status, return_message, start_time
from cron.job_run_details
order by start_time desc
limit 30;

-- 0.3 Fila atual por status
select status, count(*), min(created_at) as mais_antigo, max(created_at) as mais_novo
from public.report_dispatches
group by status
order by status;

-- 0.4 Duplicados: mesmo relatorio com mais de um disparo pendente
select report_id, count(*) as disparos, array_agg(created_at order by created_at)
from public.report_dispatches
where status = 'pending'
group by report_id
having count(*) > 1
order by 2 desc;


-- ---------------------------------------------------------------------
-- PASSO 1 - Limpar a fila represada (OBRIGATORIO antes de religar o envio)
-- ---------------------------------------------------------------------
-- Cancela tudo que esta pendente ha mais de 48h. Sao relatorios das semanas
-- de julho: nao devem ser enviados agora.
update public.report_dispatches
set status = 'cancelled',
    last_error = 'Cancelado em massa: fila represada (cron de envio parado desde 10/07/2026)'
where status = 'pending'
  and created_at < now() - interval '48 hours';

-- Confere que sobrou zero pendente antigo:
select count(*) from public.report_dispatches
where status = 'pending' and created_at < now() - interval '48 hours';


-- ---------------------------------------------------------------------
-- PASSO 2 - Matar o gatilho duplicado (pg_cron de geracao)
-- ---------------------------------------------------------------------
-- O Vercel Cron (vercel.json) passa a ser o UNICO gatilho da geracao.
select cron.unschedule('auto_weekly_reports_friday_1745_brt');

-- Se o nome acima nao existir, use o jobname que apareceu no passo 0.1.


-- ---------------------------------------------------------------------
-- PASSO 3 - Impedir duplicidade no banco (cinto de seguranca)
-- ---------------------------------------------------------------------
-- Mesmo que dois gatilhos rodem de novo (retry da Vercel, chamada manual,
-- outro cron), o banco passa a recusar um segundo disparo PENDENTE para o
-- mesmo relatorio/canal. Disparos ja enviados nao entram no indice, entao
-- reenvio manual continua funcionando.
--
-- Requer o PASSO 1 antes: hoje existem 147 relatorios com 2 disparos pendentes
-- cada (299 pendentes no total), e a criacao do indice falha se sobrar algum
-- par duplicado.
create unique index if not exists report_dispatches_unico_pendente
  on public.report_dispatches (report_id, channel)
  where status = 'pending';


-- ---------------------------------------------------------------------
-- PASSO 4 - Garantir que o ENVIO realmente acontece
-- ---------------------------------------------------------------------
-- Confira primeiro em Vercel -> Projeto -> Settings -> Cron Jobs se
-- /api/cron/whatsapp-dispatch aparece listado e qual foi a ultima execucao.
--
-- Se ele NAO estiver rodando, agende o envio pelo pg_cron (que comprovadamente
-- funciona neste projeto - era ele que disparava as 20:45 em ponto).
-- Sexta 18:30 UTC = 15:30 BRT, o horario pretendido no commit e0667a6.
--
-- Pre-requisito (uma vez, se ainda nao foi feito):
--   alter database postgres set app.cron_secret = '<mesmo valor do CRON_SECRET da Vercel>';
--
-- Descomente para aplicar:
--
-- select cron.schedule(
--   'whatsapp_dispatch_friday_1530_brt',
--   '30 18 * * 5',
--   $$
--   select net.http_post(
--     url := 'https://relatorios-jg.vercel.app/api/cron/whatsapp-dispatch',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || coalesce(current_setting('app.cron_secret', true), '')
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
--
-- Se optar por isso, REMOVA o cron de whatsapp-dispatch do vercel.json para nao
-- ter dois gatilhos de envio (o mesmo erro que causou a duplicacao da geracao).


-- ---------------------------------------------------------------------
-- PASSO 5 - "Relatorio indisponivel" quando o cliente clica no link
-- ---------------------------------------------------------------------
-- PROBLEMA SEPARADO da duplicacao. public.get_public_report(slug, token) exige
-- que o cliente esteja com reports_enabled = true NO MOMENTO DO CLIQUE. Ou
-- seja: ao desativar um cliente no admin, TODOS os links ja enviados a ele
-- morrem na hora e passam a mostrar "Relatorio indisponivel".
--
-- Comprovado em 05/08/2026 alternando reports_enabled de um cliente e
-- reconsultando o MESMO link:
--   reports_enabled = false -> get_public_report devolve null
--   reports_enabled = true  -> get_public_report devolve o relatorio
--   reports_enabled = false -> null de novo   (cliente revertido ao original)
--
-- Dos 303 disparos, 23 tinham link morto e TODOS os 23 eram de clientes
-- desativados (5 clientes). Os outros 280 funcionavam. Correlacao de 100%.
--
-- Desativar um cliente deve parar relatorios NOVOS, nao invalidar o que ja foi
-- entregue. A correcao e tirar o reports_enabled da condicao de leitura
-- publica (a validacao real do link continua sendo slug + token + published).
--
-- 5.1 Guarde a definicao atual antes de mexer:
select pg_get_functiondef(p.oid)
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'get_public_report';

-- 5.2 No corpo devolvido acima, localize no join/where com public.clients a
--     condicao de reports_enabled (algo como "and c.reports_enabled" ou
--     "and coalesce(c.reports_enabled, true)") e REMOVA apenas ela, mantendo
--     o resto da funcao intacto (inclusive security definer e search_path).
--     Reaplique com create or replace function.
--
-- 5.3 Depois de aplicar, valide com o link de um cliente desativado. Pegue um
--     par slug/token direto do banco (nao deixe valores reais versionados
--     neste arquivo - o repositorio e publico e o link e de acesso aberto):
--
--     select r.public_slug, r.public_token
--     from public.weekly_reports r
--     join public.clients c on c.id = r.client_id
--     where c.reports_enabled = false and r.status = 'published'
--     limit 1;
--
--     select public.get_public_report('<slug>', '<token>');
--     -- deve devolver o JSON do relatorio, nao null
--
-- ALTERNATIVA IMEDIATA (sem SQL): reativar reports_enabled dos clientes
-- afetados no admin. Resolve o link na hora, mas eles voltam a receber o
-- envio semanal.
