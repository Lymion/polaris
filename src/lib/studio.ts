// Creative Studio: station list, the shape of each tool's AI output, and validators.
// Shared by the API route and the UI (no server-only imports).

export type StationId = "brand" | "campaign" | "video" | "calendar" | "library";
export type StudioTool = Exclude<StationId, "library">;

export const STATIONS: { id: StationId; name: string; blurb: string }[] = [
  { id: "brand", name: "Brand desk", blurb: "Names, slogans, voice, colours and your story" },
  { id: "campaign", name: "Campaign board", blurb: "Promotions with the hook, offer and plan" },
  { id: "video", name: "Video booth", blurb: "Short-video ideas with hooks and shot lists" },
  { id: "calendar", name: "Content calendar", blurb: "A week of posts, planned for you" },
  { id: "library", name: "Idea library", blurb: "Everything you've saved" },
];

export interface BrandKit {
  names: { name: string; why: string }[];
  slogans: string[];
  voice: { traits: string[]; doSay: string[]; dontSay: string[] } | null;
  palette: { name: string; hex: string; use: string }[];
  story: string;
}

export interface Campaign {
  name: string;
  bigIdea: string;
  offer: string;
  hook: string;
  channels: { channel: string; action: string }[];
  timeline: { when: string; task: string }[];
  budget: string;
  /** Numbers to track to see if it worked. */
  watch: string[];
}

export interface VideoIdea {
  title: string;
  format: string;
  hook: string;
  concept: string;
  shots: string[];
  script: string;
  caption: string;
  hashtags: string[];
}

export interface PlannedPost {
  date: string;
  platform: string;
  format: string;
  idea: string;
  caption: string;
  hashtags: string[];
}

export type StudioOutput =
  | { tool: "brand"; brand: BrandKit }
  | { tool: "campaign"; campaigns: Campaign[] }
  | { tool: "video"; ideas: VideoIdea[] }
  | { tool: "calendar"; posts: PlannedPost[] };

/** Something saved to the Idea library. */
export interface StudioItem {
  id: string;
  createdAt: string;
  title: string;
  output: StudioOutput;
}

const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const list = (v: unknown, n: number, max: number) =>
  (Array.isArray(v) ? v : []).map((x) => s(x, max)).filter(Boolean).slice(0, n);
const objs = (v: unknown, n: number) =>
  (Array.isArray(v) ? v : []).filter((x): x is Record<string, unknown> => !!x && typeof x === "object").slice(0, n);

export function sanitizeStudio(tool: StudioTool, raw: unknown): StudioOutput | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  switch (tool) {
    case "brand": {
      const v = (o.voice ?? null) as Record<string, unknown> | null;
      const brand: BrandKit = {
        names: objs(o.names, 8).map((n) => ({ name: s(n.name, 40), why: s(n.why, 160) })).filter((n) => n.name),
        slogans: list(o.slogans, 8, 120),
        voice: v ? { traits: list(v.traits, 4, 30), doSay: list(v.doSay, 4, 120), dontSay: list(v.dontSay, 4, 120) } : null,
        palette: objs(o.palette, 6)
          .map((p) => ({ name: s(p.name, 30), hex: s(p.hex, 7).toUpperCase(), use: s(p.use, 80) }))
          .filter((p) => /^#[0-9A-F]{6}$/.test(p.hex)),
        story: s(o.story, 900),
      };
      const empty = !brand.names.length && !brand.slogans.length && !brand.voice && !brand.palette.length && !brand.story;
      return empty ? null : { tool, brand };
    }
    case "campaign": {
      const campaigns = objs(o.campaigns, 3)
        .map((c) => ({
          name: s(c.name, 60),
          bigIdea: s(c.bigIdea, 300),
          offer: s(c.offer, 200),
          hook: s(c.hook, 160),
          channels: objs(c.channels, 5).map((x) => ({ channel: s(x.channel, 30), action: s(x.action, 200) })).filter((x) => x.channel),
          timeline: objs(c.timeline, 8).map((x) => ({ when: s(x.when, 30), task: s(x.task, 160) })).filter((x) => x.task),
          budget: s(c.budget, 400),
          watch: list(c.watch, 4, 120),
        }))
        .filter((c) => c.name && c.bigIdea);
      return campaigns.length ? { tool, campaigns } : null;
    }
    case "video": {
      const ideas = objs(o.ideas, 4)
        .map((i) => ({
          title: s(i.title, 70),
          format: s(i.format, 40),
          hook: s(i.hook, 160),
          concept: s(i.concept, 300),
          shots: list(i.shots, 8, 140),
          script: s(i.script, 900),
          caption: s(i.caption, 400),
          hashtags: list(i.hashtags, 6, 30).map((h) => (h.startsWith("#") ? h : `#${h}`).replace(/\s+/g, "")),
        }))
        .filter((i) => i.title && i.hook);
      return ideas.length ? { tool, ideas } : null;
    }
    case "calendar": {
      const posts = objs(o.posts, 14)
        .map((p) => ({
          date: s(p.date, 10),
          platform: s(p.platform, 30),
          format: s(p.format, 30),
          idea: s(p.idea, 200),
          caption: s(p.caption, 500),
          hashtags: list(p.hashtags, 6, 30).map((h) => (h.startsWith("#") ? h : `#${h}`).replace(/\s+/g, "")),
        }))
        .filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.date) && p.idea);
      return posts.length ? { tool, posts: posts.sort((a, b) => a.date.localeCompare(b.date)) } : null;
    }
  }
}
