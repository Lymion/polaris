import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import { MODELS, nebius } from "@/lib/ai/nebius";
import { businessContext, moneyReviewPrompt, parseFacts } from "@/lib/ai/prompts";
import { extractJson, sanitizeMoneyReview } from "@/lib/ai/shared";
import type { BusinessProfile } from "@/lib/types";
import { guard } from "@/lib/server/guard";

interface MoneyReviewRequest {
  profile?: Partial<BusinessProfile>;
  facts?: unknown;
}

/**
 * Deep money check-up on Nemotron Ultra with reasoning on. Measured ~5s; noticeably stricter
 * and more specific than Super on the same numbers (it caught falling sales nearing overheads).
 */
export async function POST(req: Request) {
  const blocked = guard(req, { tier: "heavy" });
  if (blocked) return blocked;
  let body: MoneyReviewRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const profile = body.profile ?? {};
  const facts = parseFacts(body.facts);
  if (!facts.money) {
    return Response.json({ error: "Log some sales and costs first so there's something to check." }, { status: 400 });
  }

  const request = {
    model: MODELS.deep,
    messages: [
      { role: "system", content: moneyReviewPrompt(profile.mascotName?.trim() || "Lumi") },
      { role: "user", content: businessContext(profile, facts) },
    ],
    temperature: 0.3,
    max_tokens: 5000,
    response_format: { type: "json_object" },
  } as ChatCompletionCreateParamsNonStreaming;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const completion = await nebius().chat.completions.create(request);
      const review = sanitizeMoneyReview(extractJson(completion.choices[0]?.message?.content ?? ""));
      if (review) return Response.json(review);
    } catch (err) {
      console.error(`[treasury review] attempt ${attempt + 1} failed`, err);
    }
  }
  return Response.json({ error: "Couldn't finish your check-up right now. Try again in a moment." }, { status: 502 });
}
