import { notFound } from "next/navigation";
import Image from "next/image";
import { ExternalLink, Download } from "lucide-react";
import { loadPublicReport, toEmbedUrl } from "@/lib/report-data";
import { REPORT_CATEGORIES } from "@/lib/report-schema";
import {
  formatBRL,
  formatDateRange,
  formatNumber,
  objectiveLabel,
  platformLabel,
} from "@/lib/utils";

function categoryLabel(value: string | null | undefined) {
  if (!value) return null;
  return REPORT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export const dynamic = "force-dynamic";

export default async function PublicReportPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { t?: string };
}) {
  const token = searchParams.t;
  if (!token) notFound();

  const data = await loadPublicReport(params.slug, token);
  if (!data) notFound();

  const { report, client, campaigns, agency_tasks, client_tasks } = data;
  const totalInvestment =
    Number(report.meta_ads_investment) + Number(report.google_ads_investment);
  const embedUrl = toEmbedUrl(report.data_studio_url);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HERO */}
      <header className="relative overflow-hidden bg-night-900 text-white">
        {/* Diagonal dourada à direita */}
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 hidden w-2/5 bg-jg-500 md:block"
          style={{ clipPath: "polygon(20% 0%, 100% 0%, 100% 100%, 0% 100%)" }}
        />
        <div className="container relative max-w-5xl py-12">
          <div className="flex items-center gap-4">
            <Image
              src="/jg-logo.png"
              alt="JG"
              width={96}
              height={96}
              priority
              className="h-16 w-auto object-contain drop-shadow-lg"
            />
            <Image
              src="/jg-wordmark.png"
              alt="Joni Gontijo · Gestão & Tráfego Pago"
              width={520}
              height={120}
              priority
              className="h-14 w-auto object-contain drop-shadow-lg"
            />
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-jg-400">
            <span>
              {report.report_type === "weekly"
                ? "Relatório Semanal"
                : report.report_type === "monthly"
                  ? "Relatório Mensal"
                  : "Relatório"}
            </span>
            {categoryLabel(report.report_category) && (
              <span className="rounded-full bg-jg-500/20 px-3 py-0.5 text-xs font-semibold tracking-wide text-jg-300">
                {categoryLabel(report.report_category)}
              </span>
            )}
          </div>
          <h1 className="mt-1 text-4xl font-bold tracking-tight md:text-5xl">
            {report.title || client.company || client.name}
          </h1>
          <p className="mt-2 text-white/80">
            Período: {formatDateRange(report.period_start, report.period_end)}
          </p>
          {client.meta_ads_account_id && (
            <p className="mt-1 text-xs text-white/60">
              Conta Meta Ads: {client.meta_ads_account_id}
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-3 no-print">
            {report.data_studio_url && (
              <a
                href={report.data_studio_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-jg-500 px-4 py-2 text-sm font-semibold text-night-900 hover:bg-jg-400"
              >
                <ExternalLink className="h-4 w-4" />
                Dashboard interativo
              </a>
            )}
            <a
              href={`/api/pdf/${report.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/20"
            >
              <Download className="h-4 w-4" /> Baixar PDF
            </a>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl space-y-10 py-12">
        {report.manual_mode ? (
          <>
            {/* CONTEÚDO MANUAL */}
            {report.manual_content && (
              <Section title="Resumo do período">
                <div className="report-prose whitespace-pre-wrap rounded-lg border bg-white p-6 text-[15px] leading-relaxed shadow-sm">
                  {report.manual_content}
                </div>
              </Section>
            )}

            {/* DASHBOARD EMBUTIDO */}
            {embedUrl && (
              <Section
                title="Dashboard interativo"
                subtitle="Navegue pelos gráficos completos do período."
              >
                <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
                  <iframe
                    src={embedUrl}
                    className="block h-[720px] w-full"
                    allowFullScreen
                    sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups"
                  />
                </div>
              </Section>
            )}
          </>
        ) : (
          <>
        {/* VISÃO GERAL */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <KpiCard label="Investimento total" value={formatBRL(totalInvestment)} highlight />
          {Number(report.meta_ads_investment) > 0 && (
            <KpiCard
              label="Meta Ads"
              value={formatBRL(report.meta_ads_investment)}
            />
          )}
          {Number(report.google_ads_investment) > 0 && (
            <KpiCard
              label="Google Ads"
              value={formatBRL(report.google_ads_investment)}
            />
          )}
          {report.overview_metrics.map((m, i) => (
            <KpiCard key={i} label={m.label} value={m.value} />
          ))}
        </section>

        {/* ANÁLISE DO GESTOR */}
        {report.manager_analysis && (
          <Section title="Bloco de análise do gestor">
            <div className="report-prose rounded-lg border bg-white p-6 shadow-sm">
              {report.manager_analysis.split("\n\n").map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>
          </Section>
        )}

        {/* DASHBOARD EMBUTIDO */}
        {embedUrl && (
          <Section
            title="Dashboard interativo"
            subtitle="Navegue pelos gráficos completos do período."
          >
            <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
              <iframe
                src={embedUrl}
                className="block h-[720px] w-full"
                allowFullScreen
                sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups"
              />
            </div>
          </Section>
        )}

        {/* CAMPANHAS */}
        {campaigns.length > 0 && (
          <Section
            title="Detalhamento de campanhas"
            subtitle="Funil de conversão do período."
          >
            <div className="grid gap-4 md:grid-cols-2">
              {campaigns.map((c) => (
                <article
                  key={c.id}
                  className="rounded-lg border bg-white p-5 shadow-sm"
                >
                  <header className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold leading-tight">
                        {c.name}
                      </h3>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {platformLabel(c.platform)} · {objectiveLabel(c.objective)}
                      </p>
                    </div>
                    <span className="rounded-md bg-jg-50 px-2 py-1 text-xs font-semibold text-jg-700">
                      {formatBRL(c.investment)}
                    </span>
                  </header>

                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Volume gerado
                      </dt>
                      <dd className="text-lg font-semibold">
                        {formatNumber(c.volume)}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          {c.volume_label}
                        </span>
                      </dd>
                    </div>
                    {c.cost_per_result !== null && (
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Custo por resultado
                        </dt>
                        <dd className="text-lg font-semibold">
                          {formatBRL(c.cost_per_result)}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            {c.cost_per_result_label}
                          </span>
                        </dd>
                      </div>
                    )}
                    {c.followers_gained !== null && (
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Seguidores ganhos
                        </dt>
                        <dd className="text-lg font-semibold">
                          +{formatNumber(c.followers_gained)}
                        </dd>
                      </div>
                    )}
                    {c.followers_current !== null && (
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Seguidores atuais
                        </dt>
                        <dd className="text-lg font-semibold">
                          {formatNumber(c.followers_current)}
                        </dd>
                      </div>
                    )}
                  </dl>

                  {c.sub_division && (
                    <p className="mt-3 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                      {c.sub_division}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </Section>
        )}

        {/* CONCLUSÃO */}
        {report.conclusion && (
          <Section title="Conclusão">
            <div className="report-prose rounded-lg border bg-white p-6 shadow-sm">
              {report.conclusion.split("\n\n").map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>
          </Section>
        )}

        {/* TAREFAS */}
        {(agency_tasks.length > 0 || client_tasks.length > 0) && (
          <Section title="Próximos passos">
            <div className="grid gap-4 md:grid-cols-2">
              <TaskCard
                title="Tarefas da agência"
                color="bg-night-900 text-jg-400"
                tasks={agency_tasks}
              />
              <TaskCard
                title="Tarefas do cliente"
                color="bg-jg-100 text-night-900"
                tasks={client_tasks}
              />
            </div>
          </Section>
        )}
          </>
        )}

        <footer className="border-t pt-6 text-center text-xs text-muted-foreground">
          Relatório gerado pela JG. © {new Date().getFullYear()}.
        </footer>
      </main>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <header className="mb-4">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </header>
      {children}
    </section>
  );
}

function KpiCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "rounded-lg border p-5 shadow-sm " +
        (highlight
          ? "border-night-900 bg-night-900 text-white"
          : "bg-white")
      }
    >
      <div
        className={
          "text-xs uppercase tracking-wider " +
          (highlight ? "text-jg-400" : "text-muted-foreground")
        }
      >
        {label}
      </div>
      <div
        className={
          "mt-1 text-2xl font-bold " + (highlight ? "text-jg-300" : "")
        }
      >
        {value}
      </div>
    </div>
  );
}

function TaskCard({
  title,
  color,
  tasks,
}: {
  title: string;
  color: string;
  tasks: { id: string; description: string }[];
}) {
  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <header className={`rounded-t-lg px-5 py-3 text-sm font-semibold ${color}`}>
        {title}
      </header>
      <ul className="space-y-2 p-5 text-sm">
        {tasks.length === 0 && (
          <li className="text-muted-foreground">Nenhuma tarefa.</li>
        )}
        {tasks.map((t) => (
          <li key={t.id} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-jg-500" />
            <span className="whitespace-pre-wrap">{t.description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
