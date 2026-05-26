import Link from "next/link";
import { UserPlus } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ClientsTable } from "./clients-table";

export const dynamic = "force-dynamic";

export default async function ClientesListPage() {
  const supabase = createSupabaseServerClient();
  const { data: clients } = await supabase.rpc("list_report_clients");

  const rows = (clients ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    company: c.company,
    meta_ads_account_id: c.meta_ads_account_id,
    reports_enabled: c.reports_enabled,
  }));

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
