import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEFAULT_TEMPLATE, type AppSettings } from "@/lib/whatsapp";
import type { Database } from "@/lib/supabase/types";

export async function loadAppSettings(
  client?: SupabaseClient<Database>,
): Promise<AppSettings> {
  const supabase = client ?? createSupabaseServerClient();
  const { data } = await supabase.rpc("get_app_settings");
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {
      whatsapp_api_url: null,
      whatsapp_api_token: null,
      whatsapp_default_template: DEFAULT_TEMPLATE,
      whatsapp_default_instance: null,
      updated_at: null,
    };
  }
  const r = data as Record<string, unknown>;
  return {
    whatsapp_api_url: (r.whatsapp_api_url as string | null) ?? null,
    whatsapp_api_token: (r.whatsapp_api_token as string | null) ?? null,
    whatsapp_default_template:
      (r.whatsapp_default_template as string | null) ?? DEFAULT_TEMPLATE,
    whatsapp_default_instance:
      (r.whatsapp_default_instance as string | null) ?? null,
    updated_at: (r.updated_at as string | null) ?? null,
  };
}
