import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid place-items-center py-24">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Relatório não encontrado</h1>
        <p className="mt-2 text-muted-foreground">
          O relatório solicitado não existe ou foi removido.
        </p>
        <Link
          href="/admin/relatorios"
          className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Voltar para a lista
        </Link>
      </div>
    </main>
  );
}
