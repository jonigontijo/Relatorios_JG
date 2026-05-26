"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { renderTemplate } from "@/lib/whatsapp";
import {
  cancelDispatchAction,
  retryDispatchAction,
  sendOrScheduleDispatchAction,
} from "../whatsapp-actions";

export type DispatchRow = {
  id: string;
  phone: string;
  message: string;
  scheduled_at: string | null;
  status: string;
  attempts: number;
  last_error: string | null;
  sent_at: string | null;
  created_at: string;
};

type Props = {
  reportId: string;
  status: string;
  clientLabel: string;
  clientWhatsapp: string;
  periodLabel: string;
  publicUrl: string;
  defaultTemplate: string;
  dispatches: DispatchRow[];
  configured: boolean;
};

function localDatetimeNowPlus(minutes: number) {
  const d = new Date(Date.now() + minutes * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function WhatsAppSection({
  reportId,
  status,
  clientLabel,
  clientWhatsapp,
  periodLabel,
  publicUrl,
  defaultTemplate,
  dispatches,
  configured,
}: Props) {
  const initialMessage = useMemo(
    () =>
      renderTemplate(defaultTemplate, {
        cliente: clientLabel,
        periodo: periodLabel,
        link: publicUrl,
      }),
    [defaultTemplate, clientLabel, periodLabel, publicUrl],
  );

  const [open, setOpen] = useState(false);
  const [initialMode, setInitialMode] = useState<"now" | "schedule">("now");
  const [phone, setPhone] = useState(clientWhatsapp || "");
  const [message, setMessage] = useState(initialMessage);
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [scheduledAt, setScheduledAt] = useState(() => localDatetimeNowPlus(30));
  const [isPending, startTransition] = useTransition();
  const [pendingDispatchId, setPendingDispatchId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (open) {
      setPhone(clientWhatsapp || "");
      setMessage(initialMessage);
      setMode(initialMode);
      setScheduledAt(localDatetimeNowPlus(30));
    }
  }, [open, clientWhatsapp, initialMessage, initialMode]);

  const publishedReady = status === "published";

  const openModal = (m: "now" | "schedule") => {
    setInitialMode(m);
    setOpen(true);
  };

  const submit = () => {
    startTransition(async () => {
      const result = await sendOrScheduleDispatchAction({
        reportId,
        phone,
        message,
        mode,
        scheduledAt: mode === "schedule" ? scheduledAt : null,
      });
      if (!result.ok) {
        toast.error("Erro: " + result.error);
        return;
      }
      if (result.status === "scheduled") {
        toast.success("Envio agendado!");
      } else {
        toast.success("Mensagem enviada!");
      }
      setOpen(false);
    });
  };

  const cancel = (dispatchId: string) => {
    if (!confirm("Cancelar este envio agendado?")) return;
    setPendingDispatchId(dispatchId);
    startTransition(async () => {
      const r = await cancelDispatchAction(dispatchId, reportId);
      setPendingDispatchId(null);
      if (!r.ok) {
        toast.error("Erro: " + r.error);
      } else {
        toast.success("Envio cancelado.");
      }
    });
  };

  const retry = (dispatchId: string) => {
    setPendingDispatchId(dispatchId);
    startTransition(async () => {
      const r = await retryDispatchAction(dispatchId, reportId);
      setPendingDispatchId(null);
      if (!r.ok) {
        toast.error("Erro: " + r.error);
      } else {
        toast.success("Reenviado com sucesso.");
      }
    });
  };

  const nextScheduled = dispatches.find((d) => d.status === "pending");

  return (
    <section className="space-y-4 rounded-lg border bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Envio por WhatsApp</h2>
          <p className="text-xs text-muted-foreground">
            Dispare o link público do relatório agora ou agende para outra
            data/hora. O envio agendado roda automaticamente dentro do app.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!configured && (
            <Badge variant="warn" className="shrink-0 gap-1">
              <AlertTriangle className="h-3 w-3" /> UazAPI não configurada
            </Badge>
          )}
          <Button
            type="button"
            onClick={() => openModal("now")}
            disabled={!publishedReady}
          >
            <Send className="h-4 w-4" /> Enviar agora
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => openModal("schedule")}
            disabled={!publishedReady}
          >
            <Clock className="h-4 w-4" /> Agendar
          </Button>
        </div>
      </div>

      {!publishedReady && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Publique o relatório antes de enviar. O link público só fica ativo
          após a publicação.
        </div>
      )}

      {publishedReady && nextScheduled && nextScheduled.scheduled_at && (
        <div className="flex items-start gap-2 rounded-md border border-jg-300 bg-jg-50 px-3 py-2 text-xs text-jg-700">
          <Clock className="mt-0.5 h-3.5 w-3.5" />
          <div>
            Próximo envio agendado para{" "}
            <strong>
              {new Date(nextScheduled.scheduled_at).toLocaleString("pt-BR")}
            </strong>{" "}
            no número <span className="font-mono">{nextScheduled.phone}</span>.
          </div>
        </div>
      )}

      <DispatchHistory
        dispatches={dispatches}
        isPending={isPending}
        pendingDispatchId={pendingDispatchId}
        onCancel={cancel}
        onRetry={retry}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-jg-600" />
              {mode === "schedule" ? "Agendar envio" : "Enviar relatório"}
            </DialogTitle>
            <DialogDescription>
              Para: <strong>{clientLabel}</strong> · Período:{" "}
              <strong>{periodLabel}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="wa_phone">Número do destinatário</Label>
                <Input
                  id="wa_phone"
                  inputMode="numeric"
                  placeholder="5537998357244"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  DDI + DDD + número, apenas dígitos.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Modo de envio</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={mode === "now" ? "default" : "outline"}
                    onClick={() => setMode("now")}
                  >
                    <Send className="h-3.5 w-3.5" /> Agora
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={mode === "schedule" ? "default" : "outline"}
                    onClick={() => setMode("schedule")}
                  >
                    <Clock className="h-3.5 w-3.5" /> Agendar
                  </Button>
                </div>
                {mode === "schedule" && (
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="mt-1"
                  />
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wa_message">Mensagem</Label>
              <Textarea
                id="wa_message"
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Edite à vontade. O link público vai pré-preenchido pelo
                template.
              </p>
            </div>

            <div className="rounded-md border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">Link público:</span>{" "}
                <span className="break-all">{publicUrl}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={isPending}>
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={submit}
              disabled={isPending || !phone || !message}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "schedule" ? (
                <Clock className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {mode === "schedule" ? "Confirmar agendamento" : "Enviar agora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function DispatchHistory({
  dispatches,
  isPending,
  pendingDispatchId,
  onCancel,
  onRetry,
}: {
  dispatches: DispatchRow[];
  isPending: boolean;
  pendingDispatchId: string | null;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  return (
    <div className="space-y-2 pt-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Histórico de disparos
      </h3>
      {dispatches.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum envio registrado ainda.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Para</th>
                <th className="px-3 py-2 text-left font-medium">Quando</th>
                <th className="px-3 py-2 text-left font-medium">Detalhe</th>
                <th className="px-3 py-2 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {dispatches.map((d) => {
                const isPendingThis = pendingDispatchId === d.id;
                return (
                  <tr key={d.id} className="border-t">
                    <td className="px-3 py-2">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-3 py-2 font-mono">{d.phone}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {d.sent_at
                        ? `Enviado ${new Date(d.sent_at).toLocaleString("pt-BR")}`
                        : d.scheduled_at
                          ? `Agendado para ${new Date(d.scheduled_at).toLocaleString("pt-BR")}`
                          : new Date(d.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {d.last_error ? (
                        <span className="text-destructive">{d.last_error}</span>
                      ) : (
                        <span className="truncate">
                          {d.message.length > 60
                            ? d.message.slice(0, 60) + "…"
                            : d.message}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        {d.status === "pending" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Cancelar"
                            onClick={() => onCancel(d.id)}
                            disabled={isPending}
                          >
                            {isPendingThis ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                        {d.status === "failed" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Tentar de novo"
                            onClick={() => onRetry(d.id)}
                            disabled={isPending}
                          >
                            {isPendingThis ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "sent") {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" /> Enviado
      </Badge>
    );
  }
  if (status === "pending") {
    return (
      <Badge variant="warn" className="gap-1">
        <Clock className="h-3 w-3" /> Pendente
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" /> Falhou
      </Badge>
    );
  }
  if (status === "cancelled") {
    return <Badge variant="secondary">Cancelado</Badge>;
  }
  return <Badge variant="outline">{status}</Badge>;
}
