import { headers } from "next/headers";

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Retorna a URL pública (sem barra no final) usada para montar links de relatório.
 *
 * Ordem de preferência:
 * 1. NEXT_PUBLIC_SITE_URL — se for uma URL http(s) válida.
 * 2. Cabeçalhos da request (x-forwarded-proto + x-forwarded-host/host) — derivado automaticamente
 *    em deploys serverless (Vercel) e atrás de proxy.
 * 3. http://localhost:3000 — último fallback.
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/^['"]|['"]$/g, "");
  if (raw && isValidHttpUrl(raw)) {
    return raw.replace(/\/+$/, "");
  }

  try {
    const h = headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (host) {
      return `${proto}://${host}`.replace(/\/+$/, "");
    }
  } catch {
    // fora de uma request: ignora
  }

  return "http://localhost:3000";
}
