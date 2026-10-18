// Runs the Polaris business simulation (see simulate.ts) against a running Polaris server.
//
//   node scripts/simulation/run.mjs [--months 6] [--seed 1] [--base http://localhost:3001] [--baseline-only]
//
// The app's own browser-side code runs here in Node, so before loading it this sets up what a
// browser would have: a clock (moved month by month), localStorage, and fetch that reaches the
// server. The Nebius key is read from .env.local for the simulated owner's own decisions.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const config = {
  months: Number(opt("months", "6")),
  seed: Number(opt("seed", "1")),
  base: opt("base", "http://localhost:3001"),
  baselineOnly: args.includes("--baseline-only"),
  out: resolve(root, "scripts/simulation/results"),
};

// Only the Nebius settings, and never printed.
for (const line of readFileSync(resolve(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*(NEBIUS_[A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

// A clock the simulation can move: `new Date()` and `Date.now()` read it.
const RealDate = Date;
let simNow = RealDate.now();
class SimDate extends RealDate {
  constructor(...a) {
    if (a.length === 0) super(simNow);
    else super(...a);
  }
  static now() {
    return simNow;
  }
}
globalThis.Date = SimDate;
globalThis.__simClock = { set: (d) => (simNow = new RealDate(d).getTime()), real: RealDate };

const memory = new Map();
globalThis.localStorage = {
  getItem: (k) => (memory.has(k) ? memory.get(k) : null),
  setItem: (k, v) => memory.set(k, String(v)),
  removeItem: (k) => memory.delete(k),
  clear: () => memory.clear(),
  key: (i) => [...memory.keys()][i] ?? null,
  get length() {
    return memory.size;
  },
};

const realFetch = globalThis.fetch;
globalThis.fetch = (input, init) => realFetch(typeof input === "string" && input.startsWith("/") ? config.base + input : input, init);

const jiti = createJiti(import.meta.url, { alias: { "@/": resolve(root, "src") + "/" } });
const { run } = await jiti.import(resolve(here, "simulate.ts"));
await run(config);
