import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import { MODELS, NO_THINKING, nebius } from "@/lib/ai/nebius";
import { businessContext, parseFacts, studioPrompt } from "@/lib/ai/prompts";
import { extractJson } from "@/lib/ai/shared";
import { sanitizeStudio, type StudioTool } from "@/lib/studio";
import type { BusinessProfile } from "@/lib/types";
import { guard } from "@/lib/server/guard";

const TOOLS: StudioTool[] = ["brand", "campaign", "video", "calendar"];

interface StudioRequest {
  tool: StudioTool;
  input?: Record<string, unknown>;
  profile?: Partial<BusinessProfile>;
  facts?: unknown;
}

/** Keeps only short strings, numbers and short string lists from the user's choices. */
function cleanInput(raw: unknown) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries((raw ?? {}) as Record<string, unknown>).slice(0, 12)) {
    if (typeof v === "string") out[k] = v.slice(0, 300);
    else if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (Array.isArray(v)) out[k] = v.filter((x) => typeof x === "string").slice(0, 10).map((x: string) => x.slice(0, 60));
  }
  return out;
}

/** Creative Studio generator: brand pieces, campaigns, video ideas or a week of posts, as JSON. */
export async function POST(req: Request) {
  const blocked = guard(req);
  if (blocked) return blocked;
  let body: StudioRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!TOOLS.includes(body.tool)) return Response.json({ error: "Unknown tool" }, { status: 400 });

  const input = cleanInput(body.input);
  const request = {
    model: MODELS.smart,
    messages: [
      { role: "system", content: studioPrompt(body.tool, input) },
      { role: "user", content: businessContext(body.profile ?? {}, parseFacts(body.facts)) || "A small business." },
    ],
    // Higher than the analytical routes for creative ideas, but at 0.9 the JSON sometimes broke
    // part-way (a campaign lost its budget and "watch" fields).
    temperature: 0.75,
    max_tokens: 5000,
    response_format: { type: "json_object" },
    ...NO_THINKING,
  } as ChatCompletionCreateParamsNonStreaming;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const completion = await nebius().chat.completions.create(request);
      let output = sanitizeStudio(body.tool, extractJson(completion.choices[0]?.message?.content ?? ""));
      // The brand desk returns only the pieces that were asked for, even if the model adds more.
      if (output?.tool === "brand" && Array.isArray(input.parts)) {
        const want = new Set(input.parts as string[]);
        const b = output.brand;
        output = {
          tool: "brand",
          brand: {
            names: want.has("names") ? b.names : [],
            slogans: want.has("slogans") ? b.slogans : [],
            voice: want.has("voice") ? b.voice : null,
            palette: want.has("palette") ? b.palette : [],
            story: want.has("story") ? b.story : "",
          },
        };
      }
      // A broken reply can still parse with only one plan; ask once more before settling for it.
      const short = output?.tool === "campaign" && output.campaigns.length < 2;
      if (output && (!short || attempt === 1)) return Response.json(output);
    } catch (err) {
      console.error(`[studio] ${body.tool} attempt ${attempt + 1} failed`, err);
    }
  }
  return Response.json({ error: "The studio couldn't come up with ideas just now. Try again in a moment." }, { status: 502 });
}
