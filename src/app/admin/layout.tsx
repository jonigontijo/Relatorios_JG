import Link from "next/link";
import Image from "next/image";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-night-800 bg-night-900 text-white">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/admin/relatorios" className="flex items-center gap-3">
            <Image
              src="/jg-logo.png"
              alt="JG"
              width={48}
              height={48}
              priority
              className="h-10 w-auto object-contain"
            />
            <Image
              src="/jg-wordmark.png"
              alt="Joni Gontijo · Gestão & Tráfego Pago"
              width={360}
              height={80}
              priority
              className="hidden h-10 w-auto object-contain sm:block"
            />
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/admin/relatorios" className="text-white/80 hover:text-jg-400">
              Relatórios
            </Link>
            <Link href="/admin/clientes" className="text-white/80 hover:text-jg-400">
              Clientes
            </Link>
            <Link href="/admin/configuracoes" className="text-white/80 hover:text-jg-400">
              Configurações
            </Link>
          </nav>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}
