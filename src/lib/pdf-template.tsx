import path from "node:path";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
  Svg,
  Polygon,
  Image,
} from "@react-pdf/renderer";
import type { PublicReportData } from "@/lib/report-data";
import { REPORT_CATEGORIES } from "@/lib/report-schema";
import {
  formatBRL,
  formatDateRange,
  formatNumber,
  objectiveLabel,
  platformLabel,
} from "@/lib/utils";

const LOGO_PATH = path.join(process.cwd(), "public", "jg-logo.png");
const WORDMARK_PATH = path.join(process.cwd(), "public", "jg-wordmark.png");

function categoryLabel(value: string | null | undefined) {
  if (!value) return null;
  return REPORT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

const colors = {
  gold: "#d9a40b",
  goldLight: "#fff5c2",
  goldFaint: "#fffceb",
  goldDark: "#8c6a09",
  night: "#0a0a0a",
  nightSoft: "#1f1f1f",
  text: "#0a0a0a",
  textMuted: "#525252",
  textOnDark: "#fafafa",
  border: "#e5e5e5",
  bgMuted: "#fafafa",
  white: "#ffffff",
};

const PAGE_WIDTH = 595;
const PAGE_PADDING_X = 36;

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 56,
    paddingHorizontal: 0,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: colors.text,
    lineHeight: 1.5,
  },
  body: {
    paddingHorizontal: PAGE_PADDING_X,
  },
  heroWrap: {
    position: "relative",
    width: PAGE_WIDTH,
    height: 150,
    marginBottom: 4,
  },
  heroSvg: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  heroContent: {
    position: "absolute",
    top: 24,
    left: PAGE_PADDING_X,
    right: PAGE_PADDING_X,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  logoImage: {
    width: 64,
    height: 48,
    objectFit: "contain",
  },
  wordmarkImage: {
    height: 38,
    width: 190,
    objectFit: "contain",
  },
  metaRow: {
    flexDirection: "row",
    gap: 48,
    marginTop: 22,
  },
  metaBlock: {
    minWidth: 110,
  },
  metaLabel: {
    color: colors.gold,
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  metaValue: {
    color: colors.white,
    fontSize: 10,
    marginTop: 4,
  },
  introBlock: {
    marginTop: 14,
    marginBottom: 14,
    paddingHorizontal: PAGE_PADDING_X,
  },
  introLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text,
  },
  introClient: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.goldDark,
    marginTop: 2,
  },
  introMeta: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 4,
  },
  dashboardBanner: {
    marginTop: 10,
    marginBottom: 16,
    marginHorizontal: PAGE_PADDING_X,
    backgroundColor: colors.goldFaint,
    borderLeft: `4px solid ${colors.gold}`,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  dashboardBannerText: {
    color: colors.text,
    fontSize: 10,
  },
  dashboardLink: {
    color: colors.goldDark,
    textDecoration: "underline",
    fontWeight: "bold",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 8,
    color: colors.text,
    paddingBottom: 4,
    borderBottom: `2px solid ${colors.gold}`,
  },
  card: {
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: 12,
    backgroundColor: colors.white,
    marginBottom: 8,
  },
  kpiRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  kpiCard: {
    width: "31%",
    padding: 10,
    borderRadius: 6,
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.white,
  },
  kpiCardHighlight: {
    backgroundColor: colors.night,
    border: `1px solid ${colors.night}`,
  },
  kpiLabel: {
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: colors.textMuted,
    marginBottom: 2,
  },
  kpiLabelOnDark: {
    color: colors.gold,
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.text,
  },
  kpiValueOnDark: {
    color: colors.white,
  },
  paragraph: {
    marginBottom: 6,
  },
  campaignsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  campaignCard: {
    width: "48.5%",
    padding: 10,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    backgroundColor: colors.white,
    marginBottom: 8,
  },
  campaignHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  campaignName: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.text,
    flex: 1,
    paddingRight: 6,
  },
  campaignMeta: {
    fontSize: 8,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  campaignBadge: {
    backgroundColor: colors.gold,
    color: colors.night,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 9,
    fontWeight: "bold",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  metric: {
    width: "48%",
  },
  metricLabel: {
    fontSize: 8,
    color: colors.textMuted,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: "bold",
  },
  subDivision: {
    marginTop: 6,
    padding: 6,
    backgroundColor: colors.bgMuted,
    borderRadius: 4,
    fontSize: 9,
    color: colors.textMuted,
  },
  tasksGrid: {
    flexDirection: "row",
    gap: 8,
  },
  taskCard: {
    flex: 1,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    overflow: "hidden",
  },
  taskHeaderAgency: {
    backgroundColor: colors.night,
    color: colors.gold,
    padding: 8,
    fontSize: 10,
    fontWeight: "bold",
  },
  taskHeaderClient: {
    backgroundColor: colors.goldLight,
    color: colors.goldDark,
    padding: 8,
    fontSize: 10,
    fontWeight: "bold",
  },
  taskBody: {
    padding: 8,
  },
  taskItem: {
    flexDirection: "row",
    marginBottom: 4,
  },
  taskBullet: {
    color: colors.gold,
    marginRight: 4,
    fontWeight: "bold",
  },
  taskText: {
    flex: 1,
    fontSize: 9.5,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    fontSize: 8,
    color: colors.textMuted,
    textAlign: "center",
  },
  footerStripe: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 14,
    backgroundColor: colors.gold,
  },
});

function Hero({
  periodLabel,
  typeLabel,
  reportNumber,
}: {
  periodLabel: string;
  typeLabel: string;
  reportNumber: string;
}) {
  return (
    <View style={styles.heroWrap} fixed={false}>
      <Svg
        width={PAGE_WIDTH}
        height={150}
        viewBox={`0 0 ${PAGE_WIDTH} 150`}
        style={styles.heroSvg}
      >
        {/* Bloco preto à esquerda com corte diagonal */}
        <Polygon
          points={`0,0 ${PAGE_WIDTH * 0.74},0 ${PAGE_WIDTH * 0.62},150 0,150`}
          fill={colors.night}
        />
        {/* Cunha dourada à direita */}
        <Polygon
          points={`${PAGE_WIDTH * 0.74},0 ${PAGE_WIDTH},0 ${PAGE_WIDTH},150 ${PAGE_WIDTH * 0.62},150`}
          fill={colors.gold}
        />
      </Svg>

      <View style={styles.heroContent}>
        <View style={styles.brandRow}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={LOGO_PATH} style={styles.logoImage} />
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={WORDMARK_PATH} style={styles.wordmarkImage} />
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Data :</Text>
            <Text style={styles.metaValue}>{periodLabel}</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Tipo de Relatório :</Text>
            <Text style={styles.metaValue}>
              {typeLabel}
              {reportNumber ? ` · ${reportNumber}` : ""}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export function ReportPdfDocument({ data }: { data: PublicReportData }) {
  const { report, client, campaigns, agency_tasks, client_tasks } = data;
  const totalInvest =
    Number(report.meta_ads_investment) + Number(report.google_ads_investment);
  const periodLabel = formatDateRange(report.period_start, report.period_end);
  const typeLabel =
    report.report_type === "weekly"
      ? "Relatório Semanal"
      : report.report_type === "monthly"
        ? "Relatório Mensal"
        : "Relatório";
  const catLabel = categoryLabel(report.report_category);
  const reportNumber = `#${report.id.slice(0, 8).toUpperCase()}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Hero
          periodLabel={periodLabel}
          typeLabel={typeLabel}
          reportNumber={reportNumber}
        />

        {/* Faixa "Orçamento para:" — adaptado para "Relatório para:" */}
        <View style={styles.introBlock}>
          <Text style={styles.introLabel}>Relatório para :</Text>
          <Text style={styles.introClient}>
            {(client.company || client.name || "").toUpperCase()}
          </Text>
          {catLabel && (
            <Text style={styles.introMeta}>Categoria: {catLabel}</Text>
          )}
          {client.meta_ads_account_id && (
            <Text style={styles.introMeta}>
              Conta Meta Ads: {client.meta_ads_account_id}
            </Text>
          )}
        </View>

        {report.data_studio_url && (
          <View style={styles.dashboardBanner}>
            <Text style={styles.dashboardBannerText}>
              <Text style={{ fontWeight: "bold" }}>Dashboard interativo:</Text>{" "}
              <Link src={report.data_studio_url} style={styles.dashboardLink}>
                acessar gráficos em tempo real
              </Link>
            </Text>
          </View>
        )}

        <View style={styles.body}>
          {report.manual_mode ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Resumo do período</Text>
              <View style={styles.card}>
                {(report.manual_content ?? "")
                  .split("\n\n")
                  .filter((p) => p.trim().length > 0)
                  .map((p, i) => (
                    <Text key={i} style={styles.paragraph}>
                      {p}
                    </Text>
                  ))}
              </View>
              {report.data_studio_url && (
                <View style={styles.card}>
                  <Text style={{ fontSize: 10 }}>
                    Acesse o dashboard interativo deste relatório em{" "}
                    <Link
                      src={report.data_studio_url}
                      style={{ color: colors.goldDark, fontWeight: "bold" }}
                    >
                      {report.data_studio_url}
                    </Link>
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <>
              {/* KPIs */}
              <View style={styles.kpiRow}>
                <View style={[styles.kpiCard, styles.kpiCardHighlight]}>
                  <Text style={[styles.kpiLabel, styles.kpiLabelOnDark]}>
                    Investimento total
                  </Text>
                  <Text style={[styles.kpiValue, styles.kpiValueOnDark]}>
                    {formatBRL(totalInvest)}
                  </Text>
                </View>
                {Number(report.meta_ads_investment) > 0 && (
                  <View style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>Meta Ads</Text>
                    <Text style={styles.kpiValue}>
                      {formatBRL(report.meta_ads_investment)}
                    </Text>
                  </View>
                )}
                {Number(report.google_ads_investment) > 0 && (
                  <View style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>Google Ads</Text>
                    <Text style={styles.kpiValue}>
                      {formatBRL(report.google_ads_investment)}
                    </Text>
                  </View>
                )}
                {report.overview_metrics.map((m, i) => (
                  <View key={i} style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>{m.label}</Text>
                    <Text style={styles.kpiValue}>{m.value}</Text>
                  </View>
                ))}
              </View>

              {/* ANÁLISE */}
              {report.manager_analysis && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Bloco de análise do gestor
                  </Text>
                  <View style={styles.card}>
                    {report.manager_analysis.split("\n\n").map((p, i) => (
                      <Text key={i} style={styles.paragraph}>
                        {p}
                      </Text>
                    ))}
                  </View>
                </View>
              )}

              {/* CAMPANHAS */}
              {campaigns.length > 0 && (
                <View style={styles.section} wrap>
                  <Text style={styles.sectionTitle}>
                    Detalhamento de campanhas
                  </Text>
                  <View style={styles.campaignsGrid}>
                    {campaigns.map((c) => (
                      <View key={c.id} style={styles.campaignCard} wrap={false}>
                        <View style={styles.campaignHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.campaignName}>{c.name}</Text>
                            <Text style={styles.campaignMeta}>
                              {platformLabel(c.platform)} ·{" "}
                              {objectiveLabel(c.objective)}
                            </Text>
                          </View>
                          <Text style={styles.campaignBadge}>
                            {formatBRL(c.investment)}
                          </Text>
                        </View>

                        <View style={styles.metricsGrid}>
                          <View style={styles.metric}>
                            <Text style={styles.metricLabel}>Volume</Text>
                            <Text style={styles.metricValue}>
                              {formatNumber(c.volume)} {c.volume_label ?? ""}
                            </Text>
                          </View>
                          {c.cost_per_result !== null && (
                            <View style={styles.metric}>
                              <Text style={styles.metricLabel}>
                                Custo por resultado
                              </Text>
                              <Text style={styles.metricValue}>
                                {formatBRL(c.cost_per_result)}{" "}
                                {c.cost_per_result_label ?? ""}
                              </Text>
                            </View>
                          )}
                          {c.followers_gained !== null && (
                            <View style={styles.metric}>
                              <Text style={styles.metricLabel}>
                                Seguidores ganhos
                              </Text>
                              <Text style={styles.metricValue}>
                                +{formatNumber(c.followers_gained)}
                              </Text>
                            </View>
                          )}
                          {c.followers_current !== null && (
                            <View style={styles.metric}>
                              <Text style={styles.metricLabel}>
                                Seguidores atuais
                              </Text>
                              <Text style={styles.metricValue}>
                                {formatNumber(c.followers_current)}
                              </Text>
                            </View>
                          )}
                        </View>

                        {c.sub_division && (
                          <Text style={styles.subDivision}>
                            {c.sub_division}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* CONCLUSÃO */}
              {report.conclusion && (
                <View style={styles.section} wrap={false}>
                  <Text style={styles.sectionTitle}>Conclusão</Text>
                  <View style={styles.card}>
                    {report.conclusion.split("\n\n").map((p, i) => (
                      <Text key={i} style={styles.paragraph}>
                        {p}
                      </Text>
                    ))}
                  </View>
                </View>
              )}

              {/* TAREFAS */}
              {(agency_tasks.length > 0 || client_tasks.length > 0) && (
                <View style={styles.section} wrap={false}>
                  <Text style={styles.sectionTitle}>Próximos passos</Text>
                  <View style={styles.tasksGrid}>
                    <View style={styles.taskCard}>
                      <Text style={styles.taskHeaderAgency}>
                        Tarefas da agência
                      </Text>
                      <View style={styles.taskBody}>
                        {agency_tasks.length === 0 ? (
                          <Text
                            style={{ color: colors.textMuted, fontSize: 9 }}
                          >
                            Nenhuma tarefa.
                          </Text>
                        ) : (
                          agency_tasks.map((t) => (
                            <View key={t.id} style={styles.taskItem}>
                              <Text style={styles.taskBullet}>•</Text>
                              <Text style={styles.taskText}>
                                {t.description}
                              </Text>
                            </View>
                          ))
                        )}
                      </View>
                    </View>
                    <View style={styles.taskCard}>
                      <Text style={styles.taskHeaderClient}>
                        Tarefas do cliente
                      </Text>
                      <View style={styles.taskBody}>
                        {client_tasks.length === 0 ? (
                          <Text
                            style={{ color: colors.textMuted, fontSize: 9 }}
                          >
                            Nenhuma tarefa.
                          </Text>
                        ) : (
                          client_tasks.map((t) => (
                            <View key={t.id} style={styles.taskItem}>
                              <Text style={styles.taskBullet}>•</Text>
                              <Text style={styles.taskText}>
                                {t.description}
                              </Text>
                            </View>
                          ))
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Joni Gontijo · Gestão & Tráfego Pago · ${client.name || client.company} · Página ${pageNumber}/${totalPages}`
          }
          fixed
        />
        <View style={styles.footerStripe} fixed />
      </Page>
    </Document>
  );
}
