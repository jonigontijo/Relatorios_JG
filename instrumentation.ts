export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.DISABLE_INTERNAL_SCHEDULER === "1") return;
  const { startWhatsAppScheduler } = await import("@/lib/scheduler");
  startWhatsAppScheduler();
}
