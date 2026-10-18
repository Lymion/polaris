import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import { MODELS, NO_THINKING, VISION_MODEL, nebius } from "@/lib/ai/nebius";
import { statementPrompt } from "@/lib/ai/prompts";
import { extractJson, sanitizeTransactions } from "@/lib/ai/shared";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";
import { guard } from "@/lib/server/guard";

// Hosts cap request bodies (Vercel at 4.5 MB), so files stay under that.
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_TEXT = 40_000;

/** Hides card numbers (12-19 digits, spaced or not) and account numbers (9+ digits) before any AI sees the text. */
function redact(text: string) {
  return text
    .replace(/\b(?:\d[ -]?){11,18}\d\b/g, "[card]")
    .replace(/\b\d{9,}\b/g, "[account]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]");
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    const v = value as { result?: unknown; text?: unknown; richText?: { text: string }[] };
    if (v.richText) return v.richText.map((r) => r.text).join("");
    if (v.text !== undefined) return String(v.text);
    if (v.result !== undefined) return cellText(v.result);
  }
  return String(value);
}

async function excelToText(buffer: ArrayBuffer) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const lines: string[] = [];
  workbook.eachSheet((sheet) => {
    sheet.eachRow((row) => {
      const cells = (row.values as unknown[]).slice(1).map(cellText).filter(Boolean);
      if (cells.length) lines.push(cells.join(" | "));
    });
  });
  return lines.join("\n");
}

async function pdfToText(buffer: ArrayBuffer) {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

async function imageToText(buffer: ArrayBuffer, mime: string) {
  const completion = await nebius().chat.completions.create({
    model: VISION_MODEL,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "This is a bank statement. Transcribe every transaction line as plain text, one per line: date | description | money out | money in. Include the statement period if shown. Do not include account numbers, card numbers or addresses. Output only the lines.",
          },
          { type: "image_url", image_url: { url: `data:${mime};base64,${Buffer.from(buffer).toString("base64")}` } },
        ],
      },
    ],
    temperature: 0,
    max_tokens: 4000,
  });
  return completion.choices[0]?.message?.content ?? "";
}

/**
 * Reads a bank statement (CSV, Excel, PDF or a photo) and returns categorised transactions.
 * Nothing is stored: the file lives in memory for this request only.
 */
export async function POST(req: Request) {
  const blocked = guard(req, { tier: "heavy", maxBytes: 4_500_000 });
  if (blocked) return blocked;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Upload a file." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Upload a file." }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "That file is over 4 MB. Try a CSV or a smaller PDF." }, { status: 413 });

  let meta: { currency?: string; month?: string; channels?: string[]; direct?: string } = {};
  try {
    meta = JSON.parse(String(form.get("meta") ?? "{}"));
  } catch {}
  const currency = typeof meta.currency === "string" ? meta.currency.slice(0, 3) : "USD";
  const month = typeof meta.month === "string" && /^\d{4}-\d{2}$/.test(meta.month) ? meta.month : undefined;
  const channels = (Array.isArray(meta.channels) ? meta.channels : []).filter((c): c is string => typeof c === "string").slice(0, 20);
  const direct = typeof meta.direct === "string" && channels.includes(meta.direct) ? meta.direct : undefined;

  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();
  let text = "";
  try {
    if (file.type.startsWith("image/") || /\.(png|jpe?g|webp)$/.test(name)) {
      text = await imageToText(buffer, file.type || "image/jpeg");
    } else if (file.type === "application/pdf" || name.endsWith(".pdf")) {
      text = await pdfToText(buffer);
    } else if (/\.xlsx?$/.test(name)) {
      text = await excelToText(buffer);
    } else {
      text = new TextDecoder().decode(buffer);
    }
  } catch (err) {
    console.error("[statement] could not read file", err);
    return Response.json({ error: "Couldn't read that file. Try exporting the statement as CSV or PDF." }, { status: 422 });
  }

  text = redact(text).trim().slice(0, MAX_TEXT);
  if (text.length < 20) {
    return Response.json({ error: "No transactions found in that file. Is it a scanned PDF? Try a photo or CSV instead." }, { status: 422 });
  }

  const request = {
    model: MODELS.smart,
    messages: [
      { role: "system", content: statementPrompt({ income: INCOME_CATEGORIES, expense: EXPENSE_CATEGORIES, channels, direct, currency, month }) },
      { role: "user", content: text },
    ],
    temperature: 0.1,
    max_tokens: 12000,
    response_format: { type: "json_object" },
    ...NO_THINKING,
  } as ChatCompletionCreateParamsNonStreaming;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const completion = await nebius().chat.completions.create(request);
      const transactions = sanitizeTransactions(
        extractJson(completion.choices[0]?.message?.content ?? ""),
        INCOME_CATEGORIES,
        EXPENSE_CATEGORIES,
        channels,
      );
      if (transactions.length) return Response.json({ transactions });
    } catch (err) {
      console.error(`[statement] attempt ${attempt + 1} failed`, err);
    }
  }
  return Response.json({ error: "Couldn't find transactions in that statement. Try a CSV export from your bank." }, { status: 502 });
}
