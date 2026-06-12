import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  formatBrDate,
  pickRandomMessageTemplate,
  renderTemplate,
  sanitizePhone,
  sendWhatsAppText,
} from "@/lib/whatsapp";
import { loadAppSettings } from "@/lib/whatsapp-server";

export type AutoWeeklyOptions = {
  dryRun?: boolean;
  periodStart?: string;
  periodEnd?: string;
  siteUrl: string;
  onlyClientIds?: string[];
};

export type AutoWeeklyClientEntry = {
  clientId: string;
  clientLabel: string;
  whatsapp: string | null;
  action: "skipped_no_whatsapp" | "skipped_disabled" | "reused" | "created";
  reportId?: string;
  publicUrl?: string;
  dispatchId?: string;
  sent?: boolean;
  error?: string;
  reason?: string;
};

export type AutoWeeklyResult = {
  startedAt: string;
  finishedAt: string;
  period: { start: string; end: string };
  dryRun: boolean;
  totalClients: number;
  eligibleClients: number;
  created: number;
  reused: number;
  sent: number;
  skippedNoWhatsapp: number;
  skippedDisabled: number;
  failed: number;
  entries: AutoWeeklyClientEntry[];
  error?: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toIsoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

// Cron dispara sexta 20:45 UTC (17:45 BRT). period_end = "ontem" (quinta),
// period_start = sexta da semana passada (= period_end - 6 dias). Sao 7 dias
// inclusivos, sem incluir a sexta atual cujas metricas ainda podem variar.
export function computeWeeklyPeriod(now: Date = new Date()): {
  start: string;
  end: string;
} {
  const oneDay = 24 * 60 * 60 * 1000;
  const end = new Date(now.getTime() - oneDay);
  const start = new Date(end.getTime() - 6 * oneDay);
  return { start: toIsoDate(start), end: toIsoDate(end) };
}

export async function runWeeklyAutoDispatch(
  options: AutoWeeklyOptions,
): Promise<AutoWeeklyResult> {
  const startedAt = new Date().toISOString();
  const supabase = createSupabaseServiceClient();
  const dryRun = Boolean(options.dryRun);
  const period =
    options.periodStart && options.periodEnd
      ? { start: options.periodStart, end: options.periodEnd }
      : computeWeeklyPeriod();

  const entries: AutoWeeklyClientEntry[] = [];
  let created = 0;
  let reused = 0;
  let sent = 0;
  let skippedNoWhatsapp = 0;
  let skippedDisabled = 0;
  let failed = 0;

  const { data: clients, error: clientsErr } = await supabase.rpc(
    "list_report_clients",
  );
  if (clientsErr || !clients) {
    return {
      startedAt,
      finishedAt: new Date().toISOString(),
      period,
      dryRun,
      totalClients: 0,
      eligibleClients: 0,
      created: 0,
      reused: 0,
      sent: 0,
      skippedNoWhatsapp: 0,
      skippedDisabled: 0,
      failed: 1,
      entries: [],
      error: clientsErr?.message ?? "Falha ao listar clientes",
    };
  }

  const onlyFilter = options.onlyClientIds?.length
    ? new Set(options.onlyClientIds)
    : null;

  const settings = await loadAppSettings(supabase);
  const canSend = Boolean(
    settings.whatsapp_api_url && settings.whatsapp_api_token,
  );

  for (const c of clients) {
    if (onlyFilter && !onlyFilter.has(c.id)) continue;

    const label = c.company || c.name || c.id;

    if (!c.reports_enabled) {
      skippedDisabled += 1;
      entries.push({
        clientId: c.id,
        clientLabel: label,
        whatsapp: c.whatsapp ?? null,
        action: "skipped_disabled",
        reason: "reports_enabled = false",
      });
      continue;
    }

    const whatsapp = c.whatsapp?.trim() ?? "";
    if (!whatsapp) {
      skippedNoWhatsapp += 1;
      entries.push({
        clientId: c.id,
        clientLabel: label,
        whatsapp: null,
        action: "skipped_no_whatsapp",
        reason: "Cliente sem whatsapp configurado",
      });
      continue;
    }

    const entry: AutoWeeklyClientEntry = {
      clientId: c.id,
      clientLabel: label,
      whatsapp,
      action: "skipped_disabled",
    };

    try {
      const { data: existing, error: existingErr } = await supabase
        .from("weekly_reports")
        .select(
          "id, public_slug, public_token, period_start, period_end, status",
        )
        .eq("client_id", c.id)
        .eq("status", "published")
        .gte("period_end", period.start)
        .order("period_end", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingErr) {
        entry.error = existingErr.message;
        failed += 1;
        entries.push(entry);
        continue;
      }

      let report: {
        id: string;
        public_slug: string;
        public_token: string;
      };

      if (existing) {
        report = {
          id: existing.id,
          public_slug: existing.public_slug,
          public_token: existing.public_token,
        };
        entry.action = "reused";
        reused += 1;
      } else {
        const urls =
          c.data_studio_urls &&
          typeof c.data_studio_urls === "object" &&
          !Array.isArray(c.data_studio_urls)
            ? (c.data_studio_urls as Record<string, string>)
            : {};
        const pickUrl = (v: unknown) =>
          typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
        const dashboardUrl = pickUrl(urls.meta) ?? pickUrl(urls.default);

        if (dryRun) {
          report = {
            id: "(dry-run-new)",
            public_slug: "(dry-run-slug)",
            public_token: "(dry-run-token)",
          };
          entry.action = "created";
          created += 1;
        } else {
          const { data: inserted, error: insertErr } = await supabase
            .from("weekly_reports")
            .insert({
              client_id: c.id,
              period_start: period.start,
              period_end: period.end,
              report_type: "weekly",
              meta_ads_investment: 0,
              google_ads_investment: 0,
              data_studio_url: dashboardUrl,
              overview_metrics: [],
              status: "published",
              published_at: new Date().toISOString(),
              manual_mode: false,
            })
            .select("id, public_slug, public_token")
            .single();

          if (insertErr || !inserted) {
            entry.error =
              insertErr?.message ?? "Falha ao criar relatorio automatico";
            failed += 1;
            entries.push(entry);
            continue;
          }
          report = inserted;
          entry.action = "created";
          created += 1;
        }
      }

      entry.reportId = report.id;
      const publicUrl = `${options.siteUrl}/r/${report.public_slug}?t=${report.public_token}`;
      entry.publicUrl = publicUrl;

      const template = pickRandomMessageTemplate();
      const message = renderTemplate(template, {
        cliente: label,
        periodo: `${formatBrDate(period.start)} a ${formatBrDate(period.end)}`,
        desde: formatBrDate(period.start),
        ate: formatBrDate(period.end),
        link: publicUrl,
      });

      if (dryRun) {
        entries.push(entry);
        continue;
      }

      const { data: dispatchId, error: enqueueErr } = await supabase.rpc(
        "enqueue_report_dispatch",
        {
          p_report_id: report.id,
          p_phone: whatsapp,
          p_message: message,
          p_channel: "whatsapp",
        },
      );

      if (enqueueErr || !dispatchId) {
        entry.error = enqueueErr?.message ?? "Falha ao enfileirar disparo";
        failed += 1;
        entries.push(entry);
        continue;
      }
      entry.dispatchId = dispatchId;

      if (!canSend) {
        await supabase.rpc("mark_dispatch_failed", {
          p_id: dispatchId,
          p_error: "UazAPI nao configurada em /admin/configuracoes",
        });
        entry.error = "UazAPI nao configurada";
        failed += 1;
        entries.push(entry);
        continue;
      }

      const res = await sendWhatsAppText({
        apiUrl: settings.whatsapp_api_url!,
        apiToken: settings.whatsapp_api_token!,
        phone: sanitizePhone(whatsapp),
        message,
      });

      if (res.ok) {
        await supabase.rpc("mark_dispatch_sent", {
          p_id: dispatchId,
          p_response: (res.response ?? null) as never,
        });
        entry.sent = true;
        sent += 1;
      } else {
        await supabase.rpc("mark_dispatch_failed", {
          p_id: dispatchId,
          p_error: res.error || `HTTP ${res.status}`,
          p_response: (res.response ?? null) as never,
        });
        entry.error = res.error || `HTTP ${res.status}`;
        failed += 1;
      }
    } catch (err) {
      entry.error = err instanceof Error ? err.message : "Erro desconhecido";
      failed += 1;
    } finally {
      entries.push(entry);
    }
  }

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    period,
    dryRun,
    totalClients: clients.length,
    eligibleClients: created + reused + failed,
    created,
    reused,
    sent,
    skippedNoWhatsapp,
    skippedDisabled,
    failed,
    entries,
  };
}
