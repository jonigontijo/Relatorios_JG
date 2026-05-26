export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.DISABLE_INTERNAL_SCHEDULER === "1") return;
  // Em ambientes serverless (Vercel) setInterval não persiste entre invocações;
  // o disparo deve ser feito por cron externo (Vercel Cron, n8n, etc.) batendo
  // em /api/cron/whatsapp-dispatch. Por isso pulamos o boot do scheduler aqui.
  if (process.env.VERCEL === "1") return;
  const { startWhatsAppScheduler } = await import("@/lib/scheduler");
  startWhatsAppScheduler();
}
