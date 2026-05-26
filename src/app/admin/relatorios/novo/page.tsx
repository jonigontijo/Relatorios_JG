import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ReportForm } from "../report-form";
import type { ReportFormValues } from "@/lib/report-schema";

export const dynamic = "force-dynamic";

function defaultValues(clientId: string = ""): ReportFormValues {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 6);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    client_id: clientId,
    period_start: iso(weekAgo),
    period_end: iso(today),
    report_type: "weekly",
    report_category: null,
    title: "",
    meta_ads_investment: 0,
    google_ads_investment: 0,
    data_studio_url: "",
    manager_analysis: "",
    conclusion: "",
    overview_metrics: [],
    status: "draft",
    manual_mode: false,
    manual_content: "",
    campaigns: [],
    agency_tasks: [],
    client_tasks: [],
  };
}

export default async function NewReportPage({
  searchParams,
}: {
  searchParams: { client?: string };
}) {
  const supabase = createSupabaseServerClient();
  const { data: clients } = await supabase.rpc("list_report_clients");

  const clientOptions = (clients ?? []).map((c) => ({
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
  }));

  const preselectedClient =
    searchParams.client &&
    clientOptions.some((c) => c.id === searchParams.client)
      ? searchParams.client
      : "";

  const initial = defaultValues(preselectedClient);
  if (preselectedClient) {
    const c = clientOptions.find((c) => c.id === preselectedClient);
    if (c?.data_studio_urls?.default) {
      initial.data_studio_url = c.data_studio_urls.default;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Novo relatório</h1>
        <p className="text-sm text-muted-foreground">
          Preencha os dados e publique para gerar o link do cliente.
        </p>
      </div>

      <ReportForm
        reportId={null}
        clients={clientOptions}
        defaultValues={initial}
        siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ""}
      />
    </div>
  );
}
