import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .url("URL inválida")
  .optional()
  .or(z.literal(""));

const GROUP_JID_RE = /@(g\.us|s\.whatsapp\.net|broadcast)$/i;

const optionalWhatsapp = z
  .string()
  .trim()
  .transform((v) => {
    if (GROUP_JID_RE.test(v)) return v;
    return v.replace(/\D+/g, "");
  })
  .refine(
    (v) =>
      v === "" ||
      GROUP_JID_RE.test(v) ||
      (v.length >= 10 && v.length <= 15),
    {
      message:
        "Use um número (DDI+DDD, ex.: 5537998357244) ou um ID de grupo (ex.: 120363393907049523@g.us)",
    },
  )
  .optional()
  .or(z.literal(""));

export const clientCreateSchema = z.object({
  name: z.string().min(1, "Informe o nome").max(120),
  company: z.string().min(1, "Informe o nome fantasia / empresa").max(120),
  meta_ads_account_id: z
    .string()
    .trim()
    .regex(/^\d+$/u, "Apenas números (ID do Gerenciador de Anúncios)")
    .optional()
    .or(z.literal("")),
  whatsapp: optionalWhatsapp,
});

export const clientEditSchema = clientCreateSchema.extend({
  data_studio_url_default: optionalUrl,
  data_studio_url_mensagem: optionalUrl,
  data_studio_url_ecommerce: optionalUrl,
  data_studio_url_formulario: optionalUrl,
  data_studio_url_misto: optionalUrl,
});

export type ClientCreateValues = z.infer<typeof clientCreateSchema>;
export type ClientEditValues = z.infer<typeof clientEditSchema>;
