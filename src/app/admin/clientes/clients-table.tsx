"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Search,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  toggleClientReportsAction,
  deleteClientAction,
} from "./actions";

type ClientRow = {
  id: string;
  name: string | null;
  company: string | null;
  meta_ads_account_id: string | null;
  google_ads_account_id: string | null;
  reports_enabled: boolean | null;
  dashboard_meta_url: string;
  dashboard_google_url: string;
};

type Props = {
  initialClients: ClientRow[];
};

type Platform = "todos" | "meta" | "google";

// Meta = tem ID Meta Ads OU não tem nenhum ID (cliente sem ID entra em Meta
// por padrão). Fica de fora da aba Meta apenas quem é exclusivamente Google.
const isMetaClient = (c: ClientRow) =>
  !!c.meta_ads_account_id || !c.google_ads_account_id;

export function ClientsTable({ initialClients }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<ClientRow[]>(initialClients);
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<Platform>("todos");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const metaCount = useMemo(() => rows.filter(isMetaClient).length, [rows]);
  const googleCount = useMemo(
    () => rows.filter((c) => !!c.google_ads_account_id).length,
    [rows],
  );

  const filtered = useMemo(() => {
    const byPlatform = rows.filter((c) =>
      platform === "meta"
        ? isMetaClient(c)
        : platform === "google"
          ? !!c.google_ads_account_id
          : true,
    );
    const q = query.trim().toLowerCase();
    if (!q) return byPlatform;
    return byPlatform.filter((c) => {
      const hay = [
        c.company,
        c.name,
        c.meta_ads_account_id,
        c.google_ads_account_id,
        c.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, platform]);

  const toggleEnabled = (c: ClientRow) => {
    const next = !(c.reports_enabled ?? true);
    setPendingId(c.id);
    setRows((prev) =>
      prev.map((r) => (r.id === c.id ? { ...r, reports_enabled: next } : r)),
    );
    startTransition(async () => {
      const result = await toggleClientReportsAction(c.id, next);
      if (!result.ok) {
        setRows((prev) =>
          prev.map((r) =>
            r.id === c.id ? { ...r, reports_enabled: !next } : r,
          ),
        );
        toast.error("Erro: " + result.error);
      } else {
        toast.success(
          next ? "Envio de relatório ativado." : "Envio de relatório desativado.",
        );
        router.refresh();
      }
      setPendingId(null);
    });
  };

  const remove = (c: ClientRow) => {
    const label = c.company || c.name || c.id;
    if (!confirm(`Remover o cliente "${label}" do módulo de relatórios?`)) {
      return;
    }
    setPendingId(c.id);
    startTransition(async () => {
      const result = await deleteClientAction(c.id);
      if (!result.ok) {
        toast.error("Erro: " + result.error);
      } else {
        setRows((prev) => prev.filter((r) => r.id !== c.id));
        toast.success("Cliente removido.");
        router.refresh();
      }
      setPendingId(null);
    });
  };

  const isMeta = platform === "meta";
  const isGoogle = platform === "google";
  const isAll = platform === "todos";
  const tabTotal = isMeta ? metaCount : isGoogle ? googleCount : rows.length;
  const dashLabel = isMeta ? "Dashboard Meta" : "Dashboard Google";

  return (
    <div>
      <div className="flex items-center gap-1 border-b px-3 pt-2">
        <PlatformTab
          active={isAll}
          onClick={() => setPlatform("todos")}
          count={rows.length}
        >
          Todos
        </PlatformTab>
        <PlatformTab
          active={isMeta}
          onClick={() => setPlatform("meta")}
          count={metaCount}
        >
          Meta
        </PlatformTab>
        <PlatformTab
          active={isGoogle}
          onClick={() => setPlatform("google")}
          count={googleCount}
        >
          Google
        </PlatformTab>
      </div>

      <div className="flex items-center gap-2 border-b p-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, empresa ou ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {filtered.length} de {tabTotal}
        </div>
      </div>

      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Cliente</th>
            {isAll ? (
              <>
                <th className="px-4 py-3 font-medium">ID Meta Ads</th>
                <th className="px-4 py-3 font-medium">ID Google Ads</th>
              </>
            ) : (
              <>
                <th className="px-4 py-3 font-medium">{dashLabel}</th>
                <th className="px-4 py-3 font-medium">
                  {isMeta ? "ID Meta Ads" : "ID Google Ads"}
                </th>
              </>
            )}
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 text-right font-medium">Ações</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((c) => {
            const enabled = c.reports_enabled ?? true;
            const isPending = pendingId === c.id;
            const dashUrl = isMeta
              ? c.dashboard_meta_url
              : c.dashboard_google_url;
            const accountId = isMeta
              ? c.meta_ads_account_id
              : c.google_ads_account_id;
            return (
              <tr
                key={c.id}
                className="border-b last:border-0 hover:bg-muted/30"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/clientes/${c.id}`}
                    className="font-medium hover:text-jg-700"
                  >
                    {c.company || c.name || c.id}
                  </Link>
                  {c.company && c.name && c.name !== c.company && (
                    <div className="text-xs text-muted-foreground">
                      {c.name}
                    </div>
                  )}
                </td>

                {isAll ? (
                  <>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {c.meta_ads_account_id ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {c.google_ads_account_id ?? "—"}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3">
                      {dashUrl ? (
                        <a
                          href={dashUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-jg-700 hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Abrir
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Sem relatório
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {accountId ?? "—"}
                    </td>
                  </>
                )}

                <td className="px-4 py-3">
                  <span
                    className={
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
                      (enabled
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-muted text-muted-foreground")
                    }
                  >
                    {enabled ? "Envios ativos" : "Envios pausados"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title={
                        enabled
                          ? "Pausar envios deste cliente"
                          : "Ativar envios deste cliente"
                      }
                      onClick={() => toggleEnabled(c)}
                      disabled={isPending}
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : enabled ? (
                        <Eye className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button asChild variant="ghost" size="icon" title="Editar">
                      <Link href={`/admin/clientes/${c.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="Remover do módulo de relatórios"
                      onClick={() => remove(c)}
                      disabled={isPending}
                      className="hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
          {filtered.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="px-4 py-12 text-center text-sm text-muted-foreground"
              >
                Nenhum cliente encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PlatformTab({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "relative px-4 py-2 text-sm font-medium transition-colors " +
        (active
          ? "text-jg-700"
          : "text-muted-foreground hover:text-foreground")
      }
    >
      {children}
      <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        {count}
      </span>
      {active && (
        <span className="absolute inset-x-0 -bottom-px h-0.5 bg-jg-600" />
      )}
    </button>
  );
}
