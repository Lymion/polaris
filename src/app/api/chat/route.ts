import type { ChatCompletionCreateParamsStreaming } from "openai/resources/chat/completions";
import { MODELS, NO_THINKING, nebius, type ModelTier } from "@/lib/ai/nebius";
import { advisorPrompt, businessContext, parseFacts } from "@/lib/ai/prompts";
import type { BusinessProfile } from "@/lib/types";
import { guard } from "@/lib/server/guard";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  profile?: Partial<BusinessProfile>;
  /** Plain-text summary of the user's missions and cashflow, built in the browser. */
  snapshot?: string;
  /** Reported numbers, sales and level progress. */
  facts?: unknown;
  /** What the user is looking at, e.g. "Missions page, viewing mission: Register with SSM". */
  page?: string;
  tier?: ModelTier;
}

const MAX_MESSAGES = 30;
const MAX_CHARS = 8000;

/** Streams the advisor's reply as plain text. */
export async function POST(req: Request) {
  const blocked = guard(req);
  if (blocked) return blocked;
  let body: ChatRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return Response.json({ error: "Send at least one user message" }, { status: 400 });
  }

  const tier: ModelTier = body.tier && body.tier in MODELS ? body.tier : "smart";
  const profile = body.profile ?? {};
  const snapshot = typeof body.snapshot === "string" ? body.snapshot.slice(0, 2000) : "";
  const page = typeof body.page === "string" ? body.page.slice(0, 300) : "";
  const system = [
    advisorPrompt(profile.mascotName?.trim() || "Lumi"),
    businessContext(profile, parseFacts(body.facts)),
    snapshot && `Their missions right now:\n${snapshot}`,
    page && `Where they are in the app right now: ${page}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  let completion;
  try {
    completion = await nebius().chat.completions.create({
      model: MODELS[tier],
      messages: [{ role: "system", content: system }, ...messages],
      temperature: 0.6,
      max_tokens: 1200,
      stream: true,
      ...NO_THINKING,
    } as ChatCompletionCreateParamsStreaming);
  } catch (err) {
    console.error("[chat] Nebius request failed", err);
    return Response.json({ error: "The advisor is unavailable right now. Try again in a moment." }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of completion) {
          const text = chunk.choices[0]?.delta?.content;
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      } catch (err) {
        console.error("[chat] stream failed", err);
        controller.error(err);
      }
    },
    cancel() {
      completion.controller.abort();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
