"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendWhatsAppText, settingsSchema, sanitizePhone } from "@/lib/whatsapp";
import { loadAppSettings } from "@/lib/whatsapp-server";

export async function saveSettingsAction(
  raw: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ") || "Dados inválidos",
    };
  }
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("update_app_settings", {
    p_whatsapp_api_url: parsed.data.whatsapp_api_url || "",
    p_whatsapp_api_token: parsed.data.whatsapp_api_token || "",
    p_whatsapp_default_template: parsed.data.whatsapp_default_template || "",
    p_whatsapp_default_instance: parsed.data.whatsapp_default_instance || "",
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/configuracoes");
  return { ok: true };
}

export async function testWhatsAppAction(input: {
  phone: string;
  message: string;
}): Promise<{ ok: true; status: number } | { ok: false; error: string }> {
  const phone = sanitizePhone(input.phone || "");
  if (phone.length < 10 || phone.length > 15) {
    return { ok: false, error: "Número de teste inválido" };
  }
  const settings = await loadAppSettings();
  if (!settings.whatsapp_api_url || !settings.whatsapp_api_token) {
    return {
      ok: false,
      error: "Salve a URL e o token antes de testar.",
    };
  }
  const res = await sendWhatsAppText({
    apiUrl: settings.whatsapp_api_url,
    apiToken: settings.whatsapp_api_token,
    phone,
    message: input.message || "Mensagem de teste do JG Relatórios.",
  });
  if (!res.ok) {
    return { ok: false, error: res.error || `HTTP ${res.status}` };
  }
  return { ok: true, status: res.status };
}
