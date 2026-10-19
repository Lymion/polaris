import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import { MODELS, NO_THINKING, nebius } from "@/lib/ai/nebius";
import { MISSIONS_PROMPT, businessContext, missionRequest, parseFacts, type MissionMode } from "@/lib/ai/prompts";
import { FOUNDATION_IDS, extractJson, sanitizeMissions, type GeneratedMission } from "@/lib/ai/shared";
import type { BusinessProfile, Foundation } from "@/lib/types";
import { guard } from "@/lib/server/guard";

interface MissionsRequest {
  mode: MissionMode;
  profile?: Partial<BusinessProfile>;
  /** The advice to convert (mode "advice") or the user's idea (mode "custom"). */
  text?: string;
  /** Titles of missions the user already has, to avoid duplicates. */
  existing?: string[];
  /** Basics that are missing and have no mission yet. Only these may be claimed by new missions. */
  gaps?: string[];
  /** Reported numbers, sales and level progress. */
  facts?: unknown;
  /** The next level's sales milestone, e.g. "RM4,400 in total sales". */
  nextGate?: string;
  /** Advice: the most missions to make (what's left under the open-mission limit). */
  max?: number;
}

const MODES: MissionMode[] = ["starter", "foundations", "growth", "advice", "custom"];

/** Minimum useful result per mode; fewer triggers one retry. */
const ENOUGH: Record<MissionMode, number> = { starter: 4, foundations: 1, growth: 2, advice: 1, custom: 1 };

/** Generates missions as JSON with Nemotron. */
export async function POST(req: Request) {
  const blocked = guard(req);
  if (blocked) return blocked;
  let body: MissionsRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!MODES.includes(body.mode)) return Response.json({ error: "Unknown mode" }, { status: 400 });
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 4000) : "";
  if ((body.mode === "advice" || body.mode === "custom") && !text) {
    return Response.json({ error: "Missing text" }, { status: 400 });
  }

  const gaps = (Array.isArray(body.gaps) ? body.gaps : []).filter((g): g is Foundation =>
    FOUNDATION_IDS.includes(g as Foundation),
  );
  if (body.mode === "foundations" && gaps.length === 0) {
    return Response.json({ error: "Every basic already has a mission." }, { status: 400 });
  }

  const profile = body.profile ?? {};
  const facts = parseFacts(body.facts);
  const existing = (Array.isArray(body.existing) ? body.existing : [])
    .filter((t): t is string => typeof t === "string")
    .slice(0, 40)
    .map((t) => t.slice(0, 80));
  const nextGate = typeof body.nextGate === "string" ? body.nextGate.slice(0, 80) : null;
  // Advice makes 1 to 3 missions, fewer when the owner has little room left.
  const max = Math.min(3, Math.max(1, Math.floor(Number(body.max) || 3)));

  const request = {
    model: MODELS.smart,
    messages: [
      { role: "system", content: [MISSIONS_PROMPT, businessContext(profile, facts)].filter(Boolean).join("\n\n") },
      { role: "user", content: missionRequest(body.mode, { text, profile, existing, gaps, nextGate, max }) },
    ],
    temperature: 0.7,
    max_tokens: 3500,
    response_format: { type: "json_object" },
    ...NO_THINKING,
  } as ChatCompletionCreateParamsNonStreaming;

  let best: GeneratedMission[] = [];

  // One retry: an occasional reply is cut off, not valid JSON, or too short.
  for (let attempt = 0; attempt < 2 && best.length < ENOUGH[body.mode]; attempt++) {
    try {
      const completion = await nebius().chat.completions.create(request);
      let missions = sanitizeMissions(extractJson(completion.choices[0]?.message?.content ?? ""), gaps);
      // Growth missions must not set up basics, even if the model tags one.
      if (body.mode === "growth") missions = missions.map((m) => ({ ...m, foundations: [] }));
      if (missions.length > best.length) best = missions;
    } catch (err) {
      console.error(`[missions] attempt ${attempt + 1} failed`, err);
    }
  }

  if (best.length === 0) {
    return Response.json({ error: "Couldn't plan missions right now. Try again in a moment." }, { status: 502 });
  }
  return Response.json({ missions: body.mode === "custom" ? best.slice(0, 1) : body.mode === "advice" ? best.slice(0, max) : best });
}
