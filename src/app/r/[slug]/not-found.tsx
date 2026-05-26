export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-jg-700">
          Relatório indisponível
        </h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          Este link pode ter expirado, ser inválido ou o relatório ainda não foi
          publicado. Entre em contato com a JG para receber um novo link.
        </p>
      </div>
    </main>
  );
}
