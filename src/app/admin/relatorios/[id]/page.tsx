import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ReportForm } from "../report-form";
import type { ReportFormValues, OverviewMetric } from "@/lib/report-schema";
import { WhatsAppSection } from "./whatsapp-section";
import { DEFAULT_TEMPLATE } from "@/lib/whatsapp";
import { loadAppSettings } from "@/lib/whatsapp-server";
import { formatDateRange } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EditReportPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseServerClient();

  const [
    { data: report, error: reportError },
    { data: clients },
  ] = await Promise.all([
    supabase
      .from("weekly_reports")
      .select("*")
      .eq("id", params.id)
      .maybeSingle(),
    supabase.rpc("list_report_clients"),
  ]);

  if (reportError) throw new Error(reportError.message);
  if (!report) notFound();

  const [
    { data: campaigns },
    { data: tasks },
    { data: dispatches },
    settings,
  ] = await Promise.all([
    supabase
      .from("report_campaigns")
      .select("*")
      .eq("report_id", params.id)
      .order("position"),
    supabase
      .from("report_tasks")
      .select("*")
      .eq("report_id", params.id)
      .order("position"),
    supabase.rpc("list_report_dispatches", { p_report_id: params.id }),
    loadAppSettings(),
  ]);

  const clientRecord = (clients ?? []).find((c) => c.id === report.client_id);
  const siteUrlForLink =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? "";
  const publicUrl = `${siteUrlForLink}/r/${report.public_slug}?t=${report.public_token}`;
  const clientLabel =
    clientRecord?.company || clientRecord?.name || report.client_id;
  const clientWhatsapp = clientRecord?.whatsapp ?? "";
  const periodLabel = formatDateRange(report.period_start, report.period_end);

  const values: ReportFormValues = {
    client_id: report.client_id,
    period_start: report.period_start,
    period_end: report.period_end,
    report_type: (report.report_type as ReportFormValues["report_type"]) ?? "weekly",
    report_category:
      (report.report_category as ReportFormValues["report_category"]) ?? null,
    title: report.title ?? "",
    meta_ads_investment: Number(report.meta_ads_investment ?? 0),
    google_ads_investment: Number(report.google_ads_investment ?? 0),
    data_studio_url: report.data_studio_url ?? "",
    manager_analysis: report.manager_analysis ?? "",
    conclusion: report.conclusion ?? "",
    overview_metrics:
      (Array.isArray(report.overview_metrics)
        ? (report.overview_metrics as unknown as OverviewMetric[])
        : []) ?? [],
    status: (report.status as ReportFormValues["status"]) ?? "draft",
    manual_mode: report.manual_mode ?? false,
    manual_content: report.manual_content ?? "",
    campaigns: (campaigns ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      objective: c.objective,
      platform: c.platform,
      investment: Number(c.investment ?? 0),
      volume: Number(c.volume ?? 0),
      volume_label: c.volume_label ?? "",
      cost_per_result: c.cost_per_result === null ? null : Number(c.cost_per_result),
      cost_per_result_label: c.cost_per_result_label ?? "",
      sub_division: c.sub_division ?? "",
      followers_gained: c.followers_gained,
      followers_current: c.followers_current,
      notes: c.notes ?? "",
    })),
    agency_tasks: (tasks ?? [])
      .filter((t) => t.owner === "agency")
      .map((t) => ({ id: t.id, description: t.description })),
    client_tasks: (tasks ?? [])
      .filter((t) => t.owner === "client")
      .map((t) => ({ id: t.id, description: t.description })),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Editar relatório</h1>
        <p className="text-sm text-muted-foreground">
          Atualize os dados, publique para o cliente e gere o PDF quando estiver
          pronto.
        </p>
      </div>

      <ReportForm
        reportId={report.id}
        publicSlug={report.public_slug}
        publicToken={report.public_token}
        clients={(clients ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          company: c.company,
          meta_ads_account_id: c.meta_ads_account_id,
          data_studio_urls:
            c.data_studio_urls &&
            typeof c.data_studio_urls === "object" &&
            !Array.isArray(c.data_studio_urls)
              ? (c.data_studio_urls as Record<string, string>)
              : null,
        }))}
        defaultValues={values}
        siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ""}
      />

      <WhatsAppSection
        reportId={report.id}
        status={report.status}
        clientLabel={clientLabel}
        clientWhatsapp={clientWhatsapp}
        periodLabel={periodLabel}
        publicUrl={publicUrl}
        defaultTemplate={
          settings.whatsapp_default_template || DEFAULT_TEMPLATE
        }
        configured={Boolean(
          settings.whatsapp_api_url && settings.whatsapp_api_token,
        )}
        dispatches={(dispatches ?? []).map((d) => ({
          id: d.id,
          phone: d.phone,
          message: d.message,
          scheduled_at: d.scheduled_at,
          status: d.status,
          attempts: d.attempts,
          last_error: d.last_error,
          sent_at: d.sent_at,
          created_at: d.created_at,
        }))}
      />
    </div>
  );
}
