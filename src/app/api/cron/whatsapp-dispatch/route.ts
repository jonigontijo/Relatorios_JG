import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendWhatsAppText, sanitizePhone } from "@/lib/whatsapp";
import { loadAppSettings } from "@/lib/whatsapp-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Drena a fila de disparos (ate 100) em uma execucao; limite do plano Hobby.
export const maxDuration = 60;

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

async function processDue(limit: number) {
  const supabase = createSupabaseServerClient();
  const settings = await loadAppSettings();

  if (!settings.whatsapp_api_url || !settings.whatsapp_api_token) {
    return {
      processed: 0,
      results: [] as unknown[],
      error: "UazAPI não configurada em /admin/configuracoes",
    };
  }

  const { data: due, error } = await supabase.rpc("list_due_dispatches", {
    p_limit: limit,
  });
  if (error) {
    return { processed: 0, results: [], error: error.message };
  }

  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const d of due ?? []) {
    const res = await sendWhatsAppText({
      apiUrl: settings.whatsapp_api_url,
      apiToken: settings.whatsapp_api_token,
      phone: sanitizePhone(d.phone),
      message: d.message,
    });
    if (res.ok) {
      await supabase.rpc("mark_dispatch_sent", {
        p_id: d.id,
        p_response: (res.response ?? null) as never,
      });
      results.push({ id: d.id, ok: true });
    } else {
      await supabase.rpc("mark_dispatch_failed", {
        p_id: d.id,
        p_error: res.error || `HTTP ${res.status}`,
        p_response: (res.response ?? null) as never,
      });
      results.push({
        id: d.id,
        ok: false,
        error: res.error || `HTTP ${res.status}`,
      });
    }
  }

  return { processed: results.length, results };
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
  const result = await processDue(limit);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return GET(request);
}
