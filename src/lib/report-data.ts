import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PublicReportData = {
  report: {
    id: string;
    client_id: string;
    period_start: string;
    period_end: string;
    report_type: string;
    report_category: string | null;
    title: string | null;
    meta_ads_investment: number;
    google_ads_investment: number;
    data_studio_url: string | null;
    manager_analysis: string | null;
    conclusion: string | null;
    overview_metrics: { label: string; value: string }[];
    status: string;
    public_slug: string;
    published_at: string | null;
    manual_mode: boolean;
    manual_content: string | null;
  };
  client: {
    id: string;
    name: string;
    company: string;
    meta_ads_account_id: string | null;
  };
  campaigns: Array<{
    id: string;
    position: number;
    name: string;
    objective: string;
    platform: string;
    investment: number;
    volume: number;
    volume_label: string | null;
    cost_per_result: number | null;
    cost_per_result_label: string | null;
    sub_division: string | null;
    followers_gained: number | null;
    followers_current: number | null;
    notes: string | null;
  }>;
  agency_tasks: Array<{ id: string; description: string; position: number }>;
  client_tasks: Array<{ id: string; description: string; position: number }>;
};

export async function loadPublicReport(
  slug: string,
  token: string,
): Promise<PublicReportData | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_public_report", {
    p_slug: slug,
    p_token: token,
  });
  if (error || !data) return null;
  return data as unknown as PublicReportData;
}

/** Converte URL pública do Looker / Data Studio para o formato de embed. */
export function toEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    // Looker Studio: /reporting/<id> -> /embed/reporting/<id>
    if (
      u.hostname.includes("datastudio.google.com") ||
      u.hostname.includes("lookerstudio.google.com")
    ) {
      if (!u.pathname.startsWith("/embed/")) {
        u.pathname = "/embed" + u.pathname;
      }
      return u.toString();
    }
    return u.toString();
  } catch {
    return null;
  }
}
