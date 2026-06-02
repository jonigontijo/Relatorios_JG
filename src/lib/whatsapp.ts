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

// Variações sorteadas aleatoriamente quando o gestor abre o envio do relatório.
// Use os placeholders: {{cliente}}, {{periodo}}, {{desde}}, {{ate}}, {{link}}.
export const MESSAGE_VARIANTS: string[] = [
  `Boa tarde pessoal! Uma excelente sexta-feira a todos! ✨
Segue relatório semanal do Meta de {{desde}} até {{ate}}.
Neste link vocês têm acesso aos resultados do Meta da semana, basta clicar para acessar o gráfico e respectivos dados. Se necessário trocar ou adicionar mais informações sobre o desempenho, pode nos comunicar - o relatório é totalmente personalizado ✅
Qualquer dúvida basta nos perguntar. Obrigado e conte conosco

{{link}}`,
  `Boa tarde pessoal! Uma excelente sexta-feira a todos! ✨
Segue relatório semanal do Meta (Facebook/Instagram) de {{desde}} até {{ate}}.
Através deste link vocês podem verificar os resultados do Meta da semana, com gráficos completos e informações detalhadas. Se precisarem de ajustes ou quiserem adicionar mais detalhes sobre o desempenho, basta nos comunicar. O relatório é totalmente personalizável ✅
Qualquer dúvida estamos à disposição. Obrigado e conte conosco

{{link}}`,
  `Boa tarde pessoal! Uma excelente sexta-feira a todos! ✨
Segue relatório semanal com dados do Meta de {{desde}} até {{ate}}.
No link abaixo vocês encontrarão os resultados completos do Meta da semana, incluindo gráficos e análises detalhadas das campanhas. Caso queiram alguma modificação ou informação adicional, é só nos avisar. Nosso relatório é totalmente adaptável ✅
Qualquer dúvida, estamos prontos para ajudar. Obrigado e conte conosco

{{link}}`,
  `Boa tarde pessoal! Uma excelente sexta-feira a todos! ✨
Segue relatório semanal Meta de {{desde}} até {{ate}}.
Disponibilizamos o link com todos os resultados e métricas do Meta da semana, contendo gráficos e informações precisas. Se desejarem alguma alteração ou precisarem de mais detalhes sobre o desempenho, fiquem à vontade para nos comunicar. Nosso relatório é flexível e personalizado ✅
Qualquer dúvida, estamos à disposição. Obrigado e conte conosco

{{link}}`,
  `Boa tarde pessoal! Uma excelente sexta-feira a todos! ✨
Segue relatório semanal de desempenho no Meta de {{desde}} até {{ate}}.
Acessem o link com os resultados completos do Meta da semana, incluindo gráficos e análises detalhadas das métricas. Se precisarem de ajustes ou quiserem adicionar mais informações, só nos comunicar. Nosso relatório é totalmente personalizável ✅
Qualquer dúvida basta nos perguntar. Obrigado e conte conosco

{{link}}`,
];

export function pickRandomMessageTemplate(
  exclude?: string,
): string {
  if (MESSAGE_VARIANTS.length === 0) return DEFAULT_TEMPLATE;
  if (MESSAGE_VARIANTS.length === 1) return MESSAGE_VARIANTS[0];
  let pick = MESSAGE_VARIANTS[Math.floor(Math.random() * MESSAGE_VARIANTS.length)];
  // Evita repetir a mesma variação consecutivamente quando possível
  let safety = 0;
  while (exclude && pick === exclude && safety < 8) {
    pick = MESSAGE_VARIANTS[Math.floor(Math.random() * MESSAGE_VARIANTS.length)];
    safety += 1;
  }
  return pick;
}

export function formatBrDate(value: string | null | undefined): string {
  if (!value) return "";
  const datePart = value.split("T")[0];
  const parts = datePart.split("-");
  if (parts.length !== 3) return value;
  const [y, m, d] = parts;
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

const WHATSAPP_JID_RE = /@(g\.us|s\.whatsapp\.net|broadcast)$/i;

export const isWhatsAppGroupJid = (raw: string) =>
  /@g\.us$/i.test(raw.trim());

export const sanitizePhone = (raw: string) => {
  const trimmed = raw.trim();
  if (WHATSAPP_JID_RE.test(trimmed)) return trimmed;
  return trimmed.replace(/\D+/g, "");
};

export type RenderTemplateVars = {
  cliente: string;
  periodo: string;
  link: string;
  desde?: string;
  ate?: string;
};

export function renderTemplate(
  template: string,
  vars: RenderTemplateVars,
): string {
  return template
    .replaceAll("{{cliente}}", vars.cliente)
    .replaceAll("{{periodo}}", vars.periodo)
    .replaceAll("{{link}}", vars.link)
    .replaceAll("{{desde}}", vars.desde ?? "")
    .replaceAll("{{ate}}", vars.ate ?? "");
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
      .transform((v) => {
        if (WHATSAPP_JID_RE.test(v)) return v;
        return v.replace(/\D+/g, "");
      })
      .refine(
        (v) =>
          WHATSAPP_JID_RE.test(v) || (v.length >= 10 && v.length <= 15),
        { message: "Informe um número (DDI+DDD) ou um ID de grupo (...@g.us)" },
      ),
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
