import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import { MODELS, nebius } from "@/lib/ai/nebius";
import { businessContext, monthReportPrompt, parseFacts } from "@/lib/ai/prompts";
import { extractJson, sanitizeMonthReport } from "@/lib/ai/shared";
import type { BusinessProfile } from "@/lib/types";
import { guard } from "@/lib/server/guard";

interface MonthReportRequest {
  profile?: Partial<BusinessProfile>;
  facts?: unknown;
  /** Plain-text month data prepared in the browser: this month, earlier months, activities with sales lift. */
  month?: string;
}

/**
 * Writes the "Month Wrapped" story with Nemotron Ultra (reasoning on): links activities to
 * sales and pinpoints root causes of problems, deliberately without suggesting solutions.
 */
export async function POST(req: Request) {
  const blocked = guard(req, { tier: "heavy" });
  if (blocked) return blocked;
  let body: MonthReportRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const month = typeof body.month === "string" ? body.month.slice(0, 8000) : "";
  if (!month) return Response.json({ error: "Missing month data" }, { status: 400 });
  const profile = body.profile ?? {};

  const request = {
    model: MODELS.deep,
    messages: [
      { role: "system", content: monthReportPrompt(profile.mascotName?.trim() || "Lumi") },
      { role: "user", content: [businessContext(profile, parseFacts(body.facts)), month].filter(Boolean).join("\n\n") },
    ],
    temperature: 0.4,
    max_tokens: 6000,
    response_format: { type: "json_object" },
  } as ChatCompletionCreateParamsNonStreaming;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const completion = await nebius().chat.completions.create(request);
      const report = sanitizeMonthReport(extractJson(completion.choices[0]?.message?.content ?? ""));
      if (report) return Response.json(report);
    } catch (err) {
      console.error(`[month report] attempt ${attempt + 1} failed`, err);
    }
  }
  return Response.json({ error: "Couldn't write your month story right now. Try again in a moment." }, { status: 502 });
}
