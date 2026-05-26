import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { sanitizePhone, sendWhatsAppText } from "@/lib/whatsapp";
import { loadAppSettings } from "@/lib/whatsapp-server";

const POLL_INTERVAL_MS = 60_000;
const BATCH_LIMIT = 20;

type GlobalScope = typeof globalThis & {
  __jgWhatsappSchedulerStarted?: boolean;
  __jgWhatsappSchedulerInterval?: NodeJS.Timeout;
  __jgWhatsappSchedulerRunning?: boolean;
  __jgWhatsappSchedulerLastRunAt?: number;
  __jgWhatsappSchedulerLastError?: string | null;
};

const g = globalThis as GlobalScope;

export function getSchedulerStatus() {
  return {
    started: Boolean(g.__jgWhatsappSchedulerStarted),
    lastRunAt: g.__jgWhatsappSchedulerLastRunAt ?? null,
    lastError: g.__jgWhatsappSchedulerLastError ?? null,
  };
}

async function processBatch() {
  if (g.__jgWhatsappSchedulerRunning) return;
  g.__jgWhatsappSchedulerRunning = true;
  try {
    const supabase = createSupabaseServiceClient();
    const settings = await loadAppSettings(supabase);

    if (!settings.whatsapp_api_url || !settings.whatsapp_api_token) {
      g.__jgWhatsappSchedulerLastError = "UazAPI não configurada";
      return;
    }

    const { data: due, error } = await supabase.rpc("list_due_dispatches", {
      p_limit: BATCH_LIMIT,
    });
    if (error) {
      g.__jgWhatsappSchedulerLastError = error.message;
      return;
    }

    if (!due || due.length === 0) {
      g.__jgWhatsappSchedulerLastError = null;
      return;
    }

    for (const d of due) {
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
      } else {
        await supabase.rpc("mark_dispatch_failed", {
          p_id: d.id,
          p_error: res.error || `HTTP ${res.status}`,
          p_response: (res.response ?? null) as never,
        });
      }
    }
    g.__jgWhatsappSchedulerLastError = null;
  } catch (err) {
    g.__jgWhatsappSchedulerLastError =
      err instanceof Error ? err.message : "Erro desconhecido";
  } finally {
    g.__jgWhatsappSchedulerLastRunAt = Date.now();
    g.__jgWhatsappSchedulerRunning = false;
  }
}

export function startWhatsAppScheduler() {
  if (g.__jgWhatsappSchedulerStarted) return;
  g.__jgWhatsappSchedulerStarted = true;

  const tick = () => {
    void processBatch();
  };

  setTimeout(tick, 5_000);
  g.__jgWhatsappSchedulerInterval = setInterval(tick, POLL_INTERVAL_MS);

  if (typeof g.__jgWhatsappSchedulerInterval === "object") {
    const handle = g.__jgWhatsappSchedulerInterval as unknown as {
      unref?: () => void;
    };
    handle.unref?.();
  }
}

export async function runSchedulerOnce() {
  await processBatch();
  return getSchedulerStatus();
}
