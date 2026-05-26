"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { reportSchema, type ReportFormValues } from "@/lib/report-schema";

export type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function saveReportAction(
  reportId: string | null,
  raw: unknown,
): Promise<ActionResult> {
  const parsed = reportSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ") || "Dados inválidos",
    };
  }
  const data: ReportFormValues = parsed.data;
  const supabase = createSupabaseServerClient();

  const payload = {
    client_id: data.client_id,
    period_start: data.period_start,
    period_end: data.period_end,
    report_type: data.report_type,
    report_category: data.report_category ?? null,
    title: data.title || null,
    meta_ads_investment: data.meta_ads_investment,
    google_ads_investment: data.google_ads_investment,
    data_studio_url: data.data_studio_url || null,
    manager_analysis: data.manager_analysis || null,
    conclusion: data.conclusion || null,
    overview_metrics: data.overview_metrics,
    status: data.status,
    manual_mode: data.manual_mode,
    manual_content: data.manual_content || null,
    published_at:
      data.status === "published" ? new Date().toISOString() : null,
  };

  let id = reportId;

  if (id) {
    const { error } = await supabase
      .from("weekly_reports")
      .update(payload)
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data: inserted, error } = await supabase
      .from("weekly_reports")
      .insert(payload)
      .select("id")
      .single();
    if (error || !inserted) {
      return { ok: false, error: error?.message ?? "Falha ao criar" };
    }
    id = inserted.id;
  }

  // Substituir campanhas e tarefas (estratégia: delete + insert para simplicidade)
  const { error: delCampErr } = await supabase
    .from("report_campaigns")
    .delete()
    .eq("report_id", id);
  if (delCampErr) return { ok: false, error: delCampErr.message };

  if (data.campaigns.length > 0) {
    const rows = data.campaigns.map((c, idx) => ({
      report_id: id!,
      position: idx,
      name: c.name,
      objective: c.objective,
      platform: c.platform,
      investment: c.investment,
      volume: c.volume,
      volume_label: c.volume_label || null,
      cost_per_result: c.cost_per_result,
      cost_per_result_label: c.cost_per_result_label || null,
      sub_division: c.sub_division || null,
      followers_gained: c.followers_gained,
      followers_current: c.followers_current,
      notes: c.notes || null,
    }));
    const { error: insCampErr } = await supabase
      .from("report_campaigns")
      .insert(rows);
    if (insCampErr) return { ok: false, error: insCampErr.message };
  }

  const { error: delTasksErr } = await supabase
    .from("report_tasks")
    .delete()
    .eq("report_id", id);
  if (delTasksErr) return { ok: false, error: delTasksErr.message };

  const taskRows = [
    ...data.agency_tasks.map((t, idx) => ({
      report_id: id!,
      owner: "agency",
      position: idx,
      description: t.description,
    })),
    ...data.client_tasks.map((t, idx) => ({
      report_id: id!,
      owner: "client",
      position: idx,
      description: t.description,
    })),
  ];
  if (taskRows.length > 0) {
    const { error: insTaskErr } = await supabase
      .from("report_tasks")
      .insert(taskRows);
    if (insTaskErr) return { ok: false, error: insTaskErr.message };
  }

  revalidatePath("/admin/relatorios");
  revalidatePath(`/admin/relatorios/${id}`);
  return { ok: true, id };
}

export async function deleteReportAction(
  reportId: string,
  options: { redirectAfter?: boolean } = { redirectAfter: false },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("delete_report", { p_id: reportId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/relatorios");
  revalidatePath("/admin/clientes");
  if (options.redirectAfter) {
    redirect("/admin/relatorios");
  }
  return { ok: true };
}

export async function publishReportAction(reportId: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("weekly_reports")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", reportId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/relatorios");
  revalidatePath(`/admin/relatorios/${reportId}`);
}

export async function unpublishReportAction(reportId: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("weekly_reports")
    .update({ status: "draft" })
    .eq("id", reportId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/relatorios");
  revalidatePath(`/admin/relatorios/${reportId}`);
}
