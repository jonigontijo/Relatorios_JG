"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Save,
  Send,
  Eye,
  Copy,
  Loader2,
  ArrowLeft,
  Megaphone,
  ListChecks,
  LineChart,
  PenLine,
  LayoutDashboard,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  CAMPAIGN_OBJECTIVES,
  PLATFORMS,
  REPORT_CATEGORIES,
  reportSchema,
  type ReportFormValues,
} from "@/lib/report-schema";
import { saveReportAction } from "./actions";
import { DeleteReportButton } from "./delete-report-button";

type ClientOption = {
  id: string;
  name: string | null;
  company: string | null;
  meta_ads_account_id?: string | null;
  data_studio_urls?: Record<string, string> | null;
};

function pickDashboardUrl(
  urls: Record<string, string> | null | undefined,
  category: string | null | undefined,
): string {
  if (!urls) return "";
  if (category && urls[category]) return urls[category];
  return urls.default ?? "";
}

type Props = {
  reportId: string | null;
  publicSlug?: string | null;
  publicToken?: string | null;
  clients: ClientOption[];
  defaultValues: ReportFormValues;
  siteUrl: string;
};

export function ReportForm({
  reportId,
  publicSlug,
  publicToken,
  clients,
  defaultValues,
  siteUrl,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [savingStatus, setSavingStatus] = useState<
    "draft" | "published" | null
  >(null);

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues,
    mode: "onBlur",
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = form;

  const campaigns = useFieldArray({ control, name: "campaigns" });
  const agencyTasks = useFieldArray({ control, name: "agency_tasks" });
  const clientTasks = useFieldArray({ control, name: "client_tasks" });
  const overview = useFieldArray({ control, name: "overview_metrics" });

  const onSubmit = (status: "draft" | "published") =>
    handleSubmit(async (values) => {
      setSavingStatus(status);
      startTransition(async () => {
        const result = await saveReportAction(reportId, {
          ...values,
          status,
        });
        if (result.ok) {
          toast.success(
            status === "published"
              ? "Relatório publicado!"
              : "Rascunho salvo.",
          );
          if (!reportId) {
            router.push(`/admin/relatorios/${result.id}`);
          } else {
            router.refresh();
          }
        } else {
          toast.error("Erro ao salvar: " + result.error);
        }
        setSavingStatus(null);
      });
    })();

  const publicUrl =
    publicSlug && publicToken
      ? `${siteUrl}/r/${publicSlug}?t=${publicToken}`
      : null;

  const copyLink = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      toast.success("Link copiado!");
    }
  };

  const metaInvest = Number(watch("meta_ads_investment") || 0);
  const googleInvest = Number(watch("google_ads_investment") || 0);
  const total = metaInvest + googleInvest;

  const manualMode = watch("manual_mode") ?? false;

  return (
    <form className="space-y-6">
      {/* Top bar com ações */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/relatorios">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {publicUrl && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyLink}
              >
                <Copy className="h-4 w-4" /> Copiar link
              </Button>
              <Button asChild type="button" variant="outline" size="sm">
                <a href={publicUrl} target="_blank" rel="noreferrer">
                  <Eye className="h-4 w-4" /> Visualizar
                </a>
              </Button>
              {reportId && (
                <Button asChild type="button" variant="outline" size="sm">
                  <a href={`/api/pdf/${reportId}`} target="_blank" rel="noreferrer">
                    Baixar PDF
                  </a>
                </Button>
              )}
            </>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => onSubmit("draft")}
          >
            {isPending && savingStatus === "draft" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar rascunho
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={() => onSubmit("published")}
          >
            {isPending && savingStatus === "published" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Publicar
          </Button>
          <Button
            type="button"
            size="sm"
            variant={manualMode ? "default" : "outline"}
            className={
              manualMode
                ? "border-amber-600 bg-amber-500 text-white hover:bg-amber-600"
                : "border-amber-500 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
            }
            onClick={() =>
              setValue("manual_mode", !manualMode, { shouldDirty: true })
            }
            title={
              manualMode
                ? "Voltar para o formulário estruturado"
                : "Escrever o relatório inteiro em um único bloco de texto"
            }
          >
            {manualMode ? (
              <>
                <LayoutDashboard className="h-4 w-4" /> Voltar ao estruturado
              </>
            ) : (
              <>
                <PenLine className="h-4 w-4" /> Preencher manualmente
              </>
            )}
          </Button>
          {reportId && (
            <DeleteReportButton
              reportId={reportId}
              variant="button"
              redirectAfter
            />
          )}
        </div>
      </div>

      {/* CABEÇALHO */}
      <Card>
        <CardHeader>
          <CardTitle>Cabeçalho do relatório</CardTitle>
          <CardDescription>
            Dados básicos do cliente, período e link do dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="client_id">Cliente *</Label>
              <Link
                href="/admin/clientes/novo"
                className="text-xs font-medium text-jg-600 hover:text-jg-700"
              >
                + Cadastrar novo cliente
              </Link>
            </div>
            <Controller
              control={control}
              name="client_id"
              render={({ field }) => {
                const selected = clients.find((c) => c.id === field.value);
                return (
                  <div className="space-y-1">
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        const newClient = clients.find((c) => c.id === value);
                        const url = pickDashboardUrl(
                          newClient?.data_studio_urls,
                          watch("report_category"),
                        );
                        if (url) {
                          setValue("data_studio_url", url, {
                            shouldDirty: true,
                          });
                        }
                      }}
                    >
                      <SelectTrigger id="client_id">
                        <SelectValue placeholder="Selecione o cliente" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[60vh]">
                        {clients.length === 0 && (
                          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                            Nenhum cliente cadastrado ainda.
                          </div>
                        )}
                        {clients.map((c) => {
                          const label = c.company || c.name || c.id;
                          return (
                            <SelectItem key={c.id} value={c.id}>
                              {label}
                              {c.meta_ads_account_id
                                ? `  ·  ${c.meta_ads_account_id}`
                                : ""}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {selected && (
                      <p className="text-xs text-muted-foreground">
                        ID Meta Ads:{" "}
                        <span className="font-mono">
                          {selected.meta_ads_account_id ?? "—"}
                        </span>
                      </p>
                    )}
                  </div>
                );
              }}
            />
            {errors.client_id && (
              <p className="text-xs text-destructive">{errors.client_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="period_start">Período — início *</Label>
            <Input id="period_start" type="date" {...register("period_start")} />
            {errors.period_start && (
              <p className="text-xs text-destructive">{errors.period_start.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="period_end">Período — fim *</Label>
            <Input id="period_end" type="date" {...register("period_end")} />
            {errors.period_end && (
              <p className="text-xs text-destructive">{errors.period_end.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="report_type">Periodicidade</Label>
            <Controller
              control={control}
              name="report_type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="report_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="report_category">Categoria</Label>
            <Controller
              control={control}
              name="report_category"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => {
                    const next = v || null;
                    field.onChange(next);
                    const selectedClient = clients.find(
                      (c) => c.id === watch("client_id"),
                    );
                    const url = pickDashboardUrl(
                      selectedClient?.data_studio_urls,
                      next,
                    );
                    if (url) {
                      setValue("data_studio_url", url, { shouldDirty: true });
                    }
                  }}
                >
                  <SelectTrigger id="report_category">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Título personalizado (opcional)</Label>
            <Input
              id="title"
              placeholder="Ex.: Relatório Semanal · Tricostura"
              {...register("title")}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="data_studio_url">
                Link do Google Data Studio / Looker Studio
              </Label>
              {(() => {
                const selected = clients.find(
                  (c) => c.id === watch("client_id"),
                );
                const defaultUrl = pickDashboardUrl(
                  selected?.data_studio_urls,
                  watch("report_category"),
                );
                if (!defaultUrl) return null;
                return (
                  <button
                    type="button"
                    className="text-xs font-medium text-jg-600 hover:text-jg-700"
                    onClick={() =>
                      setValue("data_studio_url", defaultUrl, {
                        shouldDirty: true,
                      })
                    }
                  >
                    Usar link padrão do cliente
                  </button>
                );
              })()}
            </div>
            <Input
              id="data_studio_url"
              placeholder="https://datastudio.google.com/reporting/..."
              {...register("data_studio_url")}
            />
            <p className="text-xs text-muted-foreground">
              Preenchido automaticamente a partir do cadastro do cliente. Pode ser editado para este relatório.
            </p>
            {errors.data_studio_url && (
              <p className="text-xs text-destructive">
                {errors.data_studio_url.message as string}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* MODO MANUAL */}
      {manualMode && (
        <Card className="border-amber-300 bg-amber-50/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <PenLine className="h-5 w-5" /> Conteúdo do relatório (modo manual)
            </CardTitle>
            <CardDescription>
              Escreva tudo em um único bloco. O dashboard interativo continua
              aparecendo abaixo do texto no relatório enviado. As seções
              estruturadas (investimento, campanhas, tarefas) ficam ocultas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={18}
              placeholder={`Ex.:\n\nResultados da semana — Tricostura (15 a 21 de maio)\n\nAumentamos o investimento global de R$ 710,95 para R$ 858,98 para impulsionar as novas campanhas...\n\nCampanha Comercial: R$ 476,33 investidos | 80 mensagens iniciadas | Custo por mensagem R$ 5,95\n\nPróximos passos:\n- Monitorar Caruaru, SP e Fortaleza\n- Cobrar feedback do RH e Comercial`}
              {...register("manual_content")}
            />
          </CardContent>
        </Card>
      )}

      {!manualMode && (
        <>
      {/* INVESTIMENTO */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5 text-jg-600" /> Visão geral de investimento
          </CardTitle>
          <CardDescription>
            Valores totais investidos no período.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="meta_ads_investment">Meta Ads (R$)</Label>
              <Input
                id="meta_ads_investment"
                type="number"
                step="0.01"
                min="0"
                {...register("meta_ads_investment")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="google_ads_investment">Google Ads (R$)</Label>
              <Input
                id="google_ads_investment"
                type="number"
                step="0.01"
                min="0"
                {...register("google_ads_investment")}
              />
            </div>
            <div className="space-y-2">
              <Label>Total no período</Label>
              <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 font-semibold">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(total)}
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Métricas em destaque</h3>
                <p className="text-xs text-muted-foreground">
                  Cards exibidos no topo do relatório (ex.: &quot;Mensagens Totais: 130&quot;).
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => overview.append({ label: "", value: "" })}
              >
                <Plus className="h-4 w-4" /> Adicionar métrica
              </Button>
            </div>
            <div className="space-y-2">
              {overview.fields.map((field, idx) => (
                <div key={field.id} className="flex gap-2">
                  <Input
                    placeholder="Nome da métrica (ex.: Mensagens Totais)"
                    {...register(`overview_metrics.${idx}.label`)}
                  />
                  <Input
                    placeholder="Valor (ex.: 130)"
                    className="max-w-[200px]"
                    {...register(`overview_metrics.${idx}.value`)}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => overview.remove(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {overview.fields.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhuma métrica adicionada.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CAMPANHAS */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-jg-600" /> Campanhas
            </CardTitle>
            <CardDescription>
              Adicione um bloco para cada campanha veiculada.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() =>
              campaigns.append({
                name: "",
                objective: "mensagens",
                platform: "meta",
                investment: 0,
                volume: 0,
                volume_label: "",
                cost_per_result: null,
                cost_per_result_label: "",
                sub_division: "",
                followers_gained: null,
                followers_current: null,
                notes: "",
              })
            }
          >
            <Plus className="h-4 w-4" /> Adicionar campanha
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {campaigns.fields.map((field, idx) => {
            const objective = watch(`campaigns.${idx}.objective`);
            const showFollowers =
              objective === "visitas_perfil" || objective === "seguidores";
            return (
              <div
                key={field.id}
                className="space-y-4 rounded-lg border bg-muted/20 p-4"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Campanha {idx + 1}</Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => campaigns.remove(idx)}
                  >
                    <Trash2 className="h-4 w-4" /> Remover
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Nome da campanha *</Label>
                    <Input
                      placeholder="Ex.: Campanha Comercial"
                      {...register(`campaigns.${idx}.name`)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Objetivo</Label>
                    <Controller
                      control={control}
                      name={`campaigns.${idx}.objective`}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CAMPAIGN_OBJECTIVES.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Plataforma</Label>
                    <Controller
                      control={control}
                      name={`campaigns.${idx}.platform`}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PLATFORMS.map((p) => (
                              <SelectItem key={p.value} value={p.value}>
                                {p.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Investimento (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register(`campaigns.${idx}.investment`)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Volume gerado</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Ex.: 80"
                        {...register(`campaigns.${idx}.volume`)}
                      />
                      <Input
                        placeholder="Rótulo (ex.: mensagens)"
                        {...register(`campaigns.${idx}.volume_label`)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Custo por resultado (R$)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ex.: 5.95"
                        {...register(`campaigns.${idx}.cost_per_result`)}
                      />
                      <Input
                        placeholder="Rótulo (ex.: por mensagem)"
                        {...register(`campaigns.${idx}.cost_per_result_label`)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Sub-divisão / observação curta (opcional)</Label>
                    <Input
                      placeholder='Ex.: "Programador de Máquinas puxou 47 dos 50 contatos"'
                      {...register(`campaigns.${idx}.sub_division`)}
                    />
                  </div>

                  {showFollowers && (
                    <>
                      <div className="space-y-2">
                        <Label>Seguidores ganhos</Label>
                        <Input
                          type="number"
                          {...register(`campaigns.${idx}.followers_gained`)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Seguidores atuais</Label>
                        <Input
                          type="number"
                          {...register(`campaigns.${idx}.followers_current`)}
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2 md:col-span-2">
                    <Label>Notas internas (opcional)</Label>
                    <Textarea
                      rows={2}
                      placeholder="Observações sobre esta campanha"
                      {...register(`campaigns.${idx}.notes`)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {campaigns.fields.length === 0 && (
            <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
              Nenhuma campanha. Clique em &quot;Adicionar campanha&quot;.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ANÁLISE */}
      <Card>
        <CardHeader>
          <CardTitle>Bloco de análise do gestor</CardTitle>
          <CardDescription>
            Texto livre com a leitura do período. Pode usar quebras de linha para separar tópicos (ex.: &quot;A Virada Comercial&quot;).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            rows={10}
            placeholder={`Ex.:\nInjeção de Fôlego: Aumentamos o investimento global (R$ 710,95 → R$ 858,98)...\n\nA Virada Comercial: A troca dos criativos foi um sucesso instantâneo...`}
            {...register("manager_analysis")}
          />
          <div className="space-y-2">
            <Label>Conclusão</Label>
            <Textarea
              rows={4}
              placeholder="Fechamento do relatório, próximos passos amplos, contexto geral."
              {...register("conclusion")}
            />
          </div>
        </CardContent>
      </Card>

      {/* TAREFAS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-jg-600" /> Próximos passos
          </CardTitle>
          <CardDescription>
            Tarefas que ficam claras para os dois lados.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <TaskList
            title="Tarefas da agência"
            fields={agencyTasks.fields}
            onAdd={() => agencyTasks.append({ description: "" })}
            onRemove={(i) => agencyTasks.remove(i)}
            register={register}
            namePrefix="agency_tasks"
          />
          <TaskList
            title="Tarefas do cliente"
            fields={clientTasks.fields}
            onAdd={() => clientTasks.append({ description: "" })}
            onRemove={(i) => clientTasks.remove(i)}
            register={register}
            namePrefix="client_tasks"
          />
        </CardContent>
      </Card>
        </>
      )}
    </form>
  );
}

type TaskListProps = {
  title: string;
  fields: { id: string }[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  register: ReturnType<typeof useForm<ReportFormValues>>["register"];
  namePrefix: "agency_tasks" | "client_tasks";
};

function TaskList({ title, fields, onAdd, onRemove, register, namePrefix }: TaskListProps) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Button type="button" size="sm" variant="outline" onClick={onAdd}>
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>
      <div className="space-y-2">
        {fields.map((field, idx) => (
          <div key={field.id} className="flex gap-2">
            <Textarea
              rows={2}
              placeholder="Descreva a tarefa"
              {...register(`${namePrefix}.${idx}.description` as const)}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => onRemove(idx)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {fields.length === 0 && (
          <p className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
            Nenhuma tarefa.
          </p>
        )}
      </div>
    </div>
  );
}
