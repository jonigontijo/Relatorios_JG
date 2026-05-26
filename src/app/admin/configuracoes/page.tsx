import { DEFAULT_TEMPLATE } from "@/lib/whatsapp";
import { loadAppSettings } from "@/lib/whatsapp-server";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const settings = await loadAppSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Credenciais e preferências usadas para envio de relatórios pelo
          WhatsApp.
        </p>
      </div>

      <SettingsForm
        defaultValues={{
          whatsapp_api_url: settings.whatsapp_api_url ?? "",
          whatsapp_api_token: settings.whatsapp_api_token ?? "",
          whatsapp_default_template:
            settings.whatsapp_default_template ?? DEFAULT_TEMPLATE,
          whatsapp_default_instance: settings.whatsapp_default_instance ?? "",
        }}
        updatedAt={settings.updated_at}
      />
    </div>
  );
}
