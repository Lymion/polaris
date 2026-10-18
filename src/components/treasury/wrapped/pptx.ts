import { CHART_COLORS } from "@/lib/categories";
import { ACTIVITY_KINDS } from "@/lib/excel";
import { formatMoney } from "@/lib/money";
import type { BusinessProfile, MonthlyReport } from "@/lib/types";

const NAVY = "0B1B3F";
const INK = "EEF2FF";
const MUTED = "9AA8C7";
const GOLD = "F5B942";
const FONT = "Calibri";

const VERDICT_LABEL = {
  boosted: "Boosted sales",
  hurt: "Sales dipped",
  "no clear effect": "No clear effect",
  "too early": "Too early to tell",
} as const;

/** Saves the month's story as an editable PowerPoint (opens in PowerPoint, Keynote and Google Slides). */
export async function downloadReportPptx(report: MonthlyReport, profile: BusinessProfile) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
  pptx.author = "Polaris";
  pptx.title = `${profile.businessName}: ${report.stats.label}`;

  const c = profile.currency;
  const money = (n: number) => formatMoney(n, c);
  const { stats, previous, history } = report;
  const vs = (now: number, before?: number) =>
    before ? ` (${now >= before ? "+" : ""}${Math.round(((now - before) / Math.abs(before)) * 100)}% vs ${previous?.label})` : "";

  const base = (title: string, kicker: string) => {
    const s = pptx.addSlide();
    s.background = { color: NAVY };
    s.addText(kicker.toUpperCase(), { x: 0.6, y: 0.4, w: 12, h: 0.35, fontSize: 12, bold: true, color: GOLD, fontFace: FONT, charSpacing: 3 });
    s.addText(title, { x: 0.6, y: 0.75, w: 12.1, h: 0.9, fontSize: 30, bold: true, color: INK, fontFace: FONT });
    s.addText(`Polaris · ${profile.businessName} · ${stats.label}`, { x: 0.6, y: 7.0, w: 12, h: 0.3, fontSize: 10, color: MUTED, fontFace: FONT });
    return s;
  };
  /** Text block; pass `side` to put it in the column right of a chart. */
  const body = (s: ReturnType<typeof base>, text: string, side = false) =>
    s.addText(text, side ? { x: 8.3, y: 1.8, w: 4.4, h: 4.8, fontSize: 14, color: INK, fontFace: FONT, valign: "top" } : { x: 0.6, y: 1.8, w: 12.1, h: 1.1, fontSize: 16, color: INK, fontFace: FONT, valign: "top" });

  // 1. Title
  const title = pptx.addSlide();
  title.background = { color: NAVY };
  title.addText(`${profile.businessName}`, { x: 0.6, y: 2.2, w: 12, h: 0.5, fontSize: 20, color: MUTED, fontFace: FONT });
  title.addText(`${stats.label} Wrapped`, { x: 0.6, y: 2.7, w: 12, h: 1.2, fontSize: 48, bold: true, color: GOLD, fontFace: FONT });
  title.addText(report.headline, { x: 0.6, y: 4.0, w: 11, h: 1.2, fontSize: 22, color: INK, fontFace: FONT });
  title.addText(`Prepared by ${profile.mascotName || "Lumi"} in Polaris`, { x: 0.6, y: 6.8, w: 12, h: 0.4, fontSize: 12, color: MUTED, fontFace: FONT });

  // 2. Sales and costs over time
  const trend = base(`${money(stats.income)} in, ${money(stats.expenses)} out`, "Sales and spending");
  trend.addChart(
    pptx.ChartType.bar,
    [
      { name: "Money in", labels: history.map((h) => h.label), values: history.map((h) => h.income) },
      { name: "Money out", labels: history.map((h) => h.label), values: history.map((h) => h.expenses) },
    ],
    {
      x: 0.6, y: 1.8, w: 7.4, h: 4.8,
      barDir: "col", barGrouping: "clustered", barGapWidthPct: 60,
      chartColors: [CHART_COLORS.income.slice(1), CHART_COLORS.expense.slice(1)],
      showLegend: true, legendPos: "b", legendColor: INK, legendFontSize: 12,
      catAxisLabelColor: MUTED, valAxisLabelColor: MUTED, valGridLine: { color: "26355E", size: 1 },
      catAxisLineShow: false, valAxisLineShow: false,
    },
  );
  trend.addText(
    [
      { text: `Sales: ${money(stats.income)}${vs(stats.income, previous?.income)}`, options: { bold: true, breakLine: true } },
      { text: report.stories.sales, options: { breakLine: true } },
      { text: " ", options: { breakLine: true } },
      { text: `Spending: ${money(stats.expenses)}${vs(stats.expenses, previous?.expenses)}`, options: { bold: true, breakLine: true } },
      { text: report.stories.costs },
    ],
    { x: 8.3, y: 1.8, w: 4.4, h: 4.8, fontSize: 13, color: INK, fontFace: FONT, valign: "top" },
  );

  // 3. Where the money went
  if (stats.byCategory.length) {
    const costs = base("Where the money went", "Spending by category");
    costs.addChart(
      pptx.ChartType.bar,
      // Horizontal bars draw the first category at the bottom, so reverse to put the biggest on top.
      [{ name: "Spent", labels: stats.byCategory.slice(0, 8).map((x) => x.name).reverse(), values: stats.byCategory.slice(0, 8).map((x) => x.amount).reverse() }],
      {
        x: 0.6, y: 1.8, w: 7.4, h: 4.8, barDir: "bar", chartColors: [CHART_COLORS.expense.slice(1)],
        showValue: true, dataLabelColor: INK, dataLabelFontSize: 11, dataLabelFormatCode: "#,##0",
        catAxisLabelColor: INK, valAxisHidden: true, valGridLine: { style: "none" },
      },
    );
    body(
      costs,
      `Fixed overheads: ${money(report.overheads)} a month${stats.income ? `, ${Math.round((report.overheads / stats.income) * 100)}% of this month's sales` : ""}.\n\n${report.stories.overheads}`,
      true,
    );
  }

  // 4. Profit
  const profit = base(`${money(stats.net)} ${stats.net >= 0 ? "kept" : "net loss"}`, "Profit");
  profit.addChart(
    pptx.ChartType.bar,
    [{ name: "Net", labels: history.map((h) => h.label), values: history.map((h) => h.net) }],
    {
      x: 0.6, y: 1.8, w: 7.4, h: 4.8, barDir: "col", chartColors: ["4ADE80"],
      catAxisLabelColor: MUTED, valAxisLabelColor: MUTED, valGridLine: { color: "26355E", size: 1 }, showLegend: false,
    },
  );
  body(profit, `${stats.margin !== null ? `Margin: ${Math.round(stats.margin * 100)}% of sales.\n\n` : ""}${report.stories.profit}`, true);

  // 5. Activities
  const acts = base("What you did, and what it did for sales", "Activities");
  if (report.activities.length) {
    acts.addTable(
      [
        ["Date", "Activity", "Sales/day before → after", "Effect", "Why"].map((h) => ({ text: h, options: { bold: true, color: GOLD } })),
        ...report.activities.map((a) =>
          [
            a.date,
            `${a.title} (${ACTIVITY_KINDS.find((k) => k.id === a.kind)?.label ?? ""})`,
            a.before !== null && a.after !== null ? `${money(a.before)} → ${money(a.after)}` : "Not enough data",
            VERDICT_LABEL[a.verdict],
            a.explanation,
          ].map((text) => ({ text })),
        ),
      ],
      { x: 0.6, y: 1.8, w: 12.1, colW: [1.3, 2.8, 2.2, 1.6, 4.2], fontSize: 11, color: INK, fontFace: FONT, border: { type: "solid", color: "26355E", pt: 1 }, valign: "top" },
    );
  } else {
    body(acts, "No launches, promotions, events or ads were logged this month.");
  }

  // 6. Problems and root causes (no solutions, by design)
  const probs = base(report.problems.length ? "Where it's leaking" : "No leaks spotted", "Problems and root causes");
  if (report.problems.length) {
    probs.addText(
      report.problems.flatMap((p) => [
        { text: p.title, options: { bold: true, fontSize: 16, color: GOLD, breakLine: true } },
        { text: `Root cause: ${p.rootCause}`, options: { fontSize: 13, breakLine: true } },
        { text: p.evidence || " ", options: { fontSize: 11, color: MUTED, breakLine: true } },
        { text: " ", options: { fontSize: 8, breakLine: true } },
      ]),
      { x: 0.6, y: 1.8, w: 12.1, h: 5, color: INK, fontFace: FONT, valign: "top" },
    );
  } else {
    body(probs, "Nothing worrying stood out this month.");
  }

  // 7. Closing
  const end = pptx.addSlide();
  end.background = { color: NAVY };
  end.addText(report.closing, { x: 1, y: 2.6, w: 11.3, h: 1.6, fontSize: 26, color: INK, fontFace: FONT, align: "center" });
  end.addText("Polaris · your North Star for business growth", { x: 1, y: 6.6, w: 11.3, h: 0.4, fontSize: 12, color: GOLD, fontFace: FONT, align: "center" });

  await pptx.writeFile({ fileName: `${profile.businessName} ${stats.label} Wrapped.pptx`.replace(/[\\/:*?"<>|]/g, "") });
}
