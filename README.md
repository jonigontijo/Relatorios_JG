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

## Próximos passos sugeridos

- Integrar autenticação Supabase (login com `profiles.username`) — hoje o RLS já está pronto, falta o middleware de auth no `/admin`.
- Adicionar exportação de uma "imagem do dashboard" (screenshot) capturada por um endpoint Puppeteer para incluir no PDF.
- Habilitar duplicação do relatório anterior do mesmo cliente como base do próximo.
- Lista de filtros na listagem (por cliente, por status, por mês).
