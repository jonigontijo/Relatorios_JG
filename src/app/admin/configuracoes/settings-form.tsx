"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Save, Loader2, Send, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { settingsSchema, type SettingsValues } from "@/lib/whatsapp";
import { saveSettingsAction, testWhatsAppAction } from "./actions";

type Props = {
  defaultValues: SettingsValues;
  updatedAt: string | null;
};

export function SettingsForm({ defaultValues, updatedAt }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showToken, setShowToken] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState(
    "Mensagem de teste do JG Relatórios.",
  );
  const [testing, setTesting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues,
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await saveSettingsAction(values);
      if (result.ok) {
        toast.success("Configurações salvas.");
        router.refresh();
      } else {
        toast.error("Erro: " + result.error);
      }
    });
  });

  const runTest = async () => {
    setTesting(true);
    try {
      const result = await testWhatsAppAction({
        phone: testPhone,
        message: testMessage,
      });
      if (result.ok) {
        toast.success("Mensagem de teste enviada!");
      } else {
        toast.error("Falha no teste: " + result.error);
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-lg border bg-white p-6"
      >
        <div>
          <h2 className="text-base font-semibold">UazAPI / WhatsApp</h2>
          <p className="text-xs text-muted-foreground">
            Configure aqui a conexão usada para disparar relatórios pelo
            WhatsApp.
            {updatedAt && (
              <>
                {" "}Última atualização:{" "}
                <strong>{new Date(updatedAt).toLocaleString("pt-BR")}</strong>.
              </>
            )}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="whatsapp_api_url">URL do servidor</Label>
            <Input
              id="whatsapp_api_url"
              placeholder="https://jgtech.uazapi.com"
              {...register("whatsapp_api_url")}
            />
            <p className="text-[11px] text-muted-foreground">
              Endpoint base, sem &quot;/send/text&quot;.
            </p>
            {errors.whatsapp_api_url && (
              <p className="text-xs text-destructive">
                {errors.whatsapp_api_url.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp_default_instance">
              Nome da instância (opcional)
            </Label>
            <Input
              id="whatsapp_default_instance"
              placeholder="Ex.: jgtech"
              {...register("whatsapp_default_instance")}
            />
            <p className="text-[11px] text-muted-foreground">
              Apenas para sua referência. Não é enviado à API.
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="whatsapp_api_token">Token da instância</Label>
            <div className="relative">
              <Input
                id="whatsapp_api_token"
                type={showToken ? "text" : "password"}
                placeholder="b1e63995-8268-4910-b5e6-..."
                className="pr-10"
                {...register("whatsapp_api_token")}
              />
              <button
                type="button"
                onClick={() => setShowToken((s) => !s)}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label={showToken ? "Esconder token" : "Mostrar token"}
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.whatsapp_api_token && (
              <p className="text-xs text-destructive">
                {errors.whatsapp_api_token.message}
              </p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="whatsapp_default_template">Mensagem padrão</Label>
            <Textarea
              id="whatsapp_default_template"
              rows={4}
              placeholder="Olá, {{cliente}}! Seu relatório de {{periodo}} já está disponível: {{link}}"
              {...register("whatsapp_default_template")}
            />
            <p className="text-[11px] text-muted-foreground">
              Placeholders disponíveis:{" "}
              <code className="rounded bg-muted px-1">{`{{cliente}}`}</code>,{" "}
              <code className="rounded bg-muted px-1">{`{{periodo}}`}</code>,{" "}
              <code className="rounded bg-muted px-1">{`{{link}}`}</code>. O
              gestor poderá editar a mensagem antes de enviar.
            </p>
            {errors.whatsapp_default_template && (
              <p className="text-xs text-destructive">
                {errors.whatsapp_default_template.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar configurações
          </Button>
        </div>
      </form>

      <div className="space-y-4 rounded-lg border bg-white p-6">
        <div>
          <h2 className="text-base font-semibold">Testar conexão</h2>
          <p className="text-xs text-muted-foreground">
            Envia uma mensagem rápida para validar URL e token. Salve as
            configurações antes de testar.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="test_phone">Número de destino</Label>
            <Input
              id="test_phone"
              placeholder="5537998357244"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="test_message">Mensagem de teste</Label>
            <Input
              id="test_message"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={testing || !testPhone}
            onClick={runTest}
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Enviar teste
          </Button>
        </div>
      </div>
    </div>
  );
}
