"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_PREFS, worldAllowed, type Prefs, type WorldSpot } from "./appearance";
import { FOUNDATIONS } from "./categories";
import { effectiveRevenue } from "./finance";
import { levelInfo } from "./levels";
import type { RestockPlan } from "./ai/shared";
import type { StudioItem } from "./studio";
import type {
  Activity,
  AdvisorMessage,
  BusinessProfile,
  Foundation,
  Insight,
  Mission,
  MissionReport,
  MonthlyReport,
  Overhead,
  Product,
  RevenueReport,
  SalesChannel,
  StockMove,
  TreasuryEntry,
} from "./types";

export interface Celebration {
  id: string;
  xp: number;
  /** What earned it: a mission title or a sales milestone. */
  title: string;
  levelUp: { level: number; title: string } | null;
}

export interface MascotRequest {
  /** A message to send as soon as the panel opens, e.g. "Walk me through SSM registration". */
  prompt: string | null;
}

/** What one stock change did, so it can be taken back exactly. `delta` is the change in stock on hand. */
export interface StockChange {
  productId: string;
  moveId: string;
  entryId?: string;
  delta: number;
  /** A first count starts tracking; taking it back stops tracking again. */
  untracked?: boolean;
}

interface PolarisState {
  profile: BusinessProfile;
  xp: number;
  revenue: RevenueReport;
  missions: Mission[];
  insights: Insight[];
  entries: TreasuryEntry[];
  products: Product[];
  channels: SalesChannel[];
  overheads: Overhead[];
  /** Cash in the bank right now, for runway. Null until the user enters it. */
  cashOnHand: number | null;
  /** Money lessons passed (quiz answered correctly). Each gives XP once. */
  lessonsDone: string[];
  /** First-visit tours already shown (finished or skipped), e.g. "treasury". */
  toursSeen: string[];
  /** Look and feel: classic dashboard or interactive world, and the colour theme. */
  prefs: Prefs;
  activities: Activity[];
  /** Every change to stock, newest first: restocks, sales and counts. */
  stockMoves: StockMove[];
  /** Lumi's latest restock plan and when it was made, so the rest of Polaris quotes the same numbers. */
  restockPlan: { at: string; plan: RestockPlan } | null;
  /** "Month Wrapped" stories by month key ("2026-10"). */
  monthReports: Record<string, MonthlyReport>;
  /** Creative Studio results saved to the Idea library, newest first. */
  studioItems: StudioItem[];
  advisorThread: AdvisorMessage[];
  /** Transient (not persisted): the XP toast or level-up dialog on screen. */
  celebration: Celebration | null;
  /** Transient (not persisted): whether the mascot chat panel is open, and what to ask. */
  mascot: { open: boolean } & MascotRequest;
  /** Transient: the advisor reply streaming in right now ("" while waiting), or null when idle. */
  chatStreaming: string | null;
  setChatStreaming: (text: string | null) => void;
  /** Transient: what the user is looking at (e.g. the month sheet they're editing), sent with chat messages. */
  pageContext: string | null;
  setPageContext: (context: string | null) => void;
  /** Transient: Lumi is already on screen in a scene (the studio room), so the corner button hides. */
  mascotOnStage: boolean;
  setMascotOnStage: (on: boolean) => void;
  /**
   * Transient, interactive world: the spot you last walked back to the desk from (so the desk
   * zooms out of it), and a count of trips back so the zoom replays each time.
   */
  deskTrip: { from: WorldSpot | null; n: number };
  backToDesk: (from: WorldSpot | null) => void;

  updateProfile: (patch: Partial<BusinessProfile>) => void;
  updateRevenue: (revenue: Pick<RevenueReport, "lifetime" | "bestMonth">) => void;
  addMissions: (missions: Mission[]) => void;
  removeMission: (id: string) => void;
  toggleStep: (missionId: string, stepId: string) => void;
  /** Completes a mission after its report passed review. Awards XP and saves reported numbers. */
  completeMission: (id: string, report: MissionReport, insights: Omit<Insight, "missionTitle" | "at">[]) => void;
  reopenMission: (id: string) => void;
  dismissCelebration: () => void;
  openMascot: (prompt?: string) => void;
  closeMascot: () => void;
  takeMascotPrompt: () => string | null;
  addAdvisorMessage: (message: AdvisorMessage) => void;
  updateAdvisorMessage: (id: string, patch: Partial<AdvisorMessage>) => void;
  clearAdvisorThread: () => void;
  addEntry: (entry: TreasuryEntry) => void;
  /** Adds many entries at once (statement or Excel import). */
  addEntries: (entries: TreasuryEntry[]) => void;
  updateEntry: (id: string, patch: Partial<TreasuryEntry>) => void;
  removeEntry: (id: string) => void;
  /** Replaces every entry in a month, e.g. when an edited Excel sheet is uploaded back. */
  replaceMonthEntries: (month: string, entries: TreasuryEntry[]) => void;
  saveActivity: (activity: Activity) => void;
  removeActivity: (id: string) => void;
  saveMonthReport: (report: MonthlyReport) => void;
  saveStudioItem: (item: StudioItem) => void;
  removeStudioItem: (id: string) => void;
  saveProduct: (product: Product) => void;
  removeProduct: (id: string) => void;
  /**
   * Stock in. With `cost`, also logs what it cost as a Treasury expense ("Ingredients / stock").
   */
  restock: (productId: string, qty: number, opts: { date: string; cost?: number; note?: string }) => StockChange | null;
  /** Stock out through sales. With `sale`, also logs the money as Treasury income. */
  recordSold: (productId: string, qty: number, opts: { date: string; sale?: { amount: number; channel?: string } }) => StockChange | null;
  /** Sets a product's stock to what was actually counted (and starts tracking it). */
  countStock: (productId: string, actual: number, date: string) => StockChange | null;
  /** Takes back one restock, sale or count: its history line, its Treasury entry and its effect on stock. */
  undoStockChange: (change: StockChange) => void;
  setReorderAt: (productId: string, level: number | undefined) => void;
  saveChannel: (channel: SalesChannel) => void;
  removeChannel: (id: string) => void;
  saveOverhead: (overhead: Overhead) => void;
  removeOverhead: (id: string) => void;
  setCashOnHand: (amount: number | null) => void;
  saveRestockPlan: (plan: RestockPlan | null) => void;
  /** Marks a lesson passed and awards its XP, once. */
  passLesson: (id: string, title: string, xp: number) => void;
  markTourSeen: (id: string) => void;
  setPrefs: (patch: Partial<Prefs>) => void;
  reset: () => void;
}

/** Inserts or replaces by id. */
function upsert<T extends { id: string }>(list: T[], item: T) {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
}

const DEFAULT_CHANNELS: SalesChannel[] = [{ id: "direct", name: "Direct sales", feePercent: 0, feeFixed: 0 }];

const emptyProfile: BusinessProfile = {
  ownerName: "",
  businessName: "",
  industry: null,
  stage: null,
  goal: null,
  description: "",
  country: "",
  foundations: null,
  currency: "USD",
  mascotName: "",
  onboarded: false,
};

const emptyRevenue: RevenueReport = { lifetime: 0, bestMonth: 0, updatedAt: null };

interface Progress {
  xp: number;
  revenue: RevenueReport;
  entries: TreasuryEntry[];
}

/** Builds the celebration for a change in XP or sales, with a level-up if one happened. */
function celebrate(before: Progress, after: Progress, currency: string, title: string): Celebration | null {
  const a = levelInfo(before.xp, effectiveRevenue(before.revenue, before.entries), currency);
  const b = levelInfo(after.xp, effectiveRevenue(after.revenue, after.entries), currency);
  const gained = after.xp - before.xp;
  const levelUp = b.level > a.level ? { level: b.level, title: b.title } : null;
  if (!gained && !levelUp) return null;
  return { id: newId(), xp: gained, title, levelUp };
}

/** Everything that is saved in the browser (and goes into a backup file). The rest is per-visit. */
export function savedData(s: PolarisState) {
  return {
    profile: s.profile,
    xp: s.xp,
    revenue: s.revenue,
    missions: s.missions,
    insights: s.insights,
    entries: s.entries,
    products: s.products,
    channels: s.channels,
    overheads: s.overheads,
    cashOnHand: s.cashOnHand,
    lessonsDone: s.lessonsDone,
    toursSeen: s.toursSeen,
    prefs: s.prefs,
    activities: s.activities,
    stockMoves: s.stockMoves,
    restockPlan: s.restockPlan,
    monthReports: s.monthReports,
    studioItems: s.studioItems,
    advisorThread: s.advisorThread,
  };
}

export type SavedData = ReturnType<typeof savedData>;

export const usePolaris = create<PolarisState>()(
  persist(
    (set, get) => ({
      profile: emptyProfile,
      xp: 0,
      revenue: emptyRevenue,
      missions: [],
      insights: [],
      entries: [],
      products: [],
      channels: DEFAULT_CHANNELS,
      overheads: [],
      cashOnHand: null,
      lessonsDone: [],
      toursSeen: [],
      prefs: DEFAULT_PREFS,
      activities: [],
      stockMoves: [],
      restockPlan: null,
      monthReports: {},
      studioItems: [],
      advisorThread: [],
      celebration: null,
      mascot: { open: false, prompt: null },
      chatStreaming: null,
      setChatStreaming: (text) => set({ chatStreaming: text }),
      pageContext: null,
      setPageContext: (context) => set({ pageContext: context }),
      mascotOnStage: false,
      setMascotOnStage: (on) => set({ mascotOnStage: on }),
      deskTrip: { from: null, n: 0 },
      backToDesk: (from) => set((s) => ({ deskTrip: { from, n: s.deskTrip.n + 1 } })),

      updateProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),

      updateRevenue: ({ lifetime, bestMonth }) =>
        set((s) => {
          const revenue: RevenueReport = {
            // A best month can't exceed total sales.
            lifetime: Math.max(0, lifetime, bestMonth),
            bestMonth: Math.max(0, bestMonth),
            updatedAt: new Date().toISOString(),
          };
          const celebration = celebrate(s, { ...s, revenue }, s.profile.currency, "Sales milestone reached");
          return { revenue, celebration: celebration ?? s.celebration };
        }),

      addMissions: (missions) => set((s) => ({ missions: [...s.missions, ...missions] })),
      // Deleting a completed mission keeps its XP: it was earned.
      removeMission: (id) => set((s) => ({ missions: s.missions.filter((x) => x.id !== id) })),

      // Steps only track progress. Completing a mission needs a report.
      toggleStep: (missionId, stepId) =>
        set((s) => {
          const m = s.missions.find((x) => x.id === missionId);
          if (!m || m.status === "done") return {};
          const steps = m.steps.map((st) => (st.id === stepId ? { ...st, done: !st.done } : st));
          const status = steps.some((st) => st.done) ? "active" : "todo";
          return { missions: s.missions.map((x) => (x.id === m.id ? { ...m, steps, status } : x)) };
        }),

      completeMission: (id, report, newInsights) =>
        set((s) => {
          const m = s.missions.find((x) => x.id === id);
          if (!m || m.status === "done") return {};
          const now = new Date().toISOString();
          const done: Mission = {
            ...m,
            status: "done",
            completedAt: now,
            report,
            steps: m.steps.map((st) => ({ ...st, done: true })),
          };

          // Setting up a basic ticks it off the checklist.
          let profile = s.profile;
          if (m.foundations?.length) {
            const has = new Set<Foundation>([...(s.profile.foundations ?? []), ...m.foundations]);
            profile = { ...s.profile, foundations: FOUNDATIONS.map((f) => f.id).filter((f) => has.has(f)) };
          }

          // Keep the latest value per label.
          const added = newInsights.map((i) => ({ ...i, missionTitle: m.title, at: now }));
          const labels = new Set(added.map((i) => i.label.toLowerCase()));
          const insights = [...added, ...s.insights.filter((i) => !labels.has(i.label.toLowerCase()))].slice(0, 40);

          const xp = s.xp + m.xp;
          return {
            missions: s.missions.map((x) => (x.id === id ? done : x)),
            profile,
            insights,
            xp,
            celebration: celebrate(s, { ...s, xp }, s.profile.currency, m.title),
          };
        }),

      reopenMission: (id) =>
        set((s) => {
          const m = s.missions.find((x) => x.id === id);
          if (!m || m.status !== "done") return {};
          const reopened: Mission = {
            ...m,
            status: "todo",
            completedAt: undefined,
            report: undefined,
            steps: m.steps.map((st) => ({ ...st, done: false })),
          };
          return { missions: s.missions.map((x) => (x.id === id ? reopened : x)), xp: Math.max(0, s.xp - m.xp) };
        }),

      dismissCelebration: () => set({ celebration: null }),

      openMascot: (prompt) => set({ mascot: { open: true, prompt: prompt ?? null } }),
      closeMascot: () => set({ mascot: { open: false, prompt: null } }),
      takeMascotPrompt: () => {
        const prompt = get().mascot.prompt;
        if (prompt) set((s) => ({ mascot: { ...s.mascot, prompt: null } }));
        return prompt;
      },

      addAdvisorMessage: (message) => set((s) => ({ advisorThread: [...s.advisorThread, message] })),
      updateAdvisorMessage: (id, patch) =>
        set((s) => ({ advisorThread: s.advisorThread.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      clearAdvisorThread: () => set({ advisorThread: [] }),

      // Logged sales count toward level milestones, so a sale can level the business up.
      addEntry: (entry) =>
        set((s) => {
          const entries = [entry, ...s.entries];
          const celebration =
            entry.type === "income"
              ? celebrate(s, { ...s, entries }, s.profile.currency, "Sales milestone reached")
              : null;
          return { entries, celebration: celebration ?? s.celebration };
        }),
      addEntries: (added) =>
        set((s) => {
          const entries = [...added, ...s.entries];
          const celebration = added.some((e) => e.type === "income")
            ? celebrate(s, { ...s, entries }, s.profile.currency, "Sales milestone reached")
            : null;
          return { entries, celebration: celebration ?? s.celebration };
        }),
      updateEntry: (id, patch) =>
        set((s) => ({ entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      removeEntry: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
      replaceMonthEntries: (month, monthEntries) =>
        set((s) => ({ entries: [...monthEntries, ...s.entries.filter((e) => !e.date.startsWith(month))] })),

      saveActivity: (activity) => set((s) => ({ activities: upsert(s.activities, activity) })),
      removeActivity: (id) => set((s) => ({ activities: s.activities.filter((a) => a.id !== id) })),
      saveMonthReport: (report) => set((s) => ({ monthReports: { ...s.monthReports, [report.month]: report } })),
      saveStudioItem: (item) => set((s) => ({ studioItems: [item, ...s.studioItems.filter((x) => x.id !== item.id)].slice(0, 60) })),
      removeStudioItem: (id) => set((s) => ({ studioItems: s.studioItems.filter((x) => x.id !== id) })),

      saveProduct: (product) => set((s) => ({ products: upsert(s.products, product) })),
      removeProduct: (id) => set((s) => ({ products: s.products.filter((p) => p.id !== id) })),

      restock: (productId, qty, { date, cost, note }) => {
        const p = get().products.find((x) => x.id === productId);
        if (!p || !(qty > 0)) return null;
        const move: StockMove = { id: newId(), productId, date, kind: "restock", qty, note };
        const entry: TreasuryEntry | null =
          cost && cost > 0 ? { id: newId(), type: "expense", category: "Ingredients / stock", amount: cost, date, note: `Restock: ${p.name} × ${qty}` } : null;
        set((s) => ({
          products: s.products.map((x) => (x.id === productId ? { ...x, stock: (x.stock ?? 0) + qty } : x)),
          stockMoves: [move, ...s.stockMoves].slice(0, 2000),
          entries: entry ? [entry, ...s.entries] : s.entries,
        }));
        return { productId, moveId: move.id, entryId: entry?.id, delta: qty };
      },

      recordSold: (productId, qty, { date, sale }) => {
        const p = get().products.find((x) => x.id === productId);
        if (!p || !(qty > 0)) return null;
        const move: StockMove = { id: newId(), productId, date, kind: "sold", qty: -qty };
        const entry: TreasuryEntry | null =
          sale && sale.amount > 0
            ? { id: newId(), type: "income", category: "Sales", amount: sale.amount, date, note: `${p.name} × ${qty}`, channel: sale.channel }
            : null;
        // Stock can't go below nothing; selling more than was recorded means the count was off.
        const before = p.stock ?? 0;
        const after = Math.max(0, before - qty);
        set((s) => ({
          products: s.products.map((x) => (x.id === productId ? { ...x, stock: after } : x)),
          stockMoves: [move, ...s.stockMoves].slice(0, 2000),
          entries: entry ? [entry, ...s.entries] : s.entries,
        }));
        return { productId, moveId: move.id, entryId: entry?.id, delta: after - before };
      },

      countStock: (productId, actual, date) => {
        const p = get().products.find((x) => x.id === productId);
        if (!p || !(actual >= 0)) return null;
        const diff = actual - (p.stock ?? 0);
        const move: StockMove = { id: newId(), productId, date, kind: "count", qty: diff };
        set((s) => ({
          products: s.products.map((x) => (x.id === productId ? { ...x, stock: actual } : x)),
          stockMoves: [move, ...s.stockMoves].slice(0, 2000),
        }));
        return { productId, moveId: move.id, delta: diff, untracked: p.stock === undefined };
      },

      undoStockChange: ({ productId, moveId, entryId, delta, untracked }) =>
        set((s) => ({
          products: s.products.map((x) =>
            x.id === productId ? { ...x, stock: untracked ? undefined : Math.max(0, (x.stock ?? 0) - delta) } : x,
          ),
          stockMoves: s.stockMoves.filter((m) => m.id !== moveId),
          entries: entryId ? s.entries.filter((e) => e.id !== entryId) : s.entries,
        })),

      setReorderAt: (productId, level) =>
        set((s) => ({ products: s.products.map((x) => (x.id === productId ? { ...x, reorderAt: level } : x)) })),
      saveChannel: (channel) => set((s) => ({ channels: upsert(s.channels, channel) })),
      removeChannel: (id) => set((s) => ({ channels: s.channels.filter((c) => c.id !== id) })),
      saveOverhead: (overhead) => set((s) => ({ overheads: upsert(s.overheads, overhead) })),
      removeOverhead: (id) => set((s) => ({ overheads: s.overheads.filter((o) => o.id !== id) })),
      setCashOnHand: (amount) => set({ cashOnHand: amount }),
      saveRestockPlan: (plan) => set({ restockPlan: plan ? { at: new Date().toISOString(), plan } : null }),

      passLesson: (id, title, xp) =>
        set((s) => {
          if (s.lessonsDone.includes(id)) return {};
          const next = s.xp + xp;
          return {
            lessonsDone: [...s.lessonsDone, id],
            xp: next,
            celebration: celebrate(s, { ...s, xp: next }, s.profile.currency, `Lesson: ${title}`),
          };
        }),
      markTourSeen: (id) => set((s) => (s.toursSeen.includes(id) ? {} : { toursSeen: [...s.toursSeen, id] })),
      setPrefs: (patch) => set((s) => ({ prefs: { ...s.prefs, ...patch } })),

      reset: () =>
        set({
          profile: emptyProfile,
          xp: 0,
          revenue: emptyRevenue,
          missions: [],
          insights: [],
          entries: [],
          products: [],
          channels: DEFAULT_CHANNELS,
          overheads: [],
          cashOnHand: null,
          lessonsDone: [],
          toursSeen: [],
          activities: [],
          stockMoves: [],
          restockPlan: null,
          monthReports: {},
          studioItems: [],
          advisorThread: [],
          celebration: null,
        }),
    }),
    {
      name: "polaris",
      version: 1,
      partialize: savedData,
      // Deep-merge objects so fields added after a user's data was saved get their defaults.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<PolarisState>;
        return {
          ...current,
          ...saved,
          profile: { ...current.profile, ...saved.profile },
          revenue: { ...current.revenue, ...saved.revenue },
          prefs: { ...current.prefs, ...saved.prefs },
        };
      },
      // Rehydrated by useHydrated() so the server and first client render match.
      skipHydration: true,
    },
  ),
);

// `persist` is undefined on the server (no localStorage), hence the optional chaining.
function subscribeHydration(onChange: () => void) {
  const persistApi = usePolaris.persist;
  if (!persistApi) return () => {};
  const unsub = persistApi.onFinishHydration(onChange);
  if (!persistApi.hasHydrated()) void persistApi.rehydrate();
  return unsub;
}

/** True once saved data has been loaded from the browser. Render placeholders until then. */
export function useHydrated() {
  return useSyncExternalStore(
    subscribeHydration,
    () => usePolaris.persist?.hasHydrated() ?? false,
    () => false,
  );
}

/** True when the interactive 3D world is on (never with the professional theme). */
export function useWorld() {
  const hydrated = useHydrated();
  const on = usePolaris((s) => s.prefs.experience === "world" && worldAllowed(s.prefs.theme));
  return hydrated && on;
}

/** True with the professional theme: no cartoon art, plain layouts. */
export function useProfessional() {
  return usePolaris((s) => s.prefs.theme === "professional");
}

export function newId() {
  return crypto.randomUUID();
}

export function mascotName(profile: BusinessProfile) {
  return profile.mascotName.trim() || "Lumi";
}

/** Basics with no mission yet (open or done) and not already in place. */
export function uncoveredFoundations(profile: BusinessProfile, missions: Mission[]): Foundation[] {
  const covered = new Set<Foundation>([...(profile.foundations ?? []), ...missions.flatMap((m) => m.foundations ?? [])]);
  return FOUNDATIONS.map((f) => f.id).filter((f) => !covered.has(f));
}
