import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import { MODELS, NO_THINKING, nebius } from "@/lib/ai/nebius";
import { SHEET_CHECK_PROMPT, categorisePrompt } from "@/lib/ai/prompts";
import { extractJson } from "@/lib/ai/shared";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";
import { guard } from "@/lib/server/guard";

interface Row {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  channel?: string;
}

interface SheetRequest {
  mode: "categorise" | "check";
  rows: Row[];
  channels?: string[];
  currency?: string;
}

/** Lumi's sheet helpers: categorise rows, or check the month for mistakes. */
export async function POST(req: Request) {
  const blocked = guard(req);
  if (blocked) return blocked;
  let body: SheetRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body.mode !== "categorise" && body.mode !== "check") return Response.json({ error: "Unknown mode" }, { status: 400 });

  const rows = (Array.isArray(body.rows) ? body.rows : []).slice(0, 300).map((r) => ({
    id: String(r.id).slice(0, 60),
    date: String(r.date).slice(0, 10),
    description: String(r.description ?? "").slice(0, 120),
    amount: Number(r.amount) || 0,
    type: r.type === "income" ? "income" : "expense",
    category: String(r.category ?? "").slice(0, 40),
    channel: String(r.channel ?? "").slice(0, 40),
  }));
  if (!rows.length) return Response.json({ error: "The sheet is empty." }, { status: 400 });
  const channels = (Array.isArray(body.channels) ? body.channels : []).filter((c) => typeof c === "string").slice(0, 20);
  const ids = new Set(rows.map((r) => r.id));

  const request = {
    model: MODELS.smart,
    messages: [
      {
        role: "system",
        content: body.mode === "check" ? SHEET_CHECK_PROMPT : categorisePrompt(INCOME_CATEGORIES, EXPENSE_CATEGORIES, channels),
      },
      { role: "user", content: `Currency: ${String(body.currency ?? "").slice(0, 3)}\nRows:\n${JSON.stringify(rows)}` },
    ],
    temperature: 0.1,
    max_tokens: 6000,
    response_format: { type: "json_object" },
    ...NO_THINKING,
  } as ChatCompletionCreateParamsNonStreaming;

  try {
    const completion = await nebius().chat.completions.create(request);
    const data = extractJson(completion.choices[0]?.message?.content ?? "") as Record<string, unknown> | null;
    if (!data) throw new Error("No JSON");

    if (body.mode === "check") {
      const flags = (Array.isArray(data.flags) ? data.flags : [])
        .map((f) => f as Record<string, unknown>)
        .filter((f) => typeof f.id === "string" && ids.has(f.id) && typeof f.issue === "string")
        .map((f) => ({ id: f.id as string, issue: (f.issue as string).slice(0, 200) }))
        .slice(0, 30);
      return Response.json({ flags, summary: typeof data.summary === "string" ? data.summary.slice(0, 240) : "" });
    }

    const byType = new Map(rows.map((r) => [r.id, r.type]));
    const updates = (Array.isArray(data.rows) ? data.rows : [])
      .map((u) => u as Record<string, unknown>)
      .filter((u) => typeof u.id === "string" && ids.has(u.id))
      .map((u) => {
        const type = byType.get(u.id as string);
        const allowed = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
        return {
          id: u.id as string,
          category: typeof u.category === "string" && allowed.includes(u.category) ? u.category : undefined,
          channel: type === "income" && typeof u.channel === "string" && channels.includes(u.channel) ? u.channel : undefined,
        };
      });
    return Response.json({ updates });
  } catch (err) {
    console.error(`[sheet] ${body.mode} failed`, err);
    return Response.json({ error: "Lumi couldn't finish that just now. Try again in a moment." }, { status: 502 });
  }
}
