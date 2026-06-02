# JG · Relatórios

Plataforma interna da JG para criar e enviar relatórios de mídia (semanais / mensais) aos clientes. O gestor preenche um formulário dinâmico, publica e o cliente recebe um link com a visão completa — Data Studio embutido + bloco de análise + tarefas — e um botão para baixar a versão PDF.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind + shadcn/ui
- **Supabase** (Postgres + RLS) — reaproveita o projeto `JGINTERNO`
- **@react-pdf/renderer** para gerar PDF server-side
- **react-hook-form** + **zod** no formulário

## Estrutura

```
src/
  app/
    admin/relatorios/              # Área do gestor (autenticada via Supabase Auth + RLS)
      page.tsx                     # Listagem
      novo/page.tsx                # Criar
      [id]/page.tsx                # Editar
      actions.ts                   # Server Actions (save / publish / delete)
      report-form.tsx              # Form dinâmico (client component)
    r/[slug]/page.tsx              # Página pública do cliente (link + token)
    api/pdf/[id]/route.tsx         # Endpoint que devolve o PDF
  lib/
    supabase/{client,server,types}.ts
    report-schema.ts               # Schema zod + opções (objetivos / plataformas)
    report-data.ts                 # Carregamento via RPC `get_public_report`
    pdf-template.tsx               # Layout PDF
    utils.ts
```

## Tabelas no Supabase

Criadas pela migração `create_weekly_reports_module`:

- `weekly_reports` — cabeçalho, métricas em destaque, status, slug + token público
- `report_campaigns` — blocos dinâmicos de campanha
- `report_tasks` — tarefas (`owner = agency | client`)
- Função `public.get_public_report(p_slug, p_token)` — devolve o JSON completo para o link público (sem auth)
- Função `public.has_reports_access()` — checa `profiles.module_access` para autorização do gestor

RLS:
- gestor com `module_access` contendo `reports` ou `admin` (ou `is_admin = true`) lê/escreve tudo
- cliente final acessa **apenas** via função `get_public_report` (slug + token, status `published`)

## Setup local

```bash
cp .env.local.example .env.local   # já preenchido com o projeto JGINTERNO
npm install
npm run dev                        # http://localhost:3000
```

Variáveis:

| Variável | Descrição |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima |
| `NEXT_PUBLIC_SITE_URL` | URL pública usada para montar o link enviado ao cliente |

## Fluxo de uso

1. **Gestor** entra em `/admin/relatorios` (em produção, dentro da Área do Gestor já autenticada).
2. Clica em **Novo relatório** → seleciona cliente, define período, cola o link do Looker / Data Studio.
3. Preenche **Visão geral de investimento** (Meta + Google) e adiciona **métricas em destaque** (cards no topo).
4. Adiciona **campanhas** (uma a uma) com objetivo, investimento, volume e custo por resultado. Campos opcionais para sub-divisão, seguidores ganhos/atuais aparecem conforme o objetivo.
5. Escreve o **bloco de análise do gestor** (texto livre, parágrafos separados por linha em branco) e a **conclusão**.
6. Lista **tarefas da agência** e **tarefas do cliente**.
7. Clica em **Publicar** → o sistema marca `status = published`, registra `published_at` e gera o link público.
8. Botões **Copiar link**, **Visualizar** e **Baixar PDF** aparecem no topo do formulário.

## Layout do PDF

O PDF reproduz a página pública em A4 com:

- Cabeçalho com tipo, título, período e link clicável para o dashboard
- KPIs (investimento total, Meta Ads, Google Ads, métricas em destaque)
- Bloco de análise do gestor (parágrafos preservados)
- Grid de campanhas (2 colunas)
- Conclusão
- Próximos passos (tarefas agência / cliente lado a lado)
- Rodapé com paginação e identificação do cliente

## Envio automático toda sexta às 17:45 (BRT)

A skill `auto_weekly_reports` está implementada e ativa em produção. Toda sexta-feira, às 17:45 (horário de Brasília, UTC-3), o sistema:

1. Lista todos os clientes com `reports_enabled = true` **e** `whatsapp` preenchido (clientes sem WhatsApp são ignorados silenciosamente).
2. Para cada cliente, verifica se já existe um relatório `published` cobrindo a semana atual (`period_end >= sexta-anterior`).
3. Se **não existir**, publica um relatório semanal mínimo automaticamente — período = "sexta passada → quinta-feira (ontem)", investimentos zerados, sem campanhas/análise, com `data_studio_url` = `data_studio_urls.default` do cliente (quando disponível).
4. Sorteia uma das variações de mensagem (`MESSAGE_VARIANTS` em `src/lib/whatsapp.ts`), renderiza com `{{cliente}}`, `{{desde}}`, `{{ate}}`, `{{periodo}}`, `{{link}}` e enfileira o disparo via `enqueue_report_dispatch`.
5. Dispara imediatamente pela UazAPI (se configurada em `/admin/configuracoes`).

### Arquivos envolvidos

```
src/lib/auto-weekly.ts                    # logica central (computeWeeklyPeriod + runWeeklyAutoDispatch)
src/app/api/cron/weekly-reports/route.ts  # endpoint protegido por CRON_SECRET
vercel.json                               # cron Vercel: 45 20 * * 5 (UTC = 17:45 BRT)
supabase/migracoes (pg_cron)              # job 'auto_weekly_reports_friday_1745_brt' (fallback)
```

### Dois gatilhos rodando em paralelo (redundância)

| Gatilho | Onde | Cronograma | Endpoint |
| --- | --- | --- | --- |
| **Primário** | Vercel Cron | `45 20 * * 5` (UTC) | `/api/cron/weekly-reports` (autenticado via header `Authorization: Bearer $CRON_SECRET`) |
| **Fallback** | pg_cron (Supabase) | `45 20 * * 5` (UTC) | mesmo endpoint, autenticado via `app.cron_secret` em `current_setting` |

> O endpoint é idempotente: se o Vercel Cron já tiver publicado os relatórios da semana, o segundo disparo encontrará tudo como `reused` e simplesmente reenviará o WhatsApp **só se** ainda não houver dispatch desse relatório. Para evitar duplicidade, configure o pg_cron apenas como contingência (basta desativar: `select cron.unschedule('auto_weekly_reports_friday_1745_brt');`).

### Setup uma vez no Supabase (para o pg_cron funcionar com segredo)

```sql
alter database postgres set app.cron_secret = '<mesma string do CRON_SECRET do Vercel>';
```

A URL do app já está embutida no helper `public.trigger_weekly_reports_cron()` (`https://relatorios-jg.vercel.app/api/cron/weekly-reports`). Se mudar o domínio, edite a função.

### Testar manualmente

```bash
# Dry-run (não publica, não envia) — mostra exatamente o que seria feito
curl "https://relatorios-jg.vercel.app/api/cron/weekly-reports?dryRun=1&secret=$CRON_SECRET"

# Forçar disparo real agora (qualquer dia/hora):
curl -X POST "https://relatorios-jg.vercel.app/api/cron/weekly-reports?secret=$CRON_SECRET"

# Disparar só para clientes específicos:
curl "https://relatorios-jg.vercel.app/api/cron/weekly-reports?secret=$CRON_SECRET&only=c4,c18"

# Forçar período customizado:
curl "https://relatorios-jg.vercel.app/api/cron/weekly-reports?secret=$CRON_SECRET&periodStart=2026-05-23&periodEnd=2026-05-29"
```

### Histórico no Supabase

- `cron.job` — lista jobs agendados.
- `cron.job_run_details` — histórico de execuções do pg_cron (status, retorno, erros).
- `report_dispatches` — todos os disparos enfileirados/enviados ficam aqui (visível também em `/admin/relatorios/[id]`).

## Próximos passos sugeridos

- Integrar autenticação Supabase (login com `profiles.username`) — hoje o RLS já está pronto, falta o middleware de auth no `/admin`.
- Adicionar exportação de uma "imagem do dashboard" (screenshot) capturada por um endpoint Puppeteer para incluir no PDF.
- Habilitar duplicação do relatório anterior do mesmo cliente como base do próximo.
- Lista de filtros na listagem (por cliente, por status, por mês).
- Expor uma UI em `/admin/configuracoes` para ligar/desligar o cron de sexta e visualizar o histórico das últimas execuções automáticas.
