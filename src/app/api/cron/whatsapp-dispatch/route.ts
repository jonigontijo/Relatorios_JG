import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { sendWhatsAppText, sanitizePhone } from "@/lib/whatsapp";
import { loadAppSettings } from "@/lib/whatsapp-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Drena a fila de disparos (ate 100) em uma execucao; limite do plano Hobby.
export const maxDuration = 60;

// Um disparo semanal so faz sentido nas horas seguintes a geracao. Se a fila
// ficou parada (cron desligado, deploy quebrado, etc.), NAO queremos despejar
// relatorios de semanas atras no WhatsApp do cliente quando o cron voltar.
// Disparos mais velhos que isso sao cancelados em vez de enviados.
const DEFAULT_MAX_AGE_HOURS = 48;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // allow when not configured (local/dev)
  const auth =
    request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (auth && auth === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  if (url.searchParams.get("secret") === secret) return true;
  const headerSecret = request.headers.get("x-cron-secret");
  if (headerSecret && headerSecret === secret) return true;
  return false;
}

type DispatchResult = {
  id: string;
  ok: boolean;
  skipped?: "stale" | "client_disabled" | "duplicate";
  error?: string;
};

async function processDue(limit: number, maxAgeHours: number) {
  // Cron nao tem sessao de usuario: sempre o client de servico (service role).
  // Com o client de cookies o request roda como `anon` e qualquer aperto de RLS
  // futuro derruba a fila silenciosamente.
  const supabase = createSupabaseServiceClient();
  const settings = await loadAppSettings(supabase);

  if (!settings.whatsapp_api_url || !settings.whatsapp_api_token) {
    return {
      processed: 0,
      sent: 0,
      failed: 0,
      cancelled: 0,
      results: [] as DispatchResult[],
      error: "UazAPI não configurada em /admin/configuracoes",
    };
  }

  const { data: due, error } = await supabase.rpc("list_due_dispatches", {
    p_limit: limit,
  });
  if (error) {
    return {
      processed: 0,
      sent: 0,
      failed: 0,
      cancelled: 0,
      results: [] as DispatchResult[],
      error: error.message,
    };
  }

  const queue = due ?? [];
  if (queue.length === 0) {
    return {
      processed: 0,
      sent: 0,
      failed: 0,
      cancelled: 0,
      results: [] as DispatchResult[],
    };
  }

  // list_due_dispatches nao devolve created_at; buscamos aqui para aplicar a
  // regra de validade (maxAgeHours).
  const { data: rows, error: rowsErr } = await supabase
    .from("report_dispatches")
    .select("id, created_at, report_id, channel")
    .in(
      "id",
      queue.map((d) => d.id),
    );
  if (rowsErr) {
    return {
      processed: 0,
      sent: 0,
      failed: 0,
      cancelled: 0,
      results: [] as DispatchResult[],
      error:
        "Nao foi possivel ler os disparos da fila; envio abortado por seguranca. " +
        rowsErr.message,
    };
  }
  const meta = new Map(rows?.map((r) => [r.id, r]) ?? []);

  // REGRA CRITICA: o que vale e o status do cliente NO MOMENTO DO ENVIO.
  // Entre a geracao (13h) e o envio (15:30) o cliente pode ter sido
  // desativado ou removido. Buscamos o estado ATUAL e nunca enviamos para
  // quem nao estiver ativo agora. Se nao conseguirmos verificar o status,
  // abortamos o envio inteiro por seguranca (melhor nao enviar do que enviar
  // para um cliente inativo).
  const { data: allClients, error: clientsErr } = await supabase.rpc(
    "list_report_clients",
  );
  if (clientsErr || !allClients) {
    return {
      processed: 0,
      sent: 0,
      failed: 0,
      cancelled: 0,
      results: [] as DispatchResult[],
      error:
        "Nao foi possivel verificar o status dos clientes; envio abortado por seguranca. " +
        (clientsErr?.message ?? ""),
    };
  }
  const enabledNow = new Map<string, boolean>();
  for (const c of allClients) {
    // reports_enabled pode ser null (= ativo por padrao); so e inativo se false.
    enabledNow.set(c.id, c.reports_enabled !== false);
  }

  const now = Date.now();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  // Guarda contra fila duplicada: se dois gatilhos enfileiraram o mesmo
  // relatorio, so o primeiro da rodada e enviado; o resto e cancelado.
  const seenReports = new Set<string>();

  const results: DispatchResult[] = [];
  let sent = 0;
  let failed = 0;
  let cancelled = 0;

  for (const d of queue) {
    const row = meta.get(d.id);

    // Disparo velho demais (fila represada) -> cancela, nao envia.
    const createdAt = row?.created_at ? Date.parse(row.created_at) : NaN;
    if (Number.isFinite(createdAt) && now - createdAt > maxAgeMs) {
      await supabase.rpc("cancel_dispatch", { p_id: d.id });
      cancelled += 1;
      results.push({
        id: d.id,
        ok: false,
        skipped: "stale",
        error: `Disparo com mais de ${maxAgeHours}h na fila; cancelado sem enviar`,
      });
      continue;
    }

    // Mesmo relatorio ja tratado nesta rodada -> disparo duplicado.
    const dedupeKey = `${d.report_id}:${d.channel}`;
    if (seenReports.has(dedupeKey)) {
      await supabase.rpc("cancel_dispatch", { p_id: d.id });
      cancelled += 1;
      results.push({
        id: d.id,
        ok: false,
        skipped: "duplicate",
        error: "Ja existe disparo deste relatorio nesta rodada; cancelado",
      });
      continue;
    }

    // Cliente inativo ou removido no momento do envio -> cancela, nao envia.
    if (!enabledNow.get(d.client_id)) {
      await supabase.rpc("cancel_dispatch", { p_id: d.id });
      cancelled += 1;
      results.push({
        id: d.id,
        ok: false,
        skipped: "client_disabled",
        error: "Cliente inativo no momento do envio; disparo cancelado",
      });
      continue;
    }

    seenReports.add(dedupeKey);

    const res = await sendWhatsAppText({
      apiUrl: settings.whatsapp_api_url,
      apiToken: settings.whatsapp_api_token,
      phone: sanitizePhone(d.phone),
      message: d.message,
    });
    if (res.ok) {
      const { error: markErr } = await supabase.rpc("mark_dispatch_sent", {
        p_id: d.id,
        p_response: (res.response ?? null) as never,
      });
      if (markErr) {
        // Enviado mas nao marcado = seria reenviado no proximo cron. Reportamos
        // alto e claro em vez de deixar passar em silencio.
        failed += 1;
        results.push({
          id: d.id,
          ok: true,
          error: `ENVIADO, mas falhou ao marcar como enviado (risco de reenvio): ${markErr.message}`,
        });
        continue;
      }
      sent += 1;
      results.push({ id: d.id, ok: true });
    } else {
      await supabase.rpc("mark_dispatch_failed", {
        p_id: d.id,
        p_error: res.error || `HTTP ${res.status}`,
        p_response: (res.response ?? null) as never,
      });
      failed += 1;
      results.push({
        id: d.id,
        ok: false,
        error: res.error || `HTTP ${res.status}`,
      });
    }
  }

  return { processed: results.length, sent, failed, cancelled, results };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") || "100", 10) || 100, 1),
    100,
  );
  const maxAgeHours = Math.max(
    parseInt(
      url.searchParams.get("maxAgeHours") || String(DEFAULT_MAX_AGE_HOURS),
      10,
    ) || DEFAULT_MAX_AGE_HOURS,
    1,
  );
  const result = await processDue(limit, maxAgeHours);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return GET(request);
}
