import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(value: number | string | null | undefined) {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  if (Number.isNaN(n as number)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n as number);
}

export function formatNumber(value: number | string | null | undefined) {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  if (Number.isNaN(n as number)) return "0";
  return new Intl.NumberFormat("pt-BR").format(n as number);
}

export function formatDateRange(start: string, end: string) {
  const fmt = (iso: string) => {
    const d = new Date(iso + "T00:00:00");
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  };
  return `${fmt(start)} — ${fmt(end)}`;
}

export function objectiveLabel(value: string) {
  const map: Record<string, string> = {
    mensagens: "Mensagens",
    cliques: "Cliques no Link",
    visitas_perfil: "Visitas ao Perfil",
    leads: "Leads",
    conversoes: "Conversões",
    alcance: "Alcance",
    engajamento: "Engajamento",
    seguidores: "Seguidores",
    trafego: "Tráfego",
    outros: "Outros",
  };
  return map[value] ?? value;
}

export function platformLabel(value: string) {
  const map: Record<string, string> = {
    meta: "Meta Ads",
    google: "Google Ads",
    tiktok: "TikTok Ads",
    linkedin: "LinkedIn Ads",
    outros: "Outros",
  };
  return map[value] ?? value;
}
