import { NextResponse } from "next/server";
import { runWeeklyAutoDispatch } from "@/lib/auto-weekly";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Vercel free plan limit; gera ate 100 dispatches em ~60s para os 100+ clientes.
export const maxDuration = 60;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth =
    request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (auth && auth === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  if (url.searchParams.get("secret") === secret) return true;
  const headerSecret = request.headers.get("x-cron-secret");
  if (headerSecret && headerSecret === secret) return true;
  return false;
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const periodStart = url.searchParams.get("periodStart") ?? undefined;
  const periodEnd = url.searchParams.get("periodEnd") ?? undefined;
  const only = url.searchParams.get("only") ?? undefined;
  // Padrao = so gera e enfileira (envio fica para o cron whatsapp-dispatch das
  // 18h). Para gerar E enviar na mesma chamada (teste manual), use ?send=1.
  const enqueueOnly = url.searchParams.get("send") !== "1";

  const result = await runWeeklyAutoDispatch({
    dryRun,
    enqueueOnly,
    periodStart,
    periodEnd,
    siteUrl: getSiteUrl(),
    onlyClientIds: only ? only.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
  });

  return NextResponse.json(result);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
