// The market Atelier Nura sells into, as a simple monthly model. It turns the owner's decisions
// (ads, prices, sales, Lives, stock, costs...) into orders, costs and ledger entries.
//
// It's a model with made-up but plausible numbers, calibrated so October 2026 looks like the demo
// business: about RM13k of sales a month, ads that are past the point of paying for themselves,
// and Shopee taking a big cut. Both runs (with and without Polaris) share the same random draws
// each month, so any difference comes from decisions, not luck.

import type { Activity, ActivityKind, TreasuryEntry } from "../../src/lib/types";

/** Ongoing choices. They stay as they are until the owner changes them. */
export interface Settings {
  /** RM a month on Meta and TikTok ads. */
  adSpend: number;
  /** Share of the ad budget on TikTok (the rest goes to Meta). */
  tiktokAdShare: number;
  /** 1 = today's prices; 1.1 = everything 10% dearer. */
  priceIndex: number;
  /** How deep the month's big sale goes, 0 to 0.5. */
  saleDiscount: number;
  /** TikTok Live try-on sessions a month. */
  livesPerMonth: number;
  /** Parcel inserts and a website-only code, to move repeat buyers off Shopee. */
  websitePush: boolean;
  /** A WhatsApp VIP list and loyalty perks for past buyers. */
  retention: boolean;
  /** Bundles (co-ord + scarf) and free shipping over RM200. */
  bundles: boolean;
  /** Stock ordered relative to the units the owner expects to sell (1 = just enough). */
  stockCover: number;
  /** A negotiated courier rate. */
  courierDeal: boolean;
  /** Cancelled the apps nobody uses. */
  appsTrimmed: boolean;
  /** Keep the part-time packer. Without one, the owner can pack about 230 orders a month. */
  packer: boolean;
}

/** One-off things done this month. */
export interface OneOffs {
  influencers: number;
  popups: number;
  capsule: boolean;
  getLicence: boolean;
  /** Pieces of each product to order this month, by name. Null: order the usual way (see `usualOrder`). */
  restock: Record<string, number> | null;
}

/**
 * The five pieces Atelier Nura sells, as in the demo (src/lib/demo.ts): what one costs to make,
 * its share of the pieces customers want, what's on the shelf at the start, and the share it
 * gets in the owner's usual batch orders (her past batches: 40 dresses, 30 co-ords, 40 skirts,
 * 12 blazers, 40 scarves), which is how she orders without a stock system.
 */
export const PRODUCTS = [
  { name: "Satin wrap dress", price: 139, unitCost: 52, demand: 9, stock: 6, usual: 40 },
  { name: "Linen co-ord set", price: 169, unitCost: 66, demand: 6, stock: 34, usual: 30 },
  { name: "Pleated midi skirt", price: 89, unitCost: 32, demand: 0.5, stock: 46, usual: 40 },
  { name: "Tailored blazer", price: 219, unitCost: 92, demand: 3, stock: 0, usual: 12 },
  { name: "Silk-touch scarf", price: 39, unitCost: 12, demand: 5, stock: 41, usual: 40 },
] as const;

const byName = <T>(f: (p: (typeof PRODUCTS)[number]) => T) => Object.fromEntries(PRODUCTS.map((p) => [p.name, f(p)])) as Record<string, T>;
const DEMAND_TOTAL = PRODUCTS.reduce((s, p) => s + p.demand, 0);
const USUAL_TOTAL = PRODUCTS.reduce((s, p) => s + p.usual, 0);
/** What a typical piece sells for, given what customers want. */
const PIECE_PRICE = PRODUCTS.reduce((s, p) => s + p.price * p.demand, 0) / DEMAND_TOTAL;
/** Pieces in the average order: the order value spent at those piece prices. About 0.9, like the demo's own history. */
const PIECES_PER_ORDER = 118 / PIECE_PRICE;
/** Pieces sold in October, the month before the run: the demo's own stock history. */
const OCTOBER_PIECES = 110;

/**
 * How the owner orders without a stock system: the pieces customers asked for last month (she
 * hears about sold-out pieces, so stock-outs don't shrink her orders), adjusted for the season,
 * times her stock cover, split the way her past batches were, less what's left.
 */
export function usualOrder(state: MarketState, cover: number, season: number, lastSeason: number) {
  const expected = Object.values(state.lastWanted).reduce((s, v) => s + v, 0) * (season / lastSeason);
  return byName((p) => Math.max(0, Math.round((expected * cover * p.usual) / USUAL_TOTAL - state.stock[p.name])));
}

export type Plan = Settings & OneOffs;

export interface MarketState {
  /** How many people know the brand; 1 = October 2026. */
  awareness: number;
  /** Past buyers who might buy again. */
  customers: number;
  /** Pieces in stock, by product. */
  stock: Record<string, number>;
  /** Shop rating out of 5. */
  rating: number;
  /** Has the temporary trading licence for bazaars. */
  licence: boolean;
  /** Pieces sold last month, by product: what the owner orders stock against. */
  lastSold: Record<string, number>;
  /** Pieces customers wanted last month, sold or not, by product. */
  lastWanted: Record<string, number>;
  /** Cash in the bank. */
  cash: number;
}

export interface MonthResult {
  entries: TreasuryEntry[];
  activities: Activity[];
  metrics: Metrics;
  next: MarketState;
}

export interface Metrics {
  month: string;
  orders: number;
  newOrders: number;
  repeatOrders: number;
  popupOrders: number;
  lostOrders: number;
  unitsSold: number;
  unitsBought: number;
  inventoryLeft: number;
  /** By product: pieces sold, bought, left, and wanted but not in stock. */
  soldBy: Record<string, number>;
  boughtBy: Record<string, number>;
  stockBy: Record<string, number>;
  missedBy: Record<string, number>;
  /** What the stock left on the shelf cost. */
  stockValue: number;
  sales: number;
  salesByChannel: Record<string, number>;
  aov: number;
  adSpend: number;
  costPerAdOrder: number | null;
  platformFees: number;
  expenses: number;
  net: number;
  cash: number;
  rating: number;
  awareness: number;
  customers: number;
}

export const START: MarketState = {
  awareness: 1,
  customers: 400,
  stock: byName((p) => p.stock),
  rating: 4.6,
  licence: false,
  lastSold: byName((p) => Math.round((OCTOBER_PIECES * p.demand) / DEMAND_TOTAL)),
  lastWanted: byName((p) => Math.round((OCTOBER_PIECES * p.demand) / DEMAND_TOTAL)),
  cash: 14800,
};

export const HABITS: Settings = {
  adSpend: 2400,
  tiktokAdShare: 0.5,
  priceIndex: 1,
  saleDiscount: 0.35,
  livesPerMonth: 4,
  websitePush: false,
  retention: false,
  bundles: false,
  stockCover: 1.3,
  courierDeal: false,
  appsTrimmed: false,
  packer: true,
};

export const NO_ONE_OFFS: OneOffs = { influencers: 0, popups: 0, capsule: false, getLicence: false, restock: null };

/** How busy each calendar month is for fashion in Malaysia (Raya 2027 falls in early March). */
const SEASON = [0.9, 1.35, 1.15, 0.8, 0.95, 0.95, 0.95, 1.05, 1.0, 1.1, 1.2, 1.25];
const SALES = ["1.1 New Year sale", "Raya collection pre-orders", "Raya last-call sale", "Post-Raya clearance", "5.5 sale", "6.6 mid-year sale", "7.7 sale", "Merdeka weekend sale", "9.9 sale", "10.10 sale", "11.11 mega sale", "12.12 year-end sale"];
const SALE_DAY = [1, 6, 3, 12, 5, 6, 7, 29, 9, 10, 11, 12];

const AOV = 118;
const CHANNELS = [
  { name: "Shopee", fee: 0.14, fixed: 0 },
  { name: "TikTok Shop", fee: 0.09, fixed: 0 },
  { name: "Instagram & WhatsApp", fee: 0, fixed: 0 },
  { name: "Website", fee: 0.029, fixed: 1 },
] as const;

export function seasonFor(date: Date) {
  return { factor: SEASON[date.getMonth()], sale: SALES[date.getMonth()], saleDay: SALE_DAY[date.getMonth()] };
}

/** Repeatable random numbers: the same seed, month and stream always give the same draw. */
function draw(seed: number, month: number, stream: number) {
  let a = (seed * 7919 + month * 104729 + stream * 15485863) >>> 0;
  a = (a + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
/** A multiplier around 1, e.g. spread 0.2 gives 0.8 to 1.2. */
const wobble = (seed: number, month: number, stream: number, spread: number) => 1 - spread + 2 * spread * draw(seed, month, stream);

const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const r2 = (n: number) => Math.round(n * 100) / 100;

export function clampPlan(p: Partial<Plan>, current: Settings): Plan {
  const num = (v: unknown, lo: number, hi: number, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
  };
  const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
  return {
    adSpend: Math.round(num(p.adSpend, 0, 8000, current.adSpend)),
    tiktokAdShare: num(p.tiktokAdShare, 0, 1, current.tiktokAdShare),
    priceIndex: num(p.priceIndex, 0.8, 1.3, current.priceIndex),
    saleDiscount: num(p.saleDiscount, 0, 0.5, current.saleDiscount),
    livesPerMonth: Math.round(num(p.livesPerMonth, 0, 12, current.livesPerMonth)),
    websitePush: bool(p.websitePush, current.websitePush),
    retention: bool(p.retention, current.retention),
    bundles: bool(p.bundles, current.bundles),
    stockCover: num(p.stockCover, 0.7, 1.6, current.stockCover),
    courierDeal: bool(p.courierDeal, current.courierDeal),
    appsTrimmed: bool(p.appsTrimmed, current.appsTrimmed),
    packer: bool(p.packer, current.packer),
    influencers: Math.round(num(p.influencers, 0, 10, 0)),
    popups: Math.round(num(p.popups, 0, 4, 0)),
    capsule: bool(p.capsule, false),
    getLicence: bool(p.getLicence, false),
    restock:
      p.restock && typeof p.restock === "object"
        ? byName((prod) => Math.round(num((p.restock as Record<string, unknown>)[prod.name], 0, 500, 0)))
        : null,
  };
}

/** Plays one month of the market. `index` counts months from the start of the run (for the random draws). */
export function simulateMonth(state: MarketState, plan: Plan, monthStart: Date, index: number, seed: number): MonthResult {
  const y = monthStart.getFullYear();
  const m = monthStart.getMonth();
  const days = new Date(y, m + 1, 0).getDate();
  const { factor: season, sale, saleDay } = seasonFor(monthStart);
  const lastSeason = SEASON[(m + 11) % 12];
  const n = (stream: number, spread: number) => wobble(seed, index, stream, spread);

  // Demand. Higher prices sell fewer pieces; a better rating converts better.
  const priceF = plan.priceIndex ** -1.6;
  const ratingF = 1 + (state.rating - 4.6) * 0.6;
  const bundleConv = plan.bundles ? 0.96 : 1;
  const capsuleF = plan.capsule ? 1.18 : 1;
  const organic = 46 * state.awareness * season * ratingF * priceF * bundleConv * capsuleF * n(1, 0.12);
  // Ads have diminishing returns: the first ringgit buys more than the last. TikTok suits this audience better.
  const adEff = 0.85 + 0.3 * plan.tiktokAdShare;
  const fromAds = 0.33 * plan.adSpend ** 0.6 * Math.sqrt(season) * priceF * ratingF * adEff * n(2, 0.15);
  const lives = plan.packer ? plan.livesPerMonth : Math.min(plan.livesPerMonth, 4);
  let fromLives = 0;
  for (let k = 0; k < lives; k++) fromLives += 4 * 0.82 ** k * priceF;
  const fromInfluencers = plan.influencers * 7 * n(3, 0.5) * priceF;
  // The big sale pulls extra orders into its week, the deeper the more.
  const fromSale = (organic + fromAds) * 0.25 * 2.4 * plan.saleDiscount;
  const newOrders = organic + fromAds + fromLives + fromInfluencers + fromSale;

  const repeatRate = 0.06 + (plan.retention ? 0.05 : 0) + (plan.websitePush ? 0.015 : 0);
  const repeatOrders = state.customers * repeatRate * Math.sqrt(season) * n(4, 0.15);

  // Bazaar pop-ups: walk-in sales. Without a licence there's a chance of a fine.
  const licence = state.licence;
  const popupSales = Array.from({ length: plan.popups }, (_, k) => 1700 * state.awareness ** 0.3 * wobble(seed, index, 10 + k, 0.25));
  const fines = Array.from({ length: plan.popups }, (_, k) => !licence && draw(seed, index, 20 + k) < 0.3);
  const popupOrders = popupSales.reduce((s, v) => s + v, 0) / 105;

  // Capacity first (orders the shop can't pack are lost), then stock (pieces it doesn't have).
  const capacity = plan.packer ? 420 : 230;
  const demandOnline = newOrders + repeatOrders;
  const capScale = demandOnline > 0 ? Math.min(1, capacity / demandOnline) : 1;
  // Bundles put about 10% more pieces in each order.
  const unitsPerOrder = PIECES_PER_ORDER * (plan.bundles ? 1.1 : 1);
  // Stock, product by product: this month's order arrives at the start of the month, then
  // customers want each piece in its share (which drifts a little month to month).
  const boughtBy = plan.restock ? byName((p) => plan.restock![p.name] ?? 0) : usualOrder(state, plan.stockCover, season, lastSeason);
  const wanted = (demandOnline * capScale + popupOrders) * unitsPerOrder;
  const mix = byName((p) => p.demand * n(30 + PRODUCTS.indexOf(p), 0.2));
  const mixTotal = Object.values(mix).reduce((s, v) => s + v, 0);
  const soldBy: Record<string, number> = {};
  const missedBy: Record<string, number> = {};
  const stockBy: Record<string, number> = {};
  for (const p of PRODUCTS) {
    const available = state.stock[p.name] + boughtBy[p.name];
    const want = Math.round((wanted * mix[p.name]) / mixTotal);
    soldBy[p.name] = Math.min(available, want);
    missedBy[p.name] = want - soldBy[p.name];
    stockBy[p.name] = available - soldBy[p.name];
  }
  const unitsBought = Object.values(boughtBy).reduce((s, v) => s + v, 0);
  const unitsSold = Object.values(soldBy).reduce((s, v) => s + v, 0);
  // Someone who can't get the piece they came for doesn't order.
  const fill = wanted > 0 ? Math.min(1, unitsSold / wanted) : 1;
  const scale = capScale * fill;
  const online = demandOnline * scale;
  const popupFill = fill;
  const lost = demandOnline * (1 - scale) + popupOrders * (1 - fill);

  // Who buys where. Lives sell on TikTok; influencer codes on Instagram and the website;
  // repeat buyers follow the website push.
  const newShare = { Shopee: 0.33, "TikTok Shop": 0.31 + 0.15 * (plan.tiktokAdShare - 0.5), "Instagram & WhatsApp": 0.2, Website: 0.16 };
  const repeatShare = plan.websitePush ? { Shopee: 0.18, "TikTok Shop": 0.12, "Instagram & WhatsApp": 0.15, Website: 0.55 } : newShare;
  const share = (base: Record<string, number>) => {
    const total = Object.values(base).reduce((s, v) => s + v, 0);
    return Object.fromEntries(Object.entries(base).map(([k, v]) => [k, v / total]));
  };
  const ns = share(newShare);
  const rs = share(repeatShare);
  const ordersBy: Record<string, number> = {};
  for (const ch of CHANNELS) {
    ordersBy[ch.name] = (organic + fromAds + fromSale) * scale * ns[ch.name] + repeatOrders * scale * rs[ch.name];
  }
  ordersBy["TikTok Shop"] += fromLives * scale;
  ordersBy["Instagram & WhatsApp"] += fromInfluencers * scale * 0.5;
  ordersBy.Website += fromInfluencers * scale * 0.5;

  // Revenue: the sale week's orders go at the discount; website-only codes take 5% off.
  const aov = AOV * plan.priceIndex * (plan.bundles ? 1.12 : 1);
  const saleShare = (organic + fromAds) * 0.25 + fromSale;
  const saleFraction = newOrders > 0 ? saleShare / newOrders : 0;
  const avgPrice = aov * (1 - saleFraction * plan.saleDiscount);
  const salesBy: Record<string, number> = {};
  for (const ch of CHANNELS) {
    salesBy[ch.name] = ordersBy[ch.name] * avgPrice * (ch.name === "Website" && plan.websitePush ? 0.95 : 1);
  }
  const popupRevenue = popupSales.map((v) => v * popupFill);

  // Ledger: weekly payouts per channel, then the month's costs.
  const entries: TreasuryEntry[] = [];
  const activities: Activity[] = [];
  const add = (day: number, e: Omit<TreasuryEntry, "id" | "date">) => {
    if (e.amount > 0.5) entries.push({ id: crypto.randomUUID(), date: iso(y, m, Math.min(day, days)), ...e, amount: r2(e.amount) });
  };
  const act = (day: number, kind: ActivityKind, title: string, cost = 0) =>
    activities.push({ id: crypto.randomUUID(), date: iso(y, m, Math.min(day, days)), kind, title, cost: Math.round(cost) });

  const weeks = [7, 14, 21, 28, days];
  const saleWeek = weeks.findIndex((end) => saleDay <= end);
  const weekWeights = weeks.map((end, w) => {
    const len = end - (w === 0 ? 0 : weeks[w - 1]);
    return (len / days) * (w === saleWeek && plan.saleDiscount > 0 ? 1 + saleFraction * 3 : 1);
  });
  const wSum = weekWeights.reduce((s, v) => s + v, 0);
  let fees = 0;
  weeks.forEach((end, w) => {
    let weekFees = 0;
    for (const ch of CHANNELS) {
      const amount = (salesBy[ch.name] * weekWeights[w]) / wSum;
      const orders = (ordersBy[ch.name] * weekWeights[w]) / wSum;
      if (amount < 40) continue;
      add(end, { type: "income", category: "Sales", amount: Math.round(amount), note: `${Math.round(orders)} orders, week to the ${end}`, channel: ch.name });
      weekFees += amount * ch.fee + orders * ch.fixed;
    }
    fees += weekFees;
    add(end, { type: "expense", category: "Platform fees", amount: weekFees, note: "Shopee, TikTok Shop and card fees" });
  });
  popupRevenue.forEach((v, k) => add(13 + k * 7, { type: "income", category: "Sales", amount: Math.round(v), note: "Bazaar sales, cash and QR", channel: "Pop-up bazaar" }));

  const onlineSales = Object.values(salesBy).reduce((s, v) => s + v, 0);
  const orders = online + popupOrders * popupFill;
  add(1, { type: "expense", category: "Rent", amount: 1200, note: "Studio rent" });
  add(2, {
    type: "expense",
    category: "Ingredients / stock",
    amount: PRODUCTS.reduce((s, p) => s + boughtBy[p.name] * p.unitCost, 0),
    note: `Fabric and tailoring: ${unitsBought} pieces`,
  });
  add(3, { type: "expense", category: "Other", amount: plan.appsTrimmed ? 80 : 180, note: "Website & apps" });
  if (plan.retention) add(3, { type: "expense", category: "Marketing", amount: 60, note: "WhatsApp VIP list tools" });
  add(4, { type: "expense", category: "Packaging", amount: orders * 3.5, note: "Boxes, tissue and thank-you cards" });
  add(5, { type: "expense", category: "Utilities", amount: 150, note: "Phone & internet" });
  if (plan.websitePush) add(6, { type: "expense", category: "Marketing", amount: 120, note: "Parcel inserts and website-only codes" });
  if (plan.bundles) add(6, { type: "expense", category: "Transport", amount: onlineSales * 0.02, note: "Free shipping over RM200" });
  if (plan.capsule) add(5, { type: "expense", category: "Ingredients / stock", amount: 900, note: "Capsule samples and pattern-making" });
  add(7, { type: "expense", category: "Marketing", amount: plan.adSpend / 2, note: "Meta and TikTok ads" });
  if (plan.influencers) add(10, { type: "expense", category: "Marketing", amount: plan.influencers * 220, note: `Gift boxes for ${plan.influencers} creators` });
  add(15, { type: "expense", category: "Transport", amount: onlineSales * (plan.courierDeal ? 0.015 : 0.02), note: "Courier: first half of the month" });
  add(20, { type: "expense", category: "Marketing", amount: plan.adSpend / 2, note: "Meta and TikTok ads" });
  popupRevenue.forEach((_, k) => {
    add(13 + k * 7, { type: "expense", category: "Marketing", amount: 350, note: "Bazaar booth" });
    if (fines[k]) add(13 + k * 7, { type: "expense", category: "Other", amount: 600, note: "Council fine: trading without a licence" });
  });
  if (plan.getLicence && !licence) add(9, { type: "expense", category: "Other", amount: 250, note: "Temporary trading licence" });
  if (plan.packer) add(28, { type: "expense", category: "Staff", amount: 1100, note: "Part-time packer" });
  add(days, { type: "expense", category: "Transport", amount: onlineSales * (plan.courierDeal ? 0.015 : 0.02), note: "Courier: second half of the month" });

  // What the owner would log as this month's activities.
  if (plan.saleDiscount > 0) act(saleDay, "promotion", `${sale}: ${Math.round(plan.saleDiscount * 100)}% off`);
  if (lives) act(8, "event", `${lives} TikTok Live try-ons`);
  if (plan.influencers) act(10, "ads", `Gifted pieces to ${plan.influencers} creators`, plan.influencers * 220);
  popupRevenue.forEach((_, k) => act(13 + k * 7, "event", "Weekend bazaar pop-up", 350));
  if (plan.capsule) act(5, "launch", "New capsule drop", 900);

  const income = entries.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const expenses = entries.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);
  const net = income - expenses;

  // How the brand and the shop carry into next month.
  const target =
    0.75 + 0.25 * Math.log(1 + plan.adSpend / 1500) + 0.025 * lives + 0.03 * plan.influencers + 0.04 * plan.popups + (plan.capsule ? 0.06 : 0) + (plan.retention ? 0.02 : 0);
  const stockedOut = fill < 0.9;
  const overCapacity = newOrders + repeatOrders > capacity;
  let rating = state.rating + (4.6 - state.rating) * 0.3 + (plan.retention ? 0.03 : 0) - (stockedOut ? 0.08 : 0) - (overCapacity ? 0.15 : 0);
  rating = Math.min(4.95, Math.max(3.8, rating));
  const next: MarketState = {
    awareness: Math.max(0.5, 0.85 * state.awareness + 0.15 * target) * n(5, 0.03),
    customers: state.customers * 0.99 + (newOrders * scale + popupOrders * popupFill) * 0.85,
    stock: stockBy,
    rating,
    licence: licence || plan.getLicence,
    lastSold: soldBy,
    lastWanted: byName((p) => soldBy[p.name] + missedBy[p.name]),
    cash: state.cash + net,
  };

  const metrics: Metrics = {
    month: iso(y, m, 1).slice(0, 7),
    orders: Math.round(orders),
    newOrders: Math.round(newOrders * scale),
    repeatOrders: Math.round(repeatOrders * scale),
    popupOrders: Math.round(popupOrders * popupFill),
    lostOrders: Math.round(lost),
    unitsSold: Math.round(unitsSold),
    unitsBought,
    inventoryLeft: Object.values(stockBy).reduce((s, v) => s + v, 0),
    soldBy,
    boughtBy,
    stockBy,
    missedBy,
    stockValue: PRODUCTS.reduce((s, p) => s + stockBy[p.name] * p.unitCost, 0),
    sales: Math.round(income),
    salesByChannel: Object.fromEntries([...CHANNELS.map((ch) => [ch.name, Math.round(salesBy[ch.name])]), ["Pop-up bazaar", Math.round(popupRevenue.reduce((s, v) => s + v, 0))]]),
    aov: Math.round(orders ? income / orders : 0),
    adSpend: plan.adSpend,
    costPerAdOrder: fromAds > 0.5 ? Math.round(plan.adSpend / (fromAds * scale)) : null,
    platformFees: Math.round(fees),
    expenses: Math.round(expenses),
    net: Math.round(net),
    cash: Math.round(next.cash),
    rating: Math.round(next.rating * 100) / 100,
    awareness: Math.round(next.awareness * 100) / 100,
    customers: Math.round(next.customers),
  };
  return { entries, activities, metrics, next };
}
