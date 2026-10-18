// A made-up business to explore Polaris with: Atelier Nura, a Malaysian label selling
// premium-feel fashion at a fraction of boutique prices. Six months of history, ending today,
// where each campaign shows up in the sales it brought.

import type { StudioItem } from "./studio";
import type { Activity, ActivityKind, BusinessProfile, Insight, Mission, Overhead, Product, SalesChannel, StockMove, TreasuryEntry } from "./types";

const id = () => crypto.randomUUID();

/** Same numbers every time for the same month, so the demo doesn't reshuffle on each load. */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const round = (n: number) => Math.round(n * 100) / 100;

export const DEMO_PROFILE: BusinessProfile = {
  ownerName: "Aina",
  businessName: "Atelier Nura",
  industry: "Fashion",
  stage: "Just started",
  goal: "Increase profit",
  description:
    "Premium-feel contemporary and modest fashion at a fraction of boutique prices. Small-batch pieces sewn by a local tailor in KL, sold on TikTok Shop, Shopee, our own website, Instagram and weekend pop-ups.",
  country: "Malaysia",
  foundations: ["registered", "bank", "suppliers", "pricing", "brand", "online"],
  currency: "MYR",
  mascotName: "Lumi",
  onboarded: true,
};

// Stock tells a story too: the best seller is nearly gone, the blazer sold out, the skirt sits still.
const PRODUCTS: Product[] = [
  { id: id(), name: "Satin wrap dress", price: 139, unitCost: 52, stock: 6 },
  { id: id(), name: "Linen co-ord set", price: 169, unitCost: 66, stock: 34 },
  { id: id(), name: "Pleated midi skirt", price: 89, unitCost: 32, stock: 46 },
  { id: id(), name: "Tailored blazer", price: 219, unitCost: 92, stock: 0 },
  { id: id(), name: "Silk-touch scarf", price: 39, unitCost: 12, stock: 41 },
];

/** Units each product sells a week, and the restocks over the last two months (days ago, units). */
const STOCK_STORY: { weekly: number; restocks: [number, number][] }[] = [
  { weekly: 9, restocks: [[34, 40]] },
  { weekly: 6, restocks: [[20, 30]] },
  { weekly: 0.5, restocks: [[55, 40]] },
  { weekly: 3, restocks: [[40, 12]] },
  { weekly: 5, restocks: [[48, 40]] },
];

/** Stock history for the demo: weekly sales and a restock or two per product, ending today. */
function demoStockMoves(now: Date): StockMove[] {
  const day = (back: number) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
    return iso(d.getFullYear(), d.getMonth(), d.getDate());
  };
  const moves: StockMove[] = [];
  PRODUCTS.forEach((p, i) => {
    const story = STOCK_STORY[i];
    for (let week = 0; week < 9; week++) {
      // Half-a-unit-a-week products sell one every other week.
      const qty = story.weekly >= 1 ? Math.round(story.weekly + ((week * 3 + i) % 3) - 1) : week % 2 ? 1 : 0;
      if (qty > 0) moves.push({ id: id(), productId: p.id, date: day(week * 7 + 2), kind: "sold", qty: -qty });
    }
    for (const [back, qty] of story.restocks) moves.push({ id: id(), productId: p.id, date: day(back), kind: "restock", qty, note: "Tailor batch" });
  });
  return moves.sort((a, b) => b.date.localeCompare(a.date));
}

const CHANNELS: SalesChannel[] = [
  { id: "ig", name: "Instagram & WhatsApp", feePercent: 0, feeFixed: 0 },
  { id: "shopee", name: "Shopee", feePercent: 14, feeFixed: 0 },
  { id: "tiktok", name: "TikTok Shop", feePercent: 9, feeFixed: 0 },
  { id: "web", name: "Website", feePercent: 2.9, feeFixed: 1 },
  { id: "popup", name: "Pop-up bazaar", feePercent: 0, feeFixed: 0 },
];

const OVERHEADS: Overhead[] = [
  { id: id(), name: "Studio rent", amount: 1200 },
  { id: id(), name: "Part-time packer", amount: 1100 },
  { id: id(), name: "Website & apps", amount: 180 },
  { id: id(), name: "Phone & internet", amount: 150 },
];

type Online = "ig" | "shopee" | "tiktok" | "web";
const ONLINE: Online[] = ["ig", "shopee", "tiktok", "web"];
const CHANNEL_NAME: Record<Online, string> = { ig: "Instagram & WhatsApp", shopee: "Shopee", tiktok: "TikTok Shop", web: "Website" };

/** The big sale days of the Malaysian online calendar, by month. */
const SEASON: { title: string; day: number }[] = [
  { title: "1.1 New Year sale", day: 1 },
  { title: "Chinese New Year red edit", day: 5 },
  { title: "Raya collection pre-orders", day: 3 },
  { title: "Post-Raya clearance", day: 12 },
  { title: "5.5 sale", day: 5 },
  { title: "6.6 mid-year sale", day: 6 },
  { title: "7.7 sale", day: 7 },
  { title: "Merdeka weekend: 31% off", day: 29 },
  { title: "9.9 Shopee campaign", day: 9 },
  { title: "10.10 sale", day: 10 },
  { title: "11.11 mega sale", day: 11 },
  { title: "12.12 year-end sale", day: 12 },
];

// How each of the six months went, oldest first: a full month's sales before campaigns, how they
// split by channel, ad spend, and what was tried.
const ARC: {
  sales: number;
  share: Record<Online, number>;
  ads: number;
  extra: { day: number; kind: ActivityKind; title: string; cost: number; boost?: Partial<Record<Online, number>>; popup?: number }[];
}[] = [
  {
    sales: 4200,
    share: { ig: 0.45, shopee: 0.35, tiktok: 0.1, web: 0.1 },
    ads: 600,
    extra: [{ day: 3, kind: "launch", title: "Soft launch: first drop of 12 pieces", cost: 0, boost: { ig: 1.4 } }],
  },
  {
    sales: 6100,
    share: { ig: 0.35, shopee: 0.33, tiktok: 0.22, web: 0.1 },
    ads: 900,
    extra: [{ day: 8, kind: "event", title: "Started weekly TikTok Live try-ons", cost: 0, boost: { tiktok: 1.6 } }],
  },
  {
    sales: 7800,
    share: { ig: 0.3, shopee: 0.3, tiktok: 0.28, web: 0.12 },
    ads: 1400,
    extra: [
      { day: 12, kind: "ads", title: "Seeded 5 micro-influencers with code NURA10", cost: 1000, boost: { ig: 1.5, web: 1.7 } },
      { day: 18, kind: "other", title: "Lookbook photoshoot", cost: 800 },
    ],
  },
  {
    sales: 9400,
    share: { ig: 0.25, shopee: 0.32, tiktok: 0.3, web: 0.13 },
    ads: 2200,
    extra: [{ day: 20, kind: "event", title: "Pop-up at a weekend bazaar", cost: 350, popup: 2100 }],
  },
  {
    sales: 10600,
    share: { ig: 0.22, shopee: 0.3, tiktok: 0.32, web: 0.16 },
    ads: 1600,
    extra: [{ day: 6, kind: "launch", title: "Office Edit capsule: 4 new pieces", cost: 0, boost: { tiktok: 1.4, web: 1.5 } }],
  },
  {
    sales: 12800,
    share: { ig: 0.2, shopee: 0.33, tiktok: 0.31, web: 0.16 },
    ads: 2400,
    extra: [{ day: 13, kind: "ads", title: "Meta retargeting ads for cart abandoners", cost: 900, boost: { web: 1.3 } }],
  },
];

/** Six months of Atelier Nura, ending on `now`. Replaces everything except how the app looks. */
export function demoBusiness(now = new Date()) {
  const entries: TreasuryEntry[] = [];
  const activities: Activity[] = [];
  const today = iso(now.getFullYear(), now.getMonth(), now.getDate());

  ARC.forEach((month, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (ARC.length - 1 - i), 1);
    const y = start.getFullYear();
    const m = start.getMonth();
    const days = new Date(y, m + 1, 0).getDate();
    const rand = random(y * 100 + m);
    const add = (day: number, entry: Omit<TreasuryEntry, "id" | "date">) => {
      const date = iso(y, m, Math.min(day, days));
      if (date <= today) entries.push({ id: id(), date, ...entry, amount: round(entry.amount) });
    };
    const season = SEASON[m];
    const campaigns: (typeof month.extra)[number][] = [
      { day: season.day, kind: "promotion", title: season.title, cost: 0, boost: { shopee: 1.9, tiktok: 1.5, ig: 1.15, web: 1.2 } },
      ...month.extra,
    ];
    for (const c of campaigns) {
      const date = iso(y, m, Math.min(c.day, days));
      if (date <= today) activities.push({ id: id(), date, kind: c.kind, title: c.title, cost: c.cost });
    }

    // Sales arrive as a weekly batch per channel; a campaign lifts its own week, and the TikTok
    // Lives and influencers keep lifting the rest of the month.
    const weeks = [7, 14, 21, 28, days];
    weeks.forEach((end, w) => {
      const from = w === 0 ? 1 : weeks[w - 1] + 1;
      const share = (end - from + 1) / days;
      let fees = 0;
      for (const ch of ONLINE) {
        let boost = 1;
        for (const c of campaigns) {
          const lift = c.boost?.[ch];
          if (!lift) continue;
          if (c.day >= from && c.day <= end) boost *= lift;
          else if (c.day < from && c.kind !== "promotion") boost *= 1 + (lift - 1) * 0.4;
        }
        const amount = Math.round(month.sales * share * month.share[ch] * boost * (0.85 + rand() * 0.3));
        if (amount < 40) continue;
        const orders = Math.max(1, Math.round(amount / 118));
        add(end, { type: "income", category: "Sales", amount, note: `${orders} order${orders === 1 ? "" : "s"}, week to the ${end}`, channel: CHANNEL_NAME[ch] });
        const fee = CHANNELS.find((c) => c.id === ch)!;
        fees += (amount * fee.feePercent) / 100 + orders * fee.feeFixed;
      }
      if (fees) add(end, { type: "expense", category: "Platform fees", amount: fees, note: "Shopee, TikTok Shop and card fees" });
    });
    for (const c of month.extra) {
      if (c.popup) add(c.day, { type: "income", category: "Sales", amount: c.popup, note: "Bazaar sales, cash and QR", channel: "Pop-up bazaar" });
    }

    // Costs: overheads on their days, stock in two batches, ads in two halves, couriers twice.
    const planned = month.sales * 1.15;
    add(1, { type: "expense", category: "Rent", amount: 1200, note: "Studio rent" });
    add(2, { type: "expense", category: "Ingredients / stock", amount: planned * 0.22, note: "Fabric: satin, linen and crepe" });
    add(3, { type: "expense", category: "Other", amount: 180, note: "Website & apps" });
    add(4, { type: "expense", category: "Packaging", amount: planned * 0.03, note: "Boxes, tissue and thank-you cards" });
    add(5, { type: "expense", category: "Utilities", amount: 150, note: "Phone & internet" });
    add(7, { type: "expense", category: "Marketing", amount: month.ads * 0.5, note: "Meta and TikTok ads" });
    add(15, { type: "expense", category: "Transport", amount: planned * 0.02, note: "Courier: first half of the month" });
    add(16, { type: "expense", category: "Ingredients / stock", amount: planned * 0.16, note: "Tailor batch: dresses and co-ords" });
    add(20, { type: "expense", category: "Marketing", amount: month.ads * 0.5, note: "Meta and TikTok ads" });
    add(28, { type: "expense", category: "Staff", amount: 1100, note: "Part-time packer" });
    add(days, { type: "expense", category: "Transport", amount: planned * 0.02, note: "Courier: second half of the month" });
    if (i === 0) add(6, { type: "expense", category: "Equipment", amount: 450, note: "Garment steamer and clothing rack" });
    for (const c of month.extra) {
      if (c.cost) add(c.day, { type: "expense", category: "Marketing", amount: c.cost, note: c.title });
    }
  });

  entries.sort((a, b) => a.date.localeCompare(b.date));
  activities.sort((a, b) => a.date.localeCompare(b.date));

  const monthStart = (back: number, day: number) => {
    const d = new Date(now.getFullYear(), now.getMonth() - back, Math.min(day, 28), 10);
    return d.toISOString();
  };

  const steps = (texts: string[], done = 0) => texts.map((text, i) => ({ id: id(), text, done: i < done }));
  const missions: Mission[] = [
    {
      id: id(), title: "Register Atelier Nura with SSM", description: "Make the business official so platforms, banks and bazaars take you seriously.",
      category: "legal", xp: 100, status: "done", steps: steps(["Pick the business name", "Register on SSM ezBiz", "Download the certificate"], 3),
      foundations: ["registered"], source: "ai", createdAt: monthStart(5, 1), completedAt: monthStart(5, 5),
    },
    {
      id: id(), title: "Open a business bank account", description: "Keep shop money apart from personal money from day one.",
      category: "finance", xp: 75, status: "done", steps: steps(["Compare business accounts", "Open the account", "Link it to Shopee and TikTok payouts"], 3),
      foundations: ["bank"], source: "ai", createdAt: monthStart(5, 1), completedAt: monthStart(5, 10),
    },
    {
      id: id(), title: "Open TikTok Shop and Shopee stores", description: "Be where young shoppers already browse for fashion.",
      category: "sales", xp: 100, status: "done", steps: steps(["Set up both seller accounts", "List the first 12 pieces", "Write size guides"], 3),
      foundations: ["online"], source: "ai", createdAt: monthStart(5, 2), completedAt: monthStart(5, 20),
    },
    {
      id: id(), title: "Price every piece for each platform", description: "Work out what each piece really earns after Shopee and TikTok take their cut.",
      category: "finance", xp: 100, status: "done", steps: steps(["List unit costs", "Add platform fees", "Set a price floor per channel"], 3),
      foundations: ["pricing"], source: "ai", createdAt: monthStart(4, 2), completedAt: monthStart(4, 14),
    },
    {
      id: id(), title: "Run your first TikTok Live try-on", description: "Show the fit and fabric live, answer sizing questions and take orders on the spot.",
      category: "marketing", xp: 100, status: "done", steps: steps(["Pick 6 pieces to try on", "Announce the Live 2 days before", "Go live for 45 minutes"], 3),
      report: {
        answers: [
          { question: "How many people watched at the peak?", answer: "86" },
          { question: "How many orders came from the Live?", answer: "14" },
        ],
        feedback: "14 orders from 86 viewers is a strong first Live. Keep the same day and time each week so viewers learn when to show up.",
        at: monthStart(4, 9),
      },
      source: "ai", createdAt: monthStart(4, 3), completedAt: monthStart(4, 9),
    },
    {
      id: id(), title: "Seed 5 micro-influencers", description: "Gift pieces to creators your buyers follow, each with a tracked code.",
      category: "marketing", xp: 150, status: "done", steps: steps(["Shortlist 10 creators (5k to 30k followers)", "Send 5 gift boxes with code NURA10", "Track orders on the code"], 3),
      report: {
        answers: [
          { question: "How many creators posted?", answer: "3 of 5" },
          { question: "Orders with code NURA10", answer: "41" },
        ],
        feedback: "41 orders for about RM1,000 in gifts is roughly RM24 a customer, well under your average order. Go back to the 3 who posted for a second round.",
        at: monthStart(3, 20),
      },
      source: "ai", createdAt: monthStart(3, 8), completedAt: monthStart(3, 20),
    },
    {
      id: id(), title: "Move repeat buyers to the website", description: "Shopee takes 14% of every sale. Give repeat buyers a reason to order on your own site instead.",
      category: "sales", xp: 150, status: "active", steps: steps(["Add a 'members get free shipping' insert to every parcel", "Send repeat buyers a website-only code", "Set up WhatsApp order updates", "Compare fees after a month"], 2),
      checkIn: [
        { id: id(), question: "How many repeat buyers ordered on the website this month?", kind: "number" },
        { id: id(), question: "What did platform fees come to this month?", kind: "money" },
      ],
      source: "ai", createdAt: monthStart(1, 4),
    },
    {
      id: id(), title: "Plan next month's big sale drop", description: "Decide the pieces, the stock and the ad budget before the rush, not during it.",
      category: "marketing", xp: 150, status: "todo", steps: steps(["Pick 3 hero pieces", "Order fabric 3 weeks ahead", "Set a ceiling on ad spend", "Prepare TikTok Live scripts"]),
      checkIn: [{ id: id(), question: "What return on ad spend did you get?", kind: "number" }],
      source: "ai", createdAt: monthStart(0, 2),
    },
    {
      id: id(), title: "Set up simple bookkeeping", description: "Log every sale and cost weekly so you always know what you made.",
      category: "finance", xp: 100, status: "todo", steps: steps(["Pick a weekly bookkeeping slot", "Log last week's payouts and costs", "Keep receipts in one folder"]),
      foundations: ["bookkeeping"], checkIn: [{ id: id(), question: "How many weeks in a row did you keep it up?", kind: "number" }],
      source: "ai", createdAt: monthStart(0, 3),
    },
    {
      id: id(), title: "Get a licence for bazaar pop-ups", description: "Pop-ups did well. Get the temporary trading licence so you can do them every month.",
      category: "legal", xp: 75, status: "todo", steps: steps(["Check the council's requirements", "Apply for a temporary licence", "Book next month's bazaar slot"]),
      foundations: ["licenses"], checkIn: [{ id: id(), question: "Did the licence come through?", kind: "text" }],
      source: "ai", createdAt: monthStart(0, 5),
    },
  ];

  const insights: Insight[] = [
    { label: "TikTok Live peak viewers", value: "86", missionTitle: "Run your first TikTok Live try-on", at: monthStart(4, 9) },
    { label: "Orders on influencer code NURA10", value: "41", missionTitle: "Seed 5 micro-influencers", at: monthStart(3, 20) },
  ];

  const studioItems: StudioItem[] = [
    {
      id: id(),
      createdAt: monthStart(3, 22),
      title: "Brand kit: slogans, voice and colour palette",
      output: {
        tool: "brand",
        brand: {
          names: [{ name: "Atelier Nura", why: "Nura means light: pieces that make you glow, without the boutique price." }],
          slogans: ["Luxury, made reachable.", "Look boutique. Pay bazaar.", "Glow for less."],
          voice: {
            traits: ["Warm", "Confident", "Honest about price"],
            doSay: ["Made in small batches in KL", "Feels like RM500, priced at RM139"],
            dontSay: ["Cheap", "Dupe"],
          },
          palette: [
            { name: "Nura plum", hex: "#6B3A5B", use: "Logo and headings" },
            { name: "Champagne", hex: "#D8B26E", use: "Highlights and buttons" },
            { name: "Ink", hex: "#1F1B2E", use: "Text" },
            { name: "Pearl", hex: "#F6EFE6", use: "Backgrounds" },
            { name: "Sage", hex: "#9DB4A0", use: "Accents in photos" },
          ],
          story: "Aina grew up loving boutique fashion she couldn't afford. Atelier Nura works with a small KL tailor to make the same feel at a fraction of the price.",
        },
      },
    },
  ];

  const income = entries.filter((e) => e.type === "income");
  const byMonth = new Map<string, number>();
  for (const e of income) byMonth.set(e.date.slice(0, 7), (byMonth.get(e.date.slice(0, 7)) ?? 0) + e.amount);

  return {
    profile: DEMO_PROFILE,
    xp: missions.filter((x) => x.status === "done").reduce((s, x) => s + x.xp, 0),
    revenue: {
      lifetime: Math.round(income.reduce((s, e) => s + e.amount, 0)),
      bestMonth: Math.round(Math.max(0, ...byMonth.values())),
      updatedAt: now.toISOString(),
    },
    missions,
    insights,
    entries,
    products: PRODUCTS,
    channels: CHANNELS,
    overheads: OVERHEADS,
    cashOnHand: 14800,
    lessonsDone: [] as string[],
    toursSeen: ["treasury"],
    activities,
    stockMoves: demoStockMoves(now),
    restockPlan: null,
    monthReports: {},
    studioItems,
    advisorThread: [],
    celebration: null,
  };
}
