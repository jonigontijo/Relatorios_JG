import { z } from "zod";

export const CAMPAIGN_OBJECTIVES = [
  { value: "mensagens", label: "Mensagens" },
  { value: "cliques", label: "Cliques no Link" },
  { value: "visitas_perfil", label: "Visitas ao Perfil" },
  { value: "leads", label: "Leads" },
  { value: "conversoes", label: "Conversões" },
  { value: "alcance", label: "Alcance" },
  { value: "engajamento", label: "Engajamento" },
  { value: "seguidores", label: "Seguidores" },
  { value: "trafego", label: "Tráfego" },
  { value: "outros", label: "Outros" },
] as const;

export const PLATFORMS = [
  { value: "meta", label: "Meta Ads" },
  { value: "google", label: "Google Ads" },
  { value: "tiktok", label: "TikTok Ads" },
  { value: "linkedin", label: "LinkedIn Ads" },
  { value: "outros", label: "Outros" },
] as const;

export const REPORT_CATEGORIES = [
  { value: "mensagem", label: "Mensagem (X1)" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "formulario", label: "Formulário" },
  { value: "misto", label: "Misto (mais de um)" },
] as const;

const numericFromString = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === "number" ? v : v === "" ? 0 : Number(v)))
  .pipe(z.number().min(0));

const optionalNumericFromString = z
  .union([z.number(), z.string(), z.null()])
  .transform((v) => {
    if (v === null || v === "" || v === undefined) return null;
    return typeof v === "number" ? v : Number(v);
  })
  .nullable();

export const overviewMetricSchema = z.object({
  label: z.string().min(1, "Informe o nome da métrica"),
  value: z.string().min(1, "Informe o valor"),
});

export const campaignSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Informe o nome da campanha"),
  objective: z.enum(
    CAMPAIGN_OBJECTIVES.map((o) => o.value) as [string, ...string[]],
  ),
  platform: z.enum(
    PLATFORMS.map((p) => p.value) as [string, ...string[]],
  ),
  investment: numericFromString,
  volume: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === "number" ? v : v === "" ? 0 : Number(v)))
    .pipe(z.number().int().min(0)),
  volume_label: z.string().optional().nullable(),
  cost_per_result: optionalNumericFromString,
  cost_per_result_label: z.string().optional().nullable(),
  sub_division: z.string().optional().nullable(),
  followers_gained: optionalNumericFromString,
  followers_current: optionalNumericFromString,
  notes: z.string().optional().nullable(),
});

export const taskSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Descreva a tarefa"),
});

export const reportSchema = z.object({
  client_id: z.string().min(1, "Selecione o cliente"),
  period_start: z.string().min(1, "Informe a data inicial"),
  period_end: z.string().min(1, "Informe a data final"),
  report_type: z.enum(["weekly", "monthly", "custom"]).default("weekly"),
  report_category: z
    .enum(["mensagem", "ecommerce", "formulario", "misto"])
    .nullable()
    .optional(),
  title: z.string().optional().nullable(),
  meta_ads_investment: numericFromString,
  google_ads_investment: numericFromString,
  data_studio_url: z.string().url("URL inválida").optional().or(z.literal("")).nullable(),
  manager_analysis: z.string().optional().nullable(),
  conclusion: z.string().optional().nullable(),
  overview_metrics: z.array(overviewMetricSchema).default([]),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  manual_mode: z.boolean().default(false),
  manual_content: z.string().optional().nullable(),
  campaigns: z.array(campaignSchema).default([]),
  agency_tasks: z.array(taskSchema).default([]),
  client_tasks: z.array(taskSchema).default([]),
});

export type ReportFormValues = z.infer<typeof reportSchema>;
export type CampaignFormValues = z.infer<typeof campaignSchema>;
export type TaskFormValues = z.infer<typeof taskSchema>;
export type OverviewMetric = z.infer<typeof overviewMetricSchema>;
