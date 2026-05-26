import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/types";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

function preview(value: string) {
  // mostra os 8 primeiros e 4 últimos caracteres + comprimento, sem expor o valor inteiro
  const trimmed = value;
  const head = trimmed.slice(0, 8);
  const tail = trimmed.slice(-4);
  return `len=${trimmed.length} startsWith=${JSON.stringify(head)} endsWith=${JSON.stringify(tail)}`;
}

export function createSupabaseServerClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!rawUrl || !rawKey) {
    throw new Error(
      "Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY ausentes. Configure-as no projeto (Vercel → Settings → Environment Variables) e refaça o deploy.",
    );
  }
  const url = rawUrl.trim().replace(/^['"]|['"]$/g, "");
  const anonKey = rawKey.trim().replace(/^['"]|['"]$/g, "");
  try {
    new URL(url);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL não é uma URL válida. Esperado algo como "https://xxx.supabase.co". Valor recebido: ${preview(rawUrl)}`,
    );
  }
  const cookieStore = cookies();
  return createServerClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // chamadas em Server Components não podem definir cookies — ignorar
          }
        },
      },
    },
  );
}
