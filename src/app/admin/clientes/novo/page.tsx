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
          <CardTitle>Cadastro desativado aqui</CardTitle>
          <CardDescription>
            O cadastro de clientes agora acontece em um lugar só: a aba
            Clientes do sistema interno da JG. Assim que o cliente for
            cadastrado lá, ele aparece nesta lista automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Antes, cadastrar por aqui criava um registro paralelo sem verificar
          se a empresa já existia — foi assim que XP Imóveis e PL Soluções
          Financeiras acabaram duplicadas.
        </CardContent>
      </Card>
    </div>
  );
}
