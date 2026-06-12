import Link from "next/link";
import { UserPlus } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ClientsTable } from "./clients-table";

export const dynamic = "force-dynamic";

export default async function ClientesListPage() {
  const supabase = createSupabaseServerClient();
  const [{ data: clients }, { data: googleRows }] = await Promise.all([
    supabase.rpc("list_report_clients"),
    supabase.rpc("get_report_clients_google"),
  ]);

  const googleById = new Map(
    (googleRows ?? []).map((g) => [g.id, g.google_ads_account_id]),
  );

  const rows = (clients ?? []).map((c) => {
    const urls =
      c.data_studio_urls &&
      typeof c.data_studio_urls === "object" &&
      !Array.isArray(c.data_studio_urls)
        ? (c.data_studio_urls as Record<string, string>)
        : {};
    return {
      id: c.id,
      name: c.name,
      company: c.company,
      meta_ads_account_id: c.meta_ads_account_id,
      google_ads_account_id: googleById.get(c.id) ?? null,
      reports_enabled: c.reports_enabled,
      dashboard_meta_url: urls.meta ?? "",
      dashboard_google_url: urls.google ?? "",
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os clientes, seus IDs e links de dashboard.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/clientes/novo">
            <UserPlus className="h-4 w-4" /> Novo cliente
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border bg-white">
        <ClientsTable initialClients={rows} />
      </div>
    </div>
  );
}
