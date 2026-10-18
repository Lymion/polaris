import type { Workbook, Worksheet } from "exceljs";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "./categories";
import { newId } from "./store";
import type { Activity, ActivityKind, SalesChannel, TreasuryEntry } from "./types";

// The month template: opens in Excel and Google Sheets (File → Import), and uploads back in.

const NAVY = "FF0B1B3F";
const GOLD = "FFF5B942";

export const ACTIVITY_KINDS: { id: ActivityKind; label: string }[] = [
  { id: "launch", label: "Product launch" },
  { id: "promotion", label: "Promotion" },
  { id: "event", label: "Event" },
  { id: "ads", label: "New ads" },
  { id: "other", label: "Other" },
];

/** Earlier templates had one mixed table; still read back in. */
const LEGACY_TX_HEADERS = ["Date", "Description", "Type", "Amount", "Category", "Sold through", "Note"];
const ACT_HEADERS = ["Date", "Type", "What happened", "Cost"];

// The "Money" sheet holds two tables side by side, so each grows downward on its own:
// money in (green) in columns A to E, money out (red) in G to J. Row 1 is the table's title bar
// with its total, row 2 the column headers, rows from 3 the data.
const IN_HEADERS = ["Date", "Description", "Amount", "Category", "Sold through"];
const OUT_HEADERS = ["Date", "Description", "Amount", "Category"];
const IN_COL = 1;
const OUT_COL = 7;
const FIRST_ROW = 3;

const GREEN = { dark: "FF15803D", head: "FFBBF7D0", band: "FFF0FDF4", line: "FF86EFAC", text: "FF14532D" };
const RED = { dark: "FFB91C1C", head: "FFFECACA", band: "FFFEF2F2", line: "FFFCA5A5", text: "FF7F1D1D" };
type Palette = typeof GREEN;

const solid = (argb: string) => ({ type: "pattern" as const, pattern: "solid" as const, fgColor: { argb } });
const colLetter = (col: number) => String.fromCharCode(64 + col);

/** Draws one colour-coded table: title bar with a running total, headers, then banded rows. */
function drawTable(
  sheet: Worksheet,
  opts: {
    col: number;
    title: string;
    headers: string[];
    widths: number[];
    colors: Palette;
    rows: (string | number | Date | null)[][];
    lastRow: number;
    /** A dropdown list formula per column, or null. */
    lists: (string | null)[];
  },
) {
  const { col, headers, colors } = opts;
  const lastCol = col + headers.length - 1;
  const amountCol = colLetter(col + 2);
  const thin = { style: "thin" as const, color: { argb: colors.line } };

  headers.forEach((_, i) => (sheet.getColumn(col + i).width = opts.widths[i]));

  sheet.mergeCells(1, col, 1, lastCol - 2);
  sheet.getCell(1, col).value = opts.title;
  sheet.getCell(1, lastCol - 1).value = "Total";
  sheet.getCell(1, lastCol - 1).alignment = { horizontal: "right", vertical: "middle" };
  sheet.getCell(1, lastCol).value = { formula: `SUM(${amountCol}${FIRST_ROW}:${amountCol}${opts.lastRow})` };
  sheet.getCell(1, lastCol).numFmt = "#,##0.00";
  for (let c = col; c <= lastCol; c++) {
    const cell = sheet.getCell(1, c);
    cell.fill = solid(colors.dark);
    cell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
    if (c === col) cell.alignment = { vertical: "middle", indent: 1 };
  }

  headers.forEach((h, i) => {
    const cell = sheet.getCell(2, col + i);
    cell.value = h;
    cell.fill = solid(colors.head);
    cell.font = { bold: true, color: { argb: colors.text } };
    cell.border = { bottom: { style: "medium", color: { argb: colors.dark } } };
    if (i === 2) cell.alignment = { horizontal: "right" };
  });

  for (let r = FIRST_ROW; r <= opts.lastRow; r++) {
    const values = opts.rows[r - FIRST_ROW];
    for (let i = 0; i < headers.length; i++) {
      const cell = sheet.getCell(r, col + i);
      if (values?.[i] !== undefined && values[i] !== null && values[i] !== "") cell.value = values[i];
      cell.fill = solid((r - FIRST_ROW) % 2 ? "FFFFFFFF" : colors.band);
      cell.border = { top: thin, bottom: thin, left: thin, right: thin };
      if (i === 0) cell.numFmt = "yyyy-mm-dd";
      if (i === 2) cell.numFmt = "#,##0.00";
      const list = opts.lists[i];
      if (list) cell.dataValidation = { type: "list", allowBlank: true, formulae: [list] };
    }
  }
}

function styleHeader(sheet: Worksheet) {
  const row = sheet.getRow(1);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  row.height = 22;
  row.alignment = { vertical: "middle" };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

function toLocalDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Builds and downloads the month's workbook, pre-filled with what's already logged. */
export async function downloadMonthWorkbook(opts: {
  month: string;
  monthLabel: string;
  business: string;
  currency: string;
  entries: TreasuryEntry[];
  activities: Activity[];
  channels: SalesChannel[];
}) {
  const ExcelJS = (await import("exceljs")).default;
  const wb: Workbook = new ExcelJS.Workbook();
  wb.creator = "Polaris";

  // Dropdown sources live on a hidden sheet: Excel caps inline lists at 255 characters.
  const lists = wb.addWorksheet("Lists", { state: "veryHidden" });
  INCOME_CATEGORIES.forEach((c, i) => (lists.getCell(i + 1, 1).value = c));
  EXPENSE_CATEGORIES.forEach((c, i) => (lists.getCell(i + 1, 2).value = c));
  opts.channels.forEach((c, i) => (lists.getCell(i + 1, 3).value = c.name));
  ACTIVITY_KINDS.forEach((k, i) => (lists.getCell(i + 1, 4).value = k.label));

  const money = wb.addWorksheet("Money", { properties: { defaultRowHeight: 18 } });
  const sorted = [...opts.entries].sort((a, b) => a.date.localeCompare(b.date));
  const income = sorted.filter((e) => e.type === "income");
  const expenses = sorted.filter((e) => e.type === "expense");
  // Both tables get the same length, with room to add rows under what's already logged.
  const lastRow = FIRST_ROW - 1 + Math.max(income.length + 40, expenses.length + 40, 60);

  drawTable(money, {
    col: IN_COL,
    title: `MONEY IN · ${opts.monthLabel}`,
    headers: IN_HEADERS,
    widths: [13, 32, 13, 20, 16],
    colors: GREEN,
    rows: income.map((e) => [toLocalDate(e.date), e.note || null, e.amount, e.category, e.channel ?? null]),
    lastRow,
    lists: [
      null,
      null,
      null,
      `Lists!$A$1:$A$${INCOME_CATEGORIES.length}`,
      opts.channels.length ? `Lists!$C$1:$C$${opts.channels.length}` : null,
    ],
  });
  money.getColumn(OUT_COL - 1).width = 3;
  drawTable(money, {
    col: OUT_COL,
    title: `MONEY OUT · ${opts.monthLabel}`,
    headers: OUT_HEADERS,
    widths: [13, 32, 13, 22],
    colors: RED,
    rows: expenses.map((e) => [toLocalDate(e.date), e.note || null, e.amount, e.category]),
    lastRow,
    lists: [null, null, null, `Lists!$B$1:$B$${EXPENSE_CATEGORIES.length}`],
  });
  money.getRow(1).height = 26;
  money.getRow(2).height = 20;
  money.views = [{ state: "frozen", ySplit: 2 }];

  const act = wb.addWorksheet("Activities");
  act.columns = [
    { header: ACT_HEADERS[0], key: "date", width: 13, style: { numFmt: "yyyy-mm-dd" } },
    { header: ACT_HEADERS[1], key: "type", width: 18 },
    { header: ACT_HEADERS[2], key: "title", width: 46 },
    { header: ACT_HEADERS[3], key: "cost", width: 12, style: { numFmt: "#,##0.00" } },
  ];
  styleHeader(act);
  for (const a of opts.activities) {
    act.addRow({ date: toLocalDate(a.date), type: ACTIVITY_KINDS.find((k) => k.id === a.kind)?.label ?? "Other", title: a.title, cost: a.cost || null });
  }
  for (let r = 2; r <= 40; r++) {
    act.getCell(r, 2).dataValidation = { type: "list", allowBlank: true, formulae: [`Lists!$D$1:$D$${ACTIVITY_KINDS.length}`] };
  }

  const help = wb.addWorksheet("How to fill");
  help.getColumn(1).width = 100;
  const lines = [
    `${opts.business}: ${opts.monthLabel} money sheet (${opts.currency})`,
    "",
    "1. Open your bank statement for the month next to this file.",
    "2. Money sheet, GREEN table (Money in): one row for every payment you received, like sales and payouts.",
    "3. Money sheet, RED table (Money out): one row for everything you paid, like stock, rent and ads.",
    "4. Date as YYYY-MM-DD. Amount is always positive. The totals at the top add up as you type.",
    "5. Category and Sold through: pick from the dropdowns, so Polaris can show where money comes from and goes.",
    "6. Activities: note anything you did to grow sales this month: launches, promotions, events, new ads.",
    "7. Save, then upload it back in Polaris: Treasury → Overview → Lumi's helper → Excel template → Upload filled.",
    "",
    "Using Google Sheets? Open Google Drive → New → File upload, open this file with Google Sheets,",
    "then download it again as Microsoft Excel (.xlsx) when you're done.",
    "",
    "Short on time? Skip this and upload your bank statement in Polaris instead. Lumi will fill the sheet for you.",
  ];
  lines.forEach((l, i) => (help.getCell(i + 1, 1).value = l));
  help.getCell(1, 1).font = { bold: true, size: 14, color: { argb: NAVY } };
  help.getCell(1, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: GOLD } };
  wb.views = [{ x: 0, y: 0, width: 10000, height: 20000, firstSheet: 0, activeTab: 1, visibility: "visible" }];

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Polaris ${opts.business} ${opts.month}.xlsx`.replace(/[\\/:*?"<>|]/g, "");
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function readCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    const v = value as { result?: unknown; text?: unknown; richText?: { text: string }[] };
    if (v.richText) return v.richText.map((r) => r.text).join("");
    if (v.result !== undefined) return readCell(v.result);
    if (v.text !== undefined) return String(v.text);
  }
  return String(value).trim();
}

/** Accepts YYYY-MM-DD, DD/MM/YYYY or DD-MM-YYYY. */
function normaliseDate(raw: string) {
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const m = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
}

/**
 * Reads a Polaris month workbook back in. Returns null when the file isn't our template,
 * so the caller can treat it as a bank statement instead.
 */
export async function readMonthWorkbook(file: File) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());

  const entries: TreasuryEntry[] = [];
  /** Rows with something in them but no usable date or amount, e.g. "money in row 7". */
  const skipped: string[] = [];

  const money = wb.getWorksheet("Money");
  const legacy = wb.getWorksheet("Transactions");
  if (money && readCell(money.getCell(2, IN_COL).value) === "Date" && readCell(money.getCell(2, OUT_COL).value) === "Date") {
    readTable(money, IN_COL, "income", entries, skipped);
    readTable(money, OUT_COL, "expense", entries, skipped);
  } else if (legacy && readCell(legacy.getCell(1, 1).value) === "Date" && readCell(legacy.getCell(1, 3).value) === "Type") {
    readLegacyTable(legacy, entries, skipped);
  } else {
    return null;
  }

  const activities: Activity[] = [];
  wb.getWorksheet("Activities")?.eachRow((row, n) => {
    if (n === 1) return;
    const cells = ACT_HEADERS.map((_, i) => readCell(row.getCell(i + 1).value));
    const date = normaliseDate(cells[0]);
    if (!date || !cells[2]) return;
    activities.push({
      id: newId(),
      date,
      kind: ACTIVITY_KINDS.find((k) => k.label === cells[1])?.id ?? "other",
      title: cells[2].slice(0, 120),
      cost: Number(cells[3].replace(/[^\d.]/g, "")) || 0,
    });
  });

  return { entries, activities, skipped };
}

/** One of the Money sheet's tables: the type comes from which table the row is in. */
function readTable(sheet: Worksheet, col: number, type: TreasuryEntry["type"], entries: TreasuryEntry[], skipped: string[]) {
  const headers = type === "income" ? IN_HEADERS : OUT_HEADERS;
  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  for (let r = FIRST_ROW; r <= sheet.rowCount; r++) {
    const cells = headers.map((_, i) => readCell(sheet.getCell(r, col + i).value));
    if (cells.every((c) => !c)) continue;
    const date = normaliseDate(cells[0]);
    const amount = Number(cells[2].replace(/[^\d.-]/g, ""));
    if (!date || !(Math.abs(amount) > 0)) {
      skipped.push(`${type === "income" ? "money in" : "money out"} row ${r}`);
      continue;
    }
    entries.push({
      id: newId(),
      type,
      category: categories.includes(cells[3]) ? cells[3] : type === "income" ? "Other income" : "Other",
      amount: Math.round(Math.abs(amount) * 100) / 100,
      date,
      note: cells[1].slice(0, 120),
      channel: type === "income" && cells[4] ? cells[4] : undefined,
    });
  }
}

function readLegacyTable(tx: Worksheet, entries: TreasuryEntry[], skipped: string[]) {
  const allCategories = new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]);
  tx.eachRow((row, n) => {
    if (n === 1) return;
    const cells = LEGACY_TX_HEADERS.map((_, i) => readCell(row.getCell(i + 1).value));
    if (cells.every((c) => !c)) return;
    const date = normaliseDate(cells[0]);
    const amount = Number(cells[3].replace(/[^\d.-]/g, ""));
    const type = /in/i.test(cells[2]) ? "income" : /out/i.test(cells[2]) ? "expense" : null;
    if (!date || !type || !(Math.abs(amount) > 0)) {
      skipped.push(`row ${n}`);
      return;
    }
    const category = allCategories.has(cells[4]) ? cells[4] : type === "income" ? "Other income" : "Other";
    entries.push({
      id: newId(),
      type,
      category,
      amount: Math.round(Math.abs(amount) * 100) / 100,
      date,
      note: [cells[1], cells[6]].filter(Boolean).join(" · ").slice(0, 120),
      channel: type === "income" && cells[5] ? cells[5] : undefined,
    });
  });
}
