"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  dispatchSchema,
  sanitizePhone,
  sendWhatsAppText,
  type DispatchInput,
} from "@/lib/whatsapp";
import { loadAppSettings } from "@/lib/whatsapp-server";

export type DispatchActionResult =
  | { ok: true; dispatchId: string; status: "sent" | "scheduled" }
  | { ok: false; error: string };

export async function sendOrScheduleDispatchAction(
  raw: DispatchInput,
): Promise<DispatchActionResult> {
  const parsed = dispatchSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ") || "Dados inválidos",
    };
  }
  const data = parsed.data;
  const supabase = createSupabaseServerClient();

  let scheduledIso: string | null = null;
  if (data.mode === "schedule") {
    const d = new Date(data.scheduledAt as string);
    if (Number.isNaN(d.getTime())) {
      return { ok: false, error: "Data/hora de agendamento inválida" };
    }
    scheduledIso = d.toISOString();
  }

  const { data: dispatchId, error: enqueueErr } = await supabase.rpc(
    "enqueue_report_dispatch",
    {
      p_report_id: data.reportId,
      p_phone: data.phone,
      p_message: data.message,
      p_scheduled_at: scheduledIso ?? undefined,
      p_channel: "whatsapp",
    },
  );
  if (enqueueErr || !dispatchId) {
    return {
      ok: false,
      error: enqueueErr?.message ?? "Falha ao registrar o envio",
    };
  }

  revalidatePath(`/admin/relatorios/${data.reportId}`);

  if (data.mode === "schedule") {
    return { ok: true, dispatchId, status: "scheduled" };
  }

  const settings = await loadAppSettings();
  if (!settings.whatsapp_api_url || !settings.whatsapp_api_token) {
    await supabase.rpc("mark_dispatch_failed", {
      p_id: dispatchId,
      p_error: "Configure URL e token em /admin/configuracoes antes de enviar.",
    });
    return {
      ok: false,
      error:
        "Configure a URL e o token em /admin/configuracoes antes de enviar.",
    };
  }

  const res = await sendWhatsAppText({
    apiUrl: settings.whatsapp_api_url,
    apiToken: settings.whatsapp_api_token,
    phone: sanitizePhone(data.phone),
    message: data.message,
  });

  if (!res.ok) {
    await supabase.rpc("mark_dispatch_failed", {
      p_id: dispatchId,
      p_error: res.error || `HTTP ${res.status}`,
      p_response: (res.response ?? null) as never,
    });
    return {
      ok: false,
      error: res.error || `Falha no envio (HTTP ${res.status})`,
    };
  }

  await supabase.rpc("mark_dispatch_sent", {
    p_id: dispatchId,
    p_response: (res.response ?? null) as never,
  });

  revalidatePath(`/admin/relatorios/${data.reportId}`);
  return { ok: true, dispatchId, status: "sent" };
}

export async function cancelDispatchAction(
  dispatchId: string,
  reportId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("cancel_dispatch", { p_id: dispatchId });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/relatorios/${reportId}`);
  return { ok: true };
}

export async function retryDispatchAction(
  dispatchId: string,
  reportId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createSupabaseServerClient();

  const { data: rows, error: fetchErr } = await supabase.rpc(
    "list_report_dispatches",
    { p_report_id: reportId },
  );
  if (fetchErr) return { ok: false, error: fetchErr.message };
  const target = (rows ?? []).find((r) => r.id === dispatchId);
  if (!target) return { ok: false, error: "Disparo não encontrado" };

  const settings = await loadAppSettings();
  if (!settings.whatsapp_api_url || !settings.whatsapp_api_token) {
    return {
      ok: false,
      error:
        "Configure a URL e o token em /admin/configuracoes antes de reenviar.",
    };
  }

  const res = await sendWhatsAppText({
    apiUrl: settings.whatsapp_api_url,
    apiToken: settings.whatsapp_api_token,
    phone: sanitizePhone(target.phone),
    message: target.message,
  });

  if (!res.ok) {
    await supabase.rpc("mark_dispatch_failed", {
      p_id: dispatchId,
      p_error: res.error || `HTTP ${res.status}`,
      p_response: (res.response ?? null) as never,
    });
    revalidatePath(`/admin/relatorios/${reportId}`);
    return { ok: false, error: res.error || `Falha no envio` };
  }

  await supabase.rpc("mark_dispatch_sent", {
    p_id: dispatchId,
    p_response: (res.response ?? null) as never,
  });
  revalidatePath(`/admin/relatorios/${reportId}`);
  return { ok: true };
}
