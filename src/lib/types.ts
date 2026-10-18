export type Industry =
  | "Food & Beverage"
  | "Retail"
  | "Fashion"
  | "Beauty & Wellness"
  | "Services"
  | "Tech & Digital"
  | "Creative & Arts"
  | "Other";

export type Stage = "Idea" | "Just started" | "Growing" | "Established";

export type Goal =
  | "Get more customers"
  | "Increase profit"
  | "Build my brand"
  | "Get organized"
  | "Launch a new product";

/** Business basics a user can tick off as already in place. */
export type Foundation =
  | "registered"
  | "licenses"
  | "bank"
  | "bookkeeping"
  | "suppliers"
  | "pricing"
  | "brand"
  | "online";

export interface BusinessProfile {
  ownerName: string;
  businessName: string;
  industry: Industry | null;
  stage: Stage | null;
  goal: Goal | null;
  description: string;
  /** Where the business operates; makes legal and admin steps concrete. */
  country: string;
  /** Basics already in place; null until the user fills in the checklist. */
  foundations: Foundation[] | null;
  currency: string;
  /** What the user named their mascot guide. Empty until they choose. */
  mascotName: string;
  onboarded: boolean;
}

/** Self-reported sales, in the profile currency. Gates the higher levels. */
export interface RevenueReport {
  /** Total sales since the business started. */
  lifetime: number;
  /** Best single month of sales so far. */
  bestMonth: number;
  updatedAt: string | null;
}

/** A number or fact the user reported, e.g. "Instagram ad CTR: 1.8%". Fed back into the AI. */
export interface Insight {
  label: string;
  value: string;
  missionTitle: string;
  at: string;
}

export type CheckInKind = "number" | "percent" | "money" | "text";

/** A question the user answers to complete a mission. */
export interface CheckInQuestion {
  id: string;
  question: string;
  kind: CheckInKind;
}

export interface MissionReport {
  answers: { question: string; answer: string }[];
  feedback: string;
  at: string;
}

export type MissionCategory = "legal" | "operations" | "finance" | "sales" | "marketing" | "branding";

export type MissionStatus = "todo" | "active" | "done";

export interface MissionStep {
  id: string;
  text: string;
  done: boolean;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  category: MissionCategory;
  xp: number;
  status: MissionStatus;
  steps: MissionStep[];
  /** Questions answered in the completion report. Older missions may not have any. */
  checkIn?: CheckInQuestion[];
  /** Business basics this mission sets up. Completing it ticks them off. */
  foundations?: Foundation[];
  report?: MissionReport;
  source: "ai" | "user" | "advisor";
  createdAt: string;
  completedAt?: string;
}

export interface AdvisorMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Business area the advisor diagnosed, from the reply's "AREA:" line. */
  area?: MissionCategory | null;
  /** How many missions were created from this reply. */
  missionsAdded?: number;
  error?: boolean;
}

export type EntryType = "income" | "expense";

export interface TreasuryEntry {
  id: string;
  type: EntryType;
  category: string;
  amount: number;
  /** Local date, "YYYY-MM-DD". */
  date: string;
  note: string;
  /** Where a sale happened (a SalesChannel name), for income entries. */
  channel?: string;
}

export type ActivityKind = "launch" | "promotion" | "event" | "ads" | "other";

/** Something the business did in a month (a launch, promo, event, new ads), to link to sales. */
export interface Activity {
  id: string;
  /** Local date, "YYYY-MM-DD". */
  date: string;
  kind: ActivityKind;
  title: string;
  /** What it cost, if anything, in the profile currency. */
  cost: number;
}

export interface MonthStats {
  key: string;
  label: string;
  income: number;
  expenses: number;
  net: number;
  /** Net as a share of income; null with no income. */
  margin: number | null;
  byCategory: { name: string; amount: number }[];
  byChannel: { name: string; amount: number }[];
  transactions: number;
}

export interface ActivityImpact {
  activityId: string;
  title: string;
  kind: ActivityKind;
  date: string;
  verdict: "boosted" | "no clear effect" | "hurt" | "too early";
  explanation: string;
  /** Average daily sales in the 7 days before and after the activity. */
  before: number | null;
  after: number | null;
}

/** The "Month Wrapped" story for one month. Saved so it can be replayed. */
export interface MonthlyReport {
  month: string;
  createdAt: string;
  stats: MonthStats;
  previous: MonthStats | null;
  history: { key: string; label: string; income: number; expenses: number; net: number }[];
  overheads: number;
  headline: string;
  stories: { sales: string; costs: string; overheads: string; profit: string };
  activities: ActivityImpact[];
  problems: { title: string; rootCause: string; evidence: string }[];
  closing: string;
}

/** Something the business sells, with what one unit costs to make or buy. */
export interface Product {
  id: string;
  name: string;
  price: number;
  /** Ingredients, materials and packaging for one unit. */
  unitCost: number;
  /** Units in stock. Undefined until the owner starts tracking this product's stock. */
  stock?: number;
  /** Warn when stock falls to this. Undefined: about two weeks of recent sales. */
  reorderAt?: number;
}

export type StockMoveKind = "restock" | "sold" | "count";

/** One change to a product's stock. */
export interface StockMove {
  id: string;
  productId: string;
  /** Local date, "YYYY-MM-DD". */
  date: string;
  kind: StockMoveKind;
  /** Units in (positive) or out (negative). For a count, the difference it made. */
  qty: number;
  note?: string;
}

/** A place the business sells through, and what that place takes per sale. */
export interface SalesChannel {
  id: string;
  name: string;
  /** Commission as a percentage of the price, e.g. 30 for 30%. */
  feePercent: number;
  /** Fixed fee per order, in the profile currency. */
  feeFixed: number;
}

/** A fixed monthly cost that is paid whether or not anything sells. */
export interface Overhead {
  id: string;
  name: string;
  amount: number;
}
