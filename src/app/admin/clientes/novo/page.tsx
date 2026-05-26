import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NewClientForm } from "./new-client-form";

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/admin/relatorios">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Novo cliente</CardTitle>
          <CardDescription>
            Cadastre o cliente para já vinculá-lo aos relatórios. Você pode
            editar dados completos no módulo principal da JG depois.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewClientForm />
        </CardContent>
      </Card>
    </div>
  );
}
