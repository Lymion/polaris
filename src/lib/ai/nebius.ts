import OpenAI from "openai";

/**
 * NVIDIA Nemotron models served by Nebius Token Factory.
 * fast: quick, cheap replies. smart: the advisor's main brain. deep: heavy financial analysis.
 */
export const MODELS = {
  fast: "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
  smart: "nvidia/nemotron-3-super-120b-a12b",
  deep: "nvidia/Nemotron-3-Ultra-550b-a55b",
} as const;

export type ModelTier = keyof typeof MODELS;

/**
 * Reads photos and scans of bank statements. No NVIDIA vision model is available on Token
 * Factory, so an open Gemma 3 model transcribes the image and Nemotron does the rest.
 */
export const VISION_MODEL = "google/gemma-3-27b-it";

/**
 * Nemotron reasons before answering by default. Turning it off roughly halves latency
 * (measured ~5s vs ~10s for a 5-mission questline on Super) with similar output quality.
 * Not part of the OpenAI types, so callers spread it into the request and cast.
 */
export const NO_THINKING = { chat_template_kwargs: { enable_thinking: false } };

let client: OpenAI | null = null;

/** Server-only Nebius client. The key comes from NEBIUS_API_KEY and never reaches the browser. */
export function nebius() {
  if (!process.env.NEBIUS_API_KEY) {
    throw new Error("NEBIUS_API_KEY is not set. Add it to .env.local.");
  }
  client ??= new OpenAI({
    apiKey: process.env.NEBIUS_API_KEY,
    baseURL: process.env.NEBIUS_BASE_URL ?? "https://api.tokenfactory.nebius.com/v1/",
  });
  return client;
}
