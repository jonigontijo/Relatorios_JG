import Link from "next/link";
import { Plus, FileText, ExternalLink, UserPlus } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateRange, formatBRL } from "@/lib/utils";
import { REPORT_CATEGORIES } from "@/lib/report-schema";
import { DeleteReportButton } from "./delete-report-button";

export const dynamic = "force-dynamic";

function categoryLabel(value: string | null | undefined) {
  if (!value) return null;
  return REPORT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export default async function RelatoriosListPage() {
  const supabase = createSupabaseServerClient();
  const [{ data: reports, error }, { data: clientList }] = await Promise.all([
    supabase
      .from("weekly_reports")
      .select(
        "id, client_id, period_start, period_end, status, report_category, title, meta_ads_investment, google_ads_investment, public_slug, public_token, published_at, updated_at",
      )
      .order("period_start", { ascending: false }),
    supabase.rpc("list_report_clients"),
  ]);

  const clientMap = new Map(
    (clientList ?? []).map((c) => [
      c.id,
      {
        name: c.name,
        company: c.company,
        meta_ads_account_id: c.meta_ads_account_id,
      },
    ]),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os relatórios semanais e mensais enviados aos clientes.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/clientes/novo">
              <UserPlus className="h-4 w-4" /> Novo cliente
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/relatorios/novo">
              <Plus className="h-4 w-4" /> Novo relatório
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Erro ao carregar relatórios: {error.message}
        </div>
      )}

      <div className="rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Período</th>
              <th className="px-4 py-3 font-medium">Investimento</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(reports ?? []).map((r) => {
              const client = clientMap.get(r.client_id);
              const total =
                Number(r.meta_ads_investment) + Number(r.google_ads_investment);
              const catLabel = categoryLabel(r.report_category);
              return (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {client?.company || client?.name || r.client_id}
                      </span>
                      {catLabel && (
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {catLabel}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {client?.meta_ads_account_id
                        ? `Meta Ads: ${client.meta_ads_account_id}`
                        : client?.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateRange(r.period_start, r.period_end)}
                  </td>
                  <td className="px-4 py-3 font-medium">{formatBRL(total)}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        r.status === "published"
                          ? "success"
                          : r.status === "archived"
                            ? "secondary"
                            : "warn"
                      }
                    >
                      {r.status === "published"
                        ? "Publicado"
                        : r.status === "archived"
                          ? "Arquivado"
                          : "Rascunho"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {r.status === "published" && (
                        <Button asChild size="sm" variant="outline">
                          <Link
                            href={`/r/${r.public_slug}?t=${r.public_token}`}
                            target="_blank"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Ver
                          </Link>
                        </Button>
                      )}
                      <Button asChild size="sm">
                        <Link href={`/admin/relatorios/${r.id}`}>
                          <FileText className="h-3.5 w-3.5" /> Editar
                        </Link>
                      </Button>
                      <DeleteReportButton
                        reportId={r.id}
                        label={`o relatório de ${client?.company || client?.name || r.client_id} (${formatDateRange(r.period_start, r.period_end)})`}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}

            {(!reports || reports.length === 0) && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  Nenhum relatório criado ainda. Clique em &quot;Novo relatório&quot; para começar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
