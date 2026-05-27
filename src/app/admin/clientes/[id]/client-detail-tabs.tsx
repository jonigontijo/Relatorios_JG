"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Save,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  Trash2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  clientEditSchema,
  type ClientEditValues,
} from "@/lib/client-schema";
import {
  updateClientAction,
  toggleClientReportsAction,
  deleteReportFromClientAction,
} from "../actions";
import { formatDateRange } from "@/lib/utils";

type ClientShape = {
  id: string;
  name: string;
  company: string;
  meta_ads_account_id: string;
  whatsapp: string;
  reports_enabled: boolean;
  data_studio_url_default: string;
  data_studio_url_mensagem: string;
  data_studio_url_ecommerce: string;
  data_studio_url_formulario: string;
  data_studio_url_misto: string;
};

type ReportRow = {
  id: string;
  period_start: string;
  period_end: string;
  status: string;
  report_category: string | null;
  title: string | null;
  public_slug: string;
  public_token: string;
  published_at: string | null;
  updated_at: string | null;
  created_at: string | null;
};

type Tab = "info" | "reports";

export function ClientDetailTabs({
  client,
  reports,
}: {
  client: ClientShape;
  reports: ReportRow[];
}) {
  const [tab, setTab] = useState<Tab>("info");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 border-b">
        <TabButton active={tab === "info"} onClick={() => setTab("info")}>
          Informações
        </TabButton>
        <TabButton
          active={tab === "reports"}
          onClick={() => setTab("reports")}
        >
          Relatórios
          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {reports.length}
          </span>
        </TabButton>
      </div>

      {tab === "info" ? (
        <InfoForm client={client} />
      ) : (
        <ReportsTab clientId={client.id} reports={reports} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
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
      {active && (
        <span className="absolute inset-x-0 -bottom-px h-0.5 bg-jg-600" />
      )}
    </button>
  );
}

function InfoForm({ client }: { client: ClientShape }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(client.reports_enabled);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientEditValues>({
    resolver: zodResolver(clientEditSchema),
    defaultValues: {
      name: client.name,
      company: client.company,
      meta_ads_account_id: client.meta_ads_account_id,
      whatsapp: client.whatsapp,
      data_studio_url_default: client.data_studio_url_default,
      data_studio_url_mensagem: client.data_studio_url_mensagem,
      data_studio_url_ecommerce: client.data_studio_url_ecommerce,
      data_studio_url_formulario: client.data_studio_url_formulario,
      data_studio_url_misto: client.data_studio_url_misto,
    },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await updateClientAction(client.id, values);
      if (result.ok) {
        toast.success("Cliente atualizado.");
        router.refresh();
      } else {
        toast.error("Erro: " + result.error);
      }
    });
  });

  const toggleEnabled = () => {
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      const result = await toggleClientReportsAction(client.id, next);
      if (!result.ok) {
        setEnabled(!next);
        toast.error("Erro: " + result.error);
      } else {
        toast.success(
          next ? "Envio de relatório ativado." : "Envio de relatório pausado.",
        );
        router.refresh();
      }
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-lg border bg-white p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 px-4 py-3">
        <div>
          <p className="text-sm font-semibold">
            Envio de relatórios para o cliente
          </p>
          <p className="text-xs text-muted-foreground">
            Quando desativado, o link público dos relatórios deste cliente fica
            indisponível.
          </p>
        </div>
        <Button
          type="button"
          variant={enabled ? "outline" : "default"}
          size="sm"
          onClick={toggleEnabled}
          disabled={isPending}
        >
          {enabled ? (
            <>
              <Eye className="h-4 w-4 text-emerald-600" /> Envios ativos
            </>
          ) : (
            <>
              <EyeOff className="h-4 w-4" /> Envios pausados
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="company">Nome fantasia / empresa *</Label>
          <Input id="company" {...register("company")} />
          {errors.company && (
            <p className="text-xs text-destructive">
              {errors.company.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Nome de exibição *</Label>
          <Input id="name" {...register("name")} />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="meta_ads_account_id">
            ID da conta de anúncio Meta Ads
          </Label>
          <Input
            id="meta_ads_account_id"
            inputMode="numeric"
            placeholder="Ex.: 837935833657361"
            {...register("meta_ads_account_id")}
          />
          {errors.meta_ads_account_id && (
            <p className="text-xs text-destructive">
              {errors.meta_ads_account_id.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="whatsapp">WhatsApp do cliente</Label>
          <Input
            id="whatsapp"
            placeholder="Ex.: 5537998357244 ou 120363393907049523@g.us"
            {...register("whatsapp")}
          />
          <p className="text-[11px] text-muted-foreground">
            Aceita número direto (DDI + DDD + número) ou ID de grupo do
            WhatsApp terminando em <code>@g.us</code>.
          </p>
          {errors.whatsapp && (
            <p className="text-xs text-destructive">{errors.whatsapp.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">
            Link do Google Data Studio / Looker Studio
          </h3>
          <p className="text-xs text-muted-foreground">
            Esse link é usado automaticamente quando um novo relatório é criado
            para o cliente.
          </p>
        </div>

        <UrlField
          label="Link padrão"
          id="data_studio_url_default"
          register={register("data_studio_url_default")}
          error={errors.data_studio_url_default?.message}
        />

        <input type="hidden" {...register("data_studio_url_mensagem")} />
        <input type="hidden" {...register("data_studio_url_ecommerce")} />
        <input type="hidden" {...register("data_studio_url_formulario")} />
        <input type="hidden" {...register("data_studio_url_misto")} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar alterações
        </Button>
      </div>
    </form>
  );
}

function UrlField({
  label,
  id,
  register,
  error,
}: {
  label: string;
  id: string;
  register: ReturnType<
    ReturnType<typeof useForm<ClientEditValues>>["register"]
  >;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        placeholder="https://lookerstudio.google.com/reporting/..."
        {...register}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ReportsTab({
  clientId,
  reports,
}: {
  clientId: string;
  reports: ReportRow[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [list, setList] = useState(reports);

  const remove = (r: ReportRow) => {
    const label = r.title || formatDateRange(r.period_start, r.period_end);
    if (!confirm(`Excluir o relatório "${label}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    setPendingId(r.id);
    startTransition(async () => {
      const result = await deleteReportFromClientAction(r.id);
      if (!result.ok) {
        toast.error("Erro: " + result.error);
      } else {
        setList((prev) => prev.filter((x) => x.id !== r.id));
        toast.success("Relatório excluído.");
        router.refresh();
      }
      setPendingId(null);
    });
  };

  return (
    <div className="space-y-3 rounded-lg border bg-white">
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h3 className="text-sm font-semibold">Histórico de relatórios</h3>
          <p className="text-xs text-muted-foreground">
            Todos os relatórios criados para este cliente.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href={`/admin/relatorios/novo?client=${clientId}`}>
            <FileText className="h-4 w-4" /> Novo relatório
          </Link>
        </Button>
      </div>

      {list.length === 0 ? (
        <div className="px-4 py-12 text-center text-sm text-muted-foreground">
          Nenhum relatório criado para este cliente ainda.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Período</th>
              <th className="px-4 py-2 font-medium">Título / Categoria</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const isPending = pendingId === r.id;
              return (
                <tr
                  key={r.id}
                  className="border-b last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateRange(r.period_start, r.period_end)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.title || "—"}</div>
                    {r.report_category && (
                      <Badge
                        variant="outline"
                        className="mt-1 text-[10px] uppercase"
                      >
                        {r.report_category}
                      </Badge>
                    )}
                  </td>
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
                    <div className="flex items-center justify-end gap-1">
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
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/admin/relatorios/${r.id}`}>Editar</Link>
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        title="Excluir relatório"
                        className="hover:bg-red-50 hover:text-red-600"
                        onClick={() => remove(r)}
                        disabled={isPending}
                      >
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
