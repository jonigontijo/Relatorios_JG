"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  clientCreateSchema,
  type ClientCreateValues,
} from "@/lib/client-schema";
import { createClientAction } from "../actions";

export function NewClientForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientCreateValues>({
    resolver: zodResolver(clientCreateSchema),
    defaultValues: {
      name: "",
      company: "",
      meta_ads_account_id: "",
      google_ads_account_id: "",
      whatsapp: "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await createClientAction(values);
      if (result.ok) {
        toast.success("Cliente cadastrado!");
        router.push("/admin/relatorios/novo");
        router.refresh();
      } else {
        toast.error("Erro: " + result.error);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="company">Nome fantasia / empresa *</Label>
        <Input
          id="company"
          placeholder="Ex.: TRICOSTURA"
          {...register("company")}
        />
        {errors.company && (
          <p className="text-xs text-destructive">{errors.company.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nome de exibição *</Label>
        <Input
          id="name"
          placeholder="Ex.: Tricostura"
          {...register("name")}
        />
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
          placeholder="Ex.: 837935833657361"
          inputMode="numeric"
          {...register("meta_ads_account_id")}
        />
        <p className="text-xs text-muted-foreground">
          Apenas números, sem &quot;act_&quot;. Encontre em Gerenciador de
          Anúncios → Configurações da conta.
        </p>
        {errors.meta_ads_account_id && (
          <p className="text-xs text-destructive">
            {errors.meta_ads_account_id.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="google_ads_account_id">
          ID da conta de anúncio Google Ads
        </Label>
        <Input
          id="google_ads_account_id"
          placeholder="Ex.: 123-456-7890"
          inputMode="numeric"
          {...register("google_ads_account_id")}
        />
        <p className="text-xs text-muted-foreground">
          ID do cliente no Google Ads (canto superior da conta). Use para marcar
          o cliente como tráfego Google.
        </p>
        {errors.google_ads_account_id && (
          <p className="text-xs text-destructive">
            {errors.google_ads_account_id.message}
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
        <p className="text-xs text-muted-foreground">
          Número direto no formato internacional (DDI + DDD + número) ou o ID
          de grupo do WhatsApp terminando em <code>@g.us</code>. É para esse
          destino que os relatórios serão enviados.
        </p>
        {errors.whatsapp && (
          <p className="text-xs text-destructive">
            {errors.whatsapp.message}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar cliente
        </Button>
      </div>
    </form>
  );
}
