// Front-door checks for the AI endpoints, run at the top of every route that calls Nebius:
//   1. only Polaris's own pages may call them (a page on another site is refused),
//   2. request bodies stay small,
//   3. each visitor gets a fair share of AI calls, with a daily backstop for everyone together,
//      so nobody can run up the Nebius bill by scripting requests.
//
// The counts live in this server instance's memory. On a host that runs several instances each
// keeps its own, so treat this as the first line of defence: also set a spending limit in the
// Nebius console, and a rate-limit rule in the host's firewall when deploying (see SECURITY.md).

type Tier = "standard" | "heavy";

/** Calls per visitor. "heavy" is for the big models and file reading (Ultra reviews, Wrapped, statements). */
const RULES: Record<Tier, { perMinute: number; perDay: number }> = {
  standard: { perMinute: 12, perDay: 300 },
  heavy: { perMinute: 4, perDay: 40 },
};

/** Calls from everyone together per server instance per day. Override with POLARIS_DAILY_AI_CAP. */
const DAILY_CAP = Number(process.env.POLARIS_DAILY_AI_CAP) || 3000;

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** Running on this computer (development, the simulation harness): no per-visitor limits. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

const hits = new Map<string, number[]>();
let today = { start: Date.now(), count: 0 };

function clientIp(req: Request) {
  // Hosts such as Vercel set x-real-ip themselves; behind other proxies the first forwarded address is the client.
  return req.headers.get("x-real-ip")?.trim() || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function deny(status: number, error: string, retryAfterSeconds?: number) {
  return Response.json(
    { error },
    { status, headers: { "Cache-Control": "no-store", ...(retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : {}) } },
  );
}

/** Forgets visitors with nothing in the last day, so the table can't grow without end. */
function prune(now: number) {
  for (const [key, list] of hits) {
    if (!list.length || now - list[list.length - 1] > DAY) hits.delete(key);
  }
  if (hits.size > 20_000) hits.clear();
}

/**
 * Returns a ready error response when the request should not reach the AI, or null to carry on.
 * `maxBytes` is the largest body accepted (default 300 KB).
 */
export function guard(req: Request, { tier = "standard", maxBytes = 300_000 }: { tier?: Tier; maxBytes?: number } = {}): Response | null {
  const url = new URL(req.url);

  // 1. Same site only. Browsers say where a request comes from; a page elsewhere can't fake it.
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  if (origin) {
    let sameSite = false;
    try {
      sameSite = new URL(origin).host === host;
    } catch {}
    if (!sameSite) return deny(403, "This can only be used from the Polaris app.");
  }
  if (req.headers.get("sec-fetch-site") === "cross-site") return deny(403, "This can only be used from the Polaris app.");

  // 2. Size. Bodies sent without a length are still capped by the host (4.5 MB on Vercel).
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > maxBytes) return deny(413, "That's too much to send in one go. Try a smaller file or a shorter message.");

  // 3. Fair use. Whether this is "this computer" comes from the Host header the request arrived
  // with (Next builds req.url from its own address). A visitor on the internet can't reach a
  // deployed site with Host: localhost, since the host routes requests by that header.
  const arrivedAt = (req.headers.get("host") ?? "").replace(/:\d+$/, "").toLowerCase();
  if (LOCAL_HOSTS.has(arrivedAt)) return null;
  const now = Date.now();
  if (now - today.start > DAY) today = { start: now, count: 0 };
  if (today.count >= DAILY_CAP) return deny(503, "Polaris has used up today's AI help. Try again tomorrow.", 3600);

  const key = `${tier}:${clientIp(req)}`;
  const list = (hits.get(key) ?? []).filter((t) => now - t < DAY);
  const lastMinute = list.filter((t) => now - t < MINUTE).length;
  if (lastMinute >= RULES[tier].perMinute) {
    hits.set(key, list);
    return deny(429, "You're going a bit fast. Give it a minute and try again.", 60);
  }
  if (list.length >= RULES[tier].perDay) {
    hits.set(key, list);
    return deny(429, "You've used today's AI help on this connection. Try again tomorrow.", 3600);
  }
  list.push(now);
  hits.set(key, list);
  today.count++;
  if (hits.size > 5000) prune(now);
  return null;
}
