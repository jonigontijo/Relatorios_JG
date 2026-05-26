import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

let cached: SupabaseClient<Database> | null = null;

export function createSupabaseServiceClient(): SupabaseClient<Database> {
  if (cached) return cached;
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!rawUrl || !rawKey) {
    throw new Error(
      "Supabase env vars não configuradas (NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    );
  }
  const url = rawUrl.trim().replace(/^['"]|['"]$/g, "");
  const key = rawKey.trim().replace(/^['"]|['"]$/g, "");
  try {
    new URL(url);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL não é uma URL válida (esperado algo como "https://xxx.supabase.co").`,
    );
  }
  cached = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
