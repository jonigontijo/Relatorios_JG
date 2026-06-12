import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ClientDetailTabs } from "./client-detail-tabs";

export const dynamic = "force-dynamic";

export default async function ClienteDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseServerClient();

  const [
    { data: allClients, error: cErr },
    { data: googleRows },
    { data: reports, error: rErr },
  ] = await Promise.all([
    supabase.rpc("list_report_clients"),
    supabase.rpc("get_report_clients_google"),
    supabase
      .from("weekly_reports")
      .select(
        "id, period_start, period_end, status, report_category, title, public_slug, public_token, published_at, updated_at, created_at",
      )
      .eq("client_id", params.id)
      .order("period_start", { ascending: false }),
  ]);

  if (cErr) throw new Error(cErr.message);
  const client = (allClients ?? []).find((c) => c.id === params.id);
  if (!client) notFound();

  const googleAdsId =
    (googleRows ?? []).find((g) => g.id === params.id)?.google_ads_account_id ??
    "";

  const urls =
    client.data_studio_urls &&
    typeof client.data_studio_urls === "object" &&
    !Array.isArray(client.data_studio_urls)
      ? (client.data_studio_urls as Record<string, string>)
      : {};

  const initialClient = {
    id: client.id,
    name: client.name ?? "",
    company: client.company ?? "",
    meta_ads_account_id: client.meta_ads_account_id ?? "",
    google_ads_account_id: googleAdsId,
    whatsapp: client.whatsapp ?? "",
    reports_enabled: client.reports_enabled ?? true,
    data_studio_url_default: urls.default ?? "",
    data_studio_url_meta: urls.meta ?? "",
    data_studio_url_google: urls.google ?? "",
    data_studio_url_mensagem: urls.mensagem ?? "",
    data_studio_url_ecommerce: urls.ecommerce ?? "",
    data_studio_url_formulario: urls.formulario ?? "",
    data_studio_url_misto: urls.misto ?? "",
  };

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/admin/clientes">
          <ArrowLeft className="h-4 w-4" /> Voltar para clientes
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {client.company || client.name || client.id}
        </h1>
        <p className="text-sm text-muted-foreground">
          {client.meta_ads_account_id
            ? `Conta Meta Ads: ${client.meta_ads_account_id}`
            : "Sem ID Meta Ads cadastrado"}
        </p>
      </div>

      {rErr && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Erro ao carregar histórico: {rErr.message}
        </div>
      )}

      <ClientDetailTabs
        client={initialClient}
        reports={(reports ?? []).map((r) => ({
          id: r.id,
          period_start: r.period_start,
          period_end: r.period_end,
          status: r.status,
          report_category: r.report_category,
          title: r.title,
          public_slug: r.public_slug,
          public_token: r.public_token,
          published_at: r.published_at,
          updated_at: r.updated_at,
          created_at: r.created_at,
        }))}
      />
    </div>
  );
}
