import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadPublicReport, type PublicReportData } from "@/lib/report-data";
import { ReportPdfDocument } from "@/lib/pdf-template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadAuthenticatedReport(
  reportId: string,
): Promise<PublicReportData | null> {
  const supabase = createSupabaseServerClient();
  const { data: report } = await supabase
    .from("weekly_reports")
    .select("*")
    .eq("id", reportId)
    .maybeSingle();
  if (!report) return null;

  const [{ data: clientList }, { data: campaigns }, { data: tasks }] =
    await Promise.all([
      supabase.rpc("list_report_clients"),
      supabase
        .from("report_campaigns")
        .select("*")
        .eq("report_id", reportId)
        .order("position"),
      supabase
        .from("report_tasks")
        .select("*")
        .eq("report_id", reportId)
        .order("position"),
    ]);
  const client = (clientList ?? []).find((c) => c.id === report.client_id);

  return {
    report: {
      id: report.id,
      client_id: report.client_id,
      period_start: report.period_start,
      period_end: report.period_end,
      report_type: report.report_type,
      report_category: report.report_category,
      title: report.title,
      meta_ads_investment: Number(report.meta_ads_investment ?? 0),
      google_ads_investment: Number(report.google_ads_investment ?? 0),
      data_studio_url: report.data_studio_url,
      manager_analysis: report.manager_analysis,
      conclusion: report.conclusion,
      overview_metrics:
        (Array.isArray(report.overview_metrics)
          ? (report.overview_metrics as unknown as {
              label: string;
              value: string;
            }[])
          : []) ?? [],
      status: report.status,
      public_slug: report.public_slug,
      published_at: report.published_at,
      manual_mode: report.manual_mode ?? false,
      manual_content: report.manual_content ?? null,
    },
    client: client
      ? {
          id: client.id,
          name: client.name ?? "",
          company: client.company ?? "",
          meta_ads_account_id: client.meta_ads_account_id ?? null,
        }
      : {
          id: report.client_id,
          name: report.client_id,
          company: "",
          meta_ads_account_id: null,
        },
    campaigns: (campaigns ?? []).map((c) => ({
      id: c.id,
      position: c.position,
      name: c.name,
      objective: c.objective,
      platform: c.platform,
      investment: Number(c.investment ?? 0),
      volume: Number(c.volume ?? 0),
      volume_label: c.volume_label,
      cost_per_result:
        c.cost_per_result === null ? null : Number(c.cost_per_result),
      cost_per_result_label: c.cost_per_result_label,
      sub_division: c.sub_division,
      followers_gained: c.followers_gained,
      followers_current: c.followers_current,
      notes: c.notes,
    })),
    agency_tasks: (tasks ?? [])
      .filter((t) => t.owner === "agency")
      .map((t) => ({
        id: t.id,
        description: t.description,
        position: t.position,
      })),
    client_tasks: (tasks ?? [])
      .filter((t) => t.owner === "client")
      .map((t) => ({
        id: t.id,
        description: t.description,
        position: t.position,
      })),
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  const token = url.searchParams.get("t");

  let data: PublicReportData | null = null;

  if (slug && token) {
    data = await loadPublicReport(slug, token);
  }
  if (!data) {
    data = await loadAuthenticatedReport(params.id);
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await renderToBuffer(<ReportPdfDocument data={data} />);

  const safeClient = (data.client.name || "relatorio")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .toLowerCase();
  const filename = `relatorio_${safeClient}_${data.report.period_start}_${data.report.period_end}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
