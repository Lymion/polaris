import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import { MODELS, NO_THINKING, nebius } from "@/lib/ai/nebius";
import { businessContext, parseFacts, reviewPrompt } from "@/lib/ai/prompts";
import { extractJson, sanitizeReview } from "@/lib/ai/shared";
import type { BusinessProfile } from "@/lib/types";
import { guard } from "@/lib/server/guard";

interface ReviewRequest {
  mission: { title?: string; description?: string; steps?: string[] };
  answers: { question?: string; answer?: string }[];
  profile?: Partial<BusinessProfile>;
  facts?: unknown;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Reviews a mission report: was the mission genuinely done? Returns feedback and facts to remember. */
export async function POST(req: Request) {
  const blocked = guard(req);
  if (blocked) return blocked;
  let body: ReviewRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = str(body.mission?.title, 120);
  const answers = (Array.isArray(body.answers) ? body.answers : [])
    .map((a) => ({ question: str(a?.question, 200), answer: str(a?.answer, 1000) }))
    .filter((a) => a.question)
    .slice(0, 5);
  if (!title || answers.length === 0) return Response.json({ error: "Missing mission or answers" }, { status: 400 });

  const profile = body.profile ?? {};
  const steps = (Array.isArray(body.mission.steps) ? body.mission.steps : []).map((s) => str(s, 220)).filter(Boolean);
  const report = [
    `Mission: ${title}`,
    body.mission.description && `Why it matters: ${str(body.mission.description, 300)}`,
    steps.length && `Steps:\n- ${steps.join("\n- ")}`,
    `Their report:\n${answers.map((a) => `Q: ${a.question}\nA: ${a.answer || "(no answer)"}`).join("\n\n")}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const request = {
    model: MODELS.smart,
    messages: [
      {
        role: "system",
        content: [reviewPrompt(profile.mascotName?.trim() || "Lumi"), businessContext(profile, parseFacts(body.facts))]
          .filter(Boolean)
          .join("\n\n"),
      },
      { role: "user", content: report },
    ],
    temperature: 0.3,
    max_tokens: 800,
    response_format: { type: "json_object" },
    ...NO_THINKING,
  } as ChatCompletionCreateParamsNonStreaming;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const completion = await nebius().chat.completions.create(request);
      const review = sanitizeReview(extractJson(completion.choices[0]?.message?.content ?? ""));
      if (review) return Response.json(review.verdict === "not_yet" ? { ...review, insights: [] } : review);
    } catch (err) {
      console.error(`[review] attempt ${attempt + 1} failed`, err);
    }
  }
  return Response.json({ error: "Couldn't review your report right now. Try again in a moment." }, { status: 502 });
}
