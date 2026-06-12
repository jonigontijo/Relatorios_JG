-- Migração: suporte a clientes Google Ads + abas Meta/Google
-- Data: 2026-06-12
--
-- Abordagem ADITIVA: não altera nenhuma função existente
-- (create_report_client / update_report_client / list_report_clients
-- continuam exatamente como estão). Apenas adiciona 1 coluna e 2 funções novas.
--
-- Rode este bloco inteiro no SQL Editor do Supabase (projeto JGINTERNO).

-- 1) Coluna nova na tabela compartilhada de clientes (idempotente)
alter table public.clients
  add column if not exists google_ads_account_id text;

-- 2) Grava/atualiza/limpa o ID Google Ads de um cliente.
--    Passar string vazia ou NULL limpa o campo.
create or replace function public.set_client_google_ads_id(
  p_id text,
  p_google_ads_account_id text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.clients
     set google_ads_account_id = nullif(btrim(p_google_ads_account_id), '')
   where id::text = p_id;
$$;

-- 3) Lista o ID Google Ads de todos os clientes (usado nas abas Meta/Google).
create or replace function public.get_report_clients_google()
returns table (id text, google_ads_account_id text)
language sql
security definer
set search_path = public
as $$
  select id::text, google_ads_account_id
    from public.clients;
$$;

-- 4) Permissões (mesmo padrão das RPCs já usadas pelo app via chave anon)
grant execute on function public.set_client_google_ads_id(text, text)
  to anon, authenticated;
grant execute on function public.get_report_clients_google()
  to anon, authenticated;
