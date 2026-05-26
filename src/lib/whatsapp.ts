import { z } from "zod";

export type AppSettings = {
  whatsapp_api_url: string | null;
  whatsapp_api_token: string | null;
  whatsapp_default_template: string | null;
  whatsapp_default_instance: string | null;
  updated_at: string | null;
};

export const DEFAULT_TEMPLATE =
  "Olá, {{cliente}}! Seu relatório de {{periodo}} já está disponível: {{link}}";

export const sanitizePhone = (raw: string) => raw.replace(/\D+/g, "");

export function renderTemplate(
  template: string,
  vars: { cliente: string; periodo: string; link: string },
): string {
  return template
    .replaceAll("{{cliente}}", vars.cliente)
    .replaceAll("{{periodo}}", vars.periodo)
    .replaceAll("{{link}}", vars.link);
}

export type SendTextResult = {
  ok: boolean;
  status: number;
  response: unknown;
  error?: string;
};

export async function sendWhatsAppText(args: {
  apiUrl: string;
  apiToken: string;
  phone: string;
  message: string;
}): Promise<SendTextResult> {
  const base = args.apiUrl.replace(/\/+$/, "");
  const url = `${base}/send/text`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        token: args.apiToken,
      },
      body: JSON.stringify({
        number: sanitizePhone(args.phone),
        text: args.message,
      }),
      cache: "no-store",
    });
    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      // keep as text
    }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        response: parsed,
        error: typeof parsed === "string" ? parsed : `HTTP ${res.status}`,
      };
    }
    return { ok: true, status: res.status, response: parsed };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      response: null,
      error: err instanceof Error ? err.message : "Erro desconhecido",
    };
  }
}

export const dispatchSchema = z
  .object({
    reportId: z.string().uuid("ID de relatório inválido"),
    phone: z
      .string()
      .trim()
      .transform((v) => v.replace(/\D+/g, ""))
      .refine((v) => v.length >= 10 && v.length <= 15, {
        message: "Número de WhatsApp inválido",
      }),
    message: z.string().trim().min(1, "Mensagem não pode estar vazia").max(4000),
    mode: z.enum(["now", "schedule"]),
    scheduledAt: z.string().optional().nullable(),
  })
  .refine(
    (v) => v.mode !== "schedule" || (!!v.scheduledAt && v.scheduledAt.length > 0),
    { message: "Informe a data/hora do agendamento", path: ["scheduledAt"] },
  );

export type DispatchInput = z.infer<typeof dispatchSchema>;

export const settingsSchema = z.object({
  whatsapp_api_url: z
    .string()
    .trim()
    .url("URL inválida")
    .optional()
    .or(z.literal("")),
  whatsapp_api_token: z.string().trim().max(200).optional().or(z.literal("")),
  whatsapp_default_template: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .or(z.literal("")),
  whatsapp_default_instance: z
    .string()
    .trim()
    .max(120)
    .optional()
    .or(z.literal("")),
});
export type SettingsValues = z.infer<typeof settingsSchema>;
