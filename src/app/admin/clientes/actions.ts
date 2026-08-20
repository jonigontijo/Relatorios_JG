"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clientEditSchema, type ClientEditValues } from "@/lib/client-schema";

export type CreateClientResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createClientAction(
  _raw: unknown,
): Promise<CreateClientResult> {
  // Cadastro de cliente foi centralizado na aba Clientes do sistema interno.
  // Esta rota criava um registro paralelo em public.clients sem checar
  // duplicidade — foi a origem dos cadastros repetidos de XP IMOVEIS e
  // PL SOLUCOES FINANCEIRAS. A funcao create_report_client tambem foi
  // revogada no banco, entao isto aqui e apenas a mensagem amigavel.
  return {
    ok: false,
    error:
      "Cadastro de cliente desativado neste app. Cadastre o cliente na aba Clientes do sistema interno da JG; ele aparece aqui automaticamente.",
  };
}

function buildUrlsJson(v: ClientEditValues): Record<string, string> {
  const out: Record<string, string> = {};
  // "default" foi descontinuado: o link antigo (sempre Meta) migra para "meta".
  const metaUrl = v.data_studio_url_meta || v.data_studio_url_default;
  if (metaUrl) out.meta = metaUrl;
  if (v.data_studio_url_google) out.google = v.data_studio_url_google;
  if (v.data_studio_url_mensagem) out.mensagem = v.data_studio_url_mensagem;
  if (v.data_studio_url_ecommerce) out.ecommerce = v.data_studio_url_ecommerce;
  if (v.data_studio_url_formulario) out.formulario = v.data_studio_url_formulario;
  if (v.data_studio_url_misto) out.misto = v.data_studio_url_misto;
  return out;
}

export async function updateClientAction(
  clientId: string,
  raw: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = clientEditSchema.safeParse(raw);
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
  const urls = buildUrlsJson(parsed.data);
  const adsId = (parsed.data.meta_ads_account_id ?? "").trim();
  const googleAdsId = (parsed.data.google_ads_account_id ?? "").trim();
  const whatsapp = (parsed.data.whatsapp ?? "").trim();

  const { error } = await supabase.rpc("update_report_client", {
    p_id: clientId,
    p_company: parsed.data.company,
    p_name: parsed.data.name,
    p_meta_ads_account_id: adsId || undefined,
    p_data_studio_urls: urls,
    p_whatsapp: whatsapp || undefined,
  });
  if (error) return { ok: false, error: error.message };

  const { error: gErr } = await supabase.rpc("set_client_google_ads_id", {
    p_id: clientId,
    p_google_ads_account_id: googleAdsId,
  });
  if (gErr) return { ok: false, error: gErr.message };

  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${clientId}`);
  revalidatePath("/admin/relatorios");
  revalidatePath("/admin/relatorios/novo");
  return { ok: true };
}

export async function toggleClientReportsAction(
  clientId: string,
  enabled: boolean,
) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("toggle_report_client_enabled", {
    p_id: clientId,
    p_enabled: enabled,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${clientId}`);
  return { ok: true as const };
}

export async function deleteClientAction(clientId: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("hide_report_client", { p_id: clientId });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/relatorios");
  revalidatePath("/admin/relatorios/novo");
  return { ok: true as const };
}

export async function deleteReportFromClientAction(reportId: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("delete_report", { p_id: reportId });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/relatorios");
  return { ok: true as const };
}
