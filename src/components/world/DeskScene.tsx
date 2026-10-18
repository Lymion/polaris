"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ArrowRight, ClipboardList, Monitor, Play, Plus, Sparkles } from "lucide-react";
import { useActivityFeed, when } from "@/components/dashboard/BusinessStory";
import { pickNext } from "@/components/dashboard/MissionFocus";
import { Mascot } from "@/components/mascot/Mascot";
import { useWrapped, WrappedOverlays } from "@/components/treasury/monthTools";
import { WeekNote } from "@/components/week/YourWeek";
import type { WorldSpot } from "@/lib/appearance";
import { CATEGORY_LABELS } from "@/lib/categories";
import { expensesByCategory, monthSeries } from "@/lib/finance";
import { daysText, type StockSummary } from "@/lib/inventory";
import { formatMoney, monthKey } from "@/lib/money";
import { mascotName, usePolaris } from "@/lib/store";
import type { TreasuryEntry } from "@/lib/types";
import { useLevel } from "@/lib/useLevel";
import { useStock } from "@/lib/useStock";
import { BookStack, DeskLamp, GiftBox, Mug, SkyWindow, StockBoxesArt, StringLights, useNow, VitalsShelf, WallClock } from "./DeskProps";

/** The places you can walk up to. The planner leads into Treasury too. */
type Spot = WorldSpot | "planner";

/** The scene is drawn at this size and scaled to fit, so it keeps its proportions on any screen. */
const STAGE = { w: 1440, h: 810 };

// Each origin is the middle of the thing you walk up to, as a share of the stage.
const TARGETS: Record<Spot, { href: string; origin: string }> = {
  board: { href: "/missions", origin: "14.6% 36%" },
  monitor: { href: "/treasury", origin: "47.2% 52%" },
  easel: { href: "/studio", origin: "91% 46%" },
  planner: { href: "/treasury", origin: "74% 24%" },
  stock: { href: "/stock", origin: "96% 91%" },
};

/**
 * Home in the interactive world: your desk at night (or by day, or in pink, depending on the
 * theme). The mission board opens Missions, the computer opens Treasury and the easel opens the
 * Creative Studio. Everything else shows how the business is doing: the window's constellation is
 * your level, the planner lists what you did this month, the present on the desk is the month's
 * Wrapped, the shelf holds your finished missions, your cash and a plant that grows as you do,
 * and Lumi has a little desk of its own, with something to say when you come over.
 */
export function DeskScene() {
  const router = useRouter();
  // Bumped by the shell each time you walk back here; the scene stays mounted in between.
  const trip = usePolaris((s) => s.deskTrip);
  const [leaving, setLeaving] = useState<{ spot: Spot; trip: number } | null>(null);
  // A zoom in only counts for the trip it started on, so coming back always clears it.
  const leavingTo = leaving?.trip === trip.n ? leaving.spot : null;
  const [frame, scale] = useFitScale();
  const vitals = useVitals();

  useEffect(() => {
    for (const t of Object.values(TARGETS)) router.prefetch(t.href);
  }, [router]);

  function go(spot: Spot) {
    if (leavingTo) return;
    // Only the desktop scene zooms; the stacked phone layout just goes.
    const zooms = window.matchMedia("(min-width: 64rem)").matches;
    setLeaving({ spot, trip: trip.n });
    setTimeout(() => router.push(TARGETS[spot].href), zooms ? 420 : 0);
  }

  const zoomSpot = leavingTo ?? trip.from;

  return (
    <>
      {/* The scene is the page; screen readers still get a title to start from. */}
      <h1 className="sr-only">Your desk</h1>
      {/* Desktop: the view from your chair, scaled to fit and standing on the bottom edge */}
      <div ref={frame} className="world-wall relative hidden h-[calc(100dvh-3.5rem)] min-h-[520px] overflow-hidden lg:flex lg:items-end lg:justify-center">
        <div className="relative shrink-0" style={{ width: STAGE.w, height: STAGE.h, zoom: scale ?? 1, visibility: scale ? undefined : "hidden" }}>
          <div
            key={trip.n}
            className={clsx("absolute inset-0", leavingTo && "world-zoom-in", !leavingTo && trip.from && "world-return")}
            style={{ transformOrigin: zoomSpot ? TARGETS[zoomSpot].origin : undefined }}
          >
            <RoomBack />

            {/* on the wall */}
            <SkyWindow className="absolute left-[430px] top-[64px] h-[376px] w-[500px]" level={vitals.level} />
            <div className="absolute left-[416px] top-[436px] h-[14px] w-[528px] rounded-sm shadow-[0_8px_12px_-6px_rgb(0_0_0/0.5)]" style={{ background: "var(--world-window-frame)" }} aria-hidden />
            <Board className="absolute left-[30px] top-[96px] h-[390px] w-[360px]" onOpen={() => go("board")} />
            <MonthPlanner className="absolute left-[948px] top-[70px] h-[250px] w-[234px]" onOpen={() => go("planner")} />
            <VitalsShelf className="absolute left-[950px] top-[340px]" {...vitals} />
            <WallClock className="absolute left-[1262px] top-[96px]" />

            {/* on the desk */}
            <DeskTop />
            <Glow className="left-[380px] top-[200px] h-[480px] w-[600px]" color="var(--world-screen-glow)" />
            {/* the lamp's beam, softened at the edges */}
            <div className="pointer-events-none absolute left-[140px] top-[530px] h-[160px] w-[270px] blur-[6px]" aria-hidden>
              <div
                className="h-full w-full"
                style={{ clipPath: "polygon(62px 7px, 260px 110px, 170px 160px, 12px 41px)", background: "radial-gradient(ellipse at 18% 12%, var(--world-lamp-light), transparent 75%)" }}
              />
            </div>
            <Glow className="left-[140px] top-[612px] h-[80px] w-[300px]" color="var(--world-lamp-light)" />
            <DeskLamp className="absolute left-[10px] top-[466px]" />
            <WrappedGift className="absolute left-[214px] top-[582px]" />
            <Mug className="absolute left-[400px] top-[578px]" />
            <Computer className="absolute left-[480px] top-[286px] w-[400px]" stand onOpen={() => go("monitor")} />
            {/* Your Week, stuck to the corner of the screen */}
            <WeekNote className="absolute left-[826px] top-[262px]" />
            <LumiDesk className="absolute left-[892px] top-[532px]" />

            {/* standing on the floor: the easel, with the stock boxes stacked against its leg */}
            <Easel className="absolute left-[1190px] top-[226px]" onOpen={() => go("easel")} />
            <StockBoxes className="absolute left-[1334px] top-[672px]" onOpen={() => go("stock")} />

            <StringLights className="absolute left-[-200px] top-0" />
            <div className="pointer-events-none absolute -inset-x-[1600px] -top-[900px] bottom-0" style={{ background: "radial-gradient(ellipse 55% 75% at 50% 62%, transparent 55%, var(--world-vignette))" }} aria-hidden />
          </div>
        </div>
      </div>

      {/* Phones and tablets: the same things, stacked */}
      <div className="world-wall min-h-[calc(100dvh-3.5rem)] space-y-5 px-4 pb-28 pt-5 lg:hidden">
        <Lumi />
        <WeekNote card />
        <Board onOpen={() => go("board")} />
        <Computer onOpen={() => go("monitor")} />
        <StudioCard onOpen={() => go("easel")} />
        <StockBoxes card onOpen={() => go("stock")} />
        <MonthPlanner className="relative w-full" onOpen={() => go("planner")} />
        <WrappedGift card />
        <div className="flex justify-center rounded-2xl bg-surface-900/40 px-2 pb-3 pt-4 ring-1 ring-line">
          <VitalsShelf {...vitals} />
        </div>
      </div>
    </>
  );
}

/** How much to scale the stage so all of it fits the space it's given. Null until measured. */
function useFitScale() {
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      // Zero while the page is kept hidden in the background; keep the last good size.
      if (width && height) setScale(Math.min(width / STAGE.w, height / STAGE.h));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [frame, scale] as const;
}

/** What the shelf and the window show: missions finished, cash in hand and your level. */
function useVitals() {
  const done = usePolaris((s) => s.missions.filter((m) => m.status === "done").length);
  const cashOnHand = usePolaris((s) => s.cashOnHand);
  const fixedCosts = usePolaris((s) => s.overheads.reduce((sum, o) => sum + o.amount, 0));
  const currency = usePolaris((s) => s.profile.currency);
  const { level } = useLevel();
  const cash = cashOnHand ?? 0;
  return {
    done,
    level,
    cash: cashOnHand === null ? "No cash noted" : formatMoney(cash, currency, { compact: true }),
    // Full at six months of fixed costs.
    cashFill: fixedCosts > 0 ? cash / (fixedCosts * 6) : cash > 0 ? 0.5 : 0,
  };
}

function activate(handler: () => void) {
  return {
    role: "button" as const,
    tabIndex: 0,
    onClick: handler,
    onKeyDown: (e: KeyboardEvent) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), handler()),
  };
}

function Glow({ className, color }: { className: string; color: string }) {
  return <div className={clsx("pointer-events-none absolute", className)} style={{ background: `radial-gradient(closest-side, ${color}, transparent)` }} aria-hidden />;
}

/**
 * The back wall and the floor beside the desk, with a rug for the easel. They run past the
 * stage's edges so wide screens never show where the drawing stops.
 */
function RoomBack() {
  return (
    <div aria-hidden>
      <div className="world-wall absolute -inset-x-[1600px] -top-[900px] bottom-0" />
      <Glow className="left-[170px] top-[-300px] h-[820px] w-[1100px]" color="var(--world-light)" />
      <div className="world-floor absolute -inset-x-[1600px] -bottom-[300px] top-[690px]" />
      <div className="absolute -inset-x-[1600px] top-[678px] h-[12px] bg-black/20" />
      {/* the desk's shadow on the floor */}
      <div
        className="absolute left-[1133px] top-[690px] h-[120px] w-[150px] bg-linear-to-r from-black/30 to-transparent"
        style={{ clipPath: "polygon(7px 0, 100% 0, 100% 100%, 47px 100%)" }}
      />
      <div className="absolute left-[1160px] top-[740px] h-[56px] w-[300px] rounded-[50%] opacity-85 shadow-[inset_0_0_0_8px_rgb(255_255_255/0.15)]" style={{ background: "var(--room-rug)" }} />
    </div>
  );
}

/** The desk top you're sitting at. It runs off the left edge; its right end recedes towards the wall. */
function DeskTop() {
  return (
    <div aria-hidden>
      <div className="world-desk absolute left-[-1600px] top-[600px] h-[300px] w-[2810px]" style={{ clipPath: "polygon(0 0, 2710px 0, 2810px 100%, 0 100%)" }} />
      <div className="world-desk-glow absolute left-[-1600px] top-[603px] h-[40px] w-[2724px]" style={{ clipPath: "polygon(0 0, 2711px 0, 2724px 100%, 0 100%)" }} />
      <div className="world-desk-edge absolute left-[-1600px] top-[600px] h-[3px] w-[2711px]" />
      <div className="absolute left-[1108px] top-[600px] h-[300px] w-[110px] bg-black/35" style={{ clipPath: "polygon(2px 0, 6px 0, 106px 100%, 102px 100%)" }} />
      {/* the front edge, nearest you */}
      <div className="absolute left-[-1600px] top-[784px] h-[120px] w-[2771px] border-t-2 border-white/10 bg-black/30" />
    </div>
  );
}

/** The mission board: the mission to do next and two after it, pinned to cork. */
function Board({ className, onOpen }: { className?: string; onOpen: () => void }) {
  const missions = usePolaris((s) => s.missions);
  const open = missions.filter((m) => m.status !== "done");
  const featured = pickNext(open);
  const rest = open.filter((m) => m !== featured).slice(0, 2);
  const stepsDone = featured ? featured.steps.filter((s) => s.done).length : 0;

  return (
    <div className={clsx("world-object world-frame world-cork relative flex flex-col items-start rounded-lg p-5", className)} aria-label="Mission board: open Missions" {...activate(onOpen)}>
      <div className="world-paper world-pin relative inline-flex items-center gap-1.5 rounded-sm px-3 py-1 text-[13px] font-extrabold uppercase tracking-[0.14em]" style={{ rotate: "-2deg" }}>
        <ClipboardList className="size-4" aria-hidden /> Missions
      </div>

      {featured ? (
        <div className="world-paper world-pin relative mt-5 w-full rounded-sm p-4" style={{ rotate: "0.6deg" }}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#a86a0b]">
            Up next · {CATEGORY_LABELS[featured.category]} · +{featured.xp} XP
          </p>
          <p className="mt-1 line-clamp-2 text-base font-bold leading-snug">{featured.title}</p>
          {featured.steps.length > 0 && (
            <>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-black/10">
                <div className="h-full rounded-full bg-[#2563eb]" style={{ width: `${Math.max(4, (stepsDone / featured.steps.length) * 100)}%` }} />
              </div>
              <p className="mt-1 text-xs text-[#4a3a2c]">
                {stepsDone} of {featured.steps.length} steps
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="world-paper world-pin relative mt-5 w-full rounded-sm p-4 text-sm">No missions pinned yet. Walk up to the board to plan your first ones.</div>
      )}

      {rest.length > 0 && (
        <div className="mt-5 grid w-full grid-cols-2 gap-4">
          {rest.map((m, i) => (
            <div key={m.id} className="relative rounded-sm p-3 text-[#2b2118] shadow-[0_8px_14px_-8px_rgb(0_0_0/0.5)]" style={{ rotate: i ? "1.5deg" : "-1.2deg", background: i ? "#c7e0ff" : "#fff3c4" }}>
              <span className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rounded-full bg-[#ef4444] shadow" aria-hidden />
              <p className="line-clamp-3 text-[13px] font-semibold leading-snug">{m.title}</p>
              <p className="mt-1 text-[11px] font-bold text-[#a86a0b]">+{m.xp} XP</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto self-end pt-4">
        <p className="flex items-center gap-1 rounded-full bg-black/40 px-3 py-1 text-xs font-semibold text-white">
          {open.length} open <ArrowRight className="size-3.5" aria-hidden />
        </p>
      </div>
    </div>
  );
}

/** The computer on the desk, with this month's money on screen. */
function Computer({ className, stand = false, onOpen }: { className?: string; stand?: boolean; onOpen: () => void }) {
  const entries = usePolaris((s) => s.entries);
  const currency = usePolaris((s) => s.profile.currency);
  const fmt = (n: number) => formatMoney(n, currency, { compact: true });
  const months = monthSeries(entries, new Date(), 6);
  const cur = months[months.length - 1];
  const peak = Math.max(1, ...months.flatMap((m) => [m.income, m.expenses]));
  const top = expensesByCategory(entries, cur.key)[0];
  const stock = useStock().summary;
  const needs = [stock.out.length && `${stock.out.length} out`, stock.low.length && `${stock.low.length} low`].filter(Boolean).join(", ");

  return (
    <div className={clsx("world-object", className)} aria-label="Computer: open Treasury" {...activate(onOpen)}>
      <div className="world-bezel pb-6">
        <div className="overflow-hidden rounded-lg bg-surface-950 ring-1 ring-black/40">
          <div className="flex items-center gap-1.5 border-b border-line bg-surface-900 px-3 py-2">
            <span className="size-2.5 rounded-full bg-[#f87171]" />
            <span className="size-2.5 rounded-full bg-[#fbbf24]" />
            <span className="size-2.5 rounded-full bg-[#4ade80]" />
            <span className="ml-2 text-xs font-semibold text-muted">Treasury</span>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-4 p-4 sm:gap-5 sm:p-5">
            <div className="min-w-0">
              <p className="eyebrow text-faint">{cur.label} so far</p>
              <p className={clsx("mt-0.5 whitespace-nowrap text-2xl font-extrabold tabular-nums sm:text-3xl", cur.net < 0 ? "text-alert" : "text-growth")}>{fmt(cur.net)}</p>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[13px] tabular-nums">
                <span className="whitespace-nowrap text-growth">In {fmt(cur.income)}</span>
                <span className="whitespace-nowrap text-alert">Out {fmt(cur.expenses)}</span>
              </p>
              {top && (
                // Wraps rather than truncates: the amount is at the end, where an ellipsis would hide it.
                <p className="mt-2 text-xs text-muted">
                  Biggest cost: {top.category} {fmt(top.amount)}
                </p>
              )}
              {stock.tracked > 0 && (
                <p className="mt-1 text-xs text-muted">
                  Stock: {fmt(stock.value)}
                  {needs && <span className={stock.out.length ? "text-alert" : "text-caution"}> · {needs}</span>}
                </p>
              )}
            </div>
            <div className="flex h-24 items-end gap-1 sm:h-28 sm:gap-1.5" aria-hidden>
              {months.map((m) => (
                <div key={m.key} className="flex h-full items-end gap-0.5">
                  <span className="w-1.5 rounded-t-sm bg-[#C08418] sm:w-2" style={{ height: `${Math.max(3, (m.income / peak) * 100)}%` }} />
                  <span className="w-1.5 rounded-t-sm bg-[#4A7FE8] sm:w-2" style={{ height: `${Math.max(3, (m.expenses / peak) * 100)}%` }} />
                </div>
              ))}
            </div>
          </div>
          <p className="flex items-center gap-1.5 border-t border-line px-5 py-2.5 text-xs font-semibold text-star-300">
            <Monitor className="size-3.5" aria-hidden /> Open Treasury <ArrowRight className="size-3.5" aria-hidden />
          </p>
        </div>
      </div>
      {/* the stand, resting on the desk */}
      <div className={clsx("mx-auto w-14 bg-linear-to-b from-[#1f2937] to-[#0b1020]", stand ? "h-[70px]" : "h-6")} aria-hidden />
      <div className="mx-auto h-3.5 w-48 rounded-[50%] bg-[#1f2937] shadow-[0_8px_12px_rgb(0_0_0/0.45)]" aria-hidden />
    </div>
  );
}

/** The colours and slogan from your latest brand kit, or a friendly placeholder before there is one. */
function useStudioArt() {
  const items = usePolaris((s) => s.studioItems);
  const kit = items.find((i) => i.output.tool === "brand");
  const brand = kit?.output.tool === "brand" ? kit.output.brand : null;
  const hex = brand?.palette.map((p) => p.hex).filter((h) => /^#[0-9a-f]{6}$/i.test(h)) ?? [];
  return {
    saved: items.length,
    slogan: brand?.slogans[0] ?? "Your brand starts here",
    // main, accent, dark, light, supporting: the order the brand desk asks for
    paint: {
      hill: hex[0] ?? "#3b6fe0",
      sun: hex[1] ?? "#f5b942",
      ink: hex[2] ?? "#1e293b",
      sky: hex[3] ?? "#ffe9c7",
      far: hex[4] ?? hex[0] ?? "#22c55e",
    },
    swatches: hex.length >= 3 ? hex.slice(0, 5) : ["#f5b942", "#ec4899", "#3b6fe0", "#22c55e", "#a78bfa"],
  };
}

/** A small painting of your brand: its colours as a landscape, its slogan across the sky. */
function Painting({ className, slogan }: { className?: string; slogan?: boolean }) {
  const art = useStudioArt();
  const { paint } = art;
  return (
    <div className={clsx("relative overflow-hidden", className)} style={{ background: `linear-gradient(${paint.sky}, #ffffff)` }}>
      <span className="absolute right-[12%] top-[10%] aspect-square w-[24%] rounded-full" style={{ background: paint.sun }} />
      <span className="absolute -right-[30%] bottom-[-26%] h-[56%] w-[110%] rounded-[50%] opacity-80" style={{ background: paint.far }} />
      <span className="absolute -left-[28%] bottom-[-34%] h-[62%] w-[120%] rounded-[50%]" style={{ background: paint.hill }} />
      {slogan && (
        <p className="absolute inset-x-3 top-[34%] line-clamp-3 text-center font-brand text-[22px] leading-tight" style={{ color: paint.ink }}>
          {art.slogan}
        </p>
      )}
    </div>
  );
}

/** The Creative Studio's way in: an easel holding a painting of your brand, with your paints beside it. */
function Easel({ className, onOpen }: { className?: string; onOpen: () => void }) {
  const art = useStudioArt();
  return (
    <div className={clsx("world-object h-[550px] w-[240px]", className)} aria-label="Easel: open the Creative Studio" {...activate(onOpen)}>
      <svg className="absolute inset-0" viewBox="0 0 240 550" width={240} height={550} aria-hidden>
        <line x1={120} y1={36} x2={120} y2={520} stroke="var(--room-wood)" strokeWidth={10} strokeLinecap="round" opacity={0.7} />
        <line x1={44} y1={545} x2={110} y2={10} stroke="var(--room-wood)" strokeWidth={14} strokeLinecap="round" />
        <line x1={196} y1={545} x2={130} y2={10} stroke="var(--room-wood)" strokeWidth={14} strokeLinecap="round" />
        <line x1={48} y1={538} x2={112} y2={18} stroke="var(--room-wood-light)" strokeWidth={4} strokeLinecap="round" />
        <line x1={192} y1={538} x2={128} y2={18} stroke="var(--room-wood-light)" strokeWidth={4} strokeLinecap="round" />
        <line x1={66} y1={444} x2={174} y2={444} stroke="var(--room-wood)" strokeWidth={8} strokeLinecap="round" />
        <rect x={98} y={0} width={44} height={24} rx={5} fill="var(--room-wood)" />
        <rect x={4} y={290} width={232} height={16} rx={3} fill="var(--room-wood)" />
        <rect x={4} y={290} width={232} height={5} rx={2} fill="var(--room-wood-light)" />
      </svg>

      <div className="absolute left-[18px] top-[24px] h-[268px] w-[204px] rounded-[3px] bg-[#fffdf8] p-2.5 shadow-[0_16px_26px_-12px_rgb(0_0_0/0.6)] ring-1 ring-black/10">
        <Painting className="h-full w-full rounded-[2px]" slogan />
      </div>

      <div className="absolute inset-x-[34px] top-[318px] rounded-md bg-surface-900/90 px-2 py-1.5 text-center shadow-lg ring-1 ring-line">
        <p className="text-[13px] font-bold">Creative Studio</p>
        <p className="text-[11px] text-muted">{art.saved ? `${art.saved} idea${art.saved === 1 ? "" : "s"} saved` : "Brand, posts and videos"}</p>
      </div>

      {/* your paints, hung on the easel's crossbar: the brand's colours */}
      <svg className="absolute left-[66px] top-[392px]" viewBox="0 0 110 76" width={110} height={76} aria-hidden style={{ rotate: "-8deg" }}>
        <path d="M12 38 C8 14 44 2 70 6 C98 10 108 30 100 46 C94 58 80 50 72 58 C64 66 70 74 50 74 C28 74 14 60 12 38 Z" fill="#e9d5b5" stroke="#b08a5a" strokeWidth={2} />
        {art.swatches.map((c, i) => (
          <circle key={i} cx={[30, 50, 72, 88, 40][i]} cy={[26, 16, 18, 32, 44][i]} r={7} fill={c} stroke="rgb(0 0 0 / 0.15)" />
        ))}
        <path d="M60 70 L104 2" stroke="#8a5a2b" strokeWidth={4} strokeLinecap="round" />
        <path d="M100 8 L106 -2" stroke="#1f2937" strokeWidth={6} strokeLinecap="round" />
      </svg>
    </div>
  );
}

/** The studio on a phone: the same painting, as a card. */
function StudioCard({ onOpen }: { onOpen: () => void }) {
  const art = useStudioArt();
  return (
    <button type="button" onClick={onOpen} className="world-object world-wood flex w-full items-center gap-4 rounded-xl p-3 text-left text-white">
      <span className="shrink-0 rounded-[3px] bg-[#fffdf8] p-1.5 shadow-lg">
        <Painting className="size-20 rounded-[2px]" />
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-bold">Creative Studio</span>
        <span className="line-clamp-2 text-sm opacity-85">&ldquo;{art.slogan}&rdquo; · {art.saved ? `${art.saved} idea${art.saved === 1 ? "" : "s"} saved` : "Brand, posts and videos"}</span>
      </span>
      <ArrowRight className="ml-auto size-5 shrink-0" aria-hidden />
    </button>
  );
}

/**
 * What Lumi says from the desk: one thing worth talking about, and the question to ask. Stock
 * about to run out comes first, since it costs sales soonest.
 */
function lumiLine(entries: TreasuryEntry[], currency: string, stock: StockSummary): { text: string; prompt?: string } {
  const fmt = (n: number) => formatMoney(n, currency, { compact: true });
  const urgent = [...stock.out, ...stock.low.filter((l) => l.daysLeft !== null && l.daysLeft < 10)];
  if (urgent.length) {
    const first = urgent[0];
    // What an empty shelf costs, so it's clear why restocking comes first.
    const missed = first.perDay * 7 * first.margin.profit;
    const about =
      first.status === "out"
        ? `${first.product.name} is sold out${missed >= 1 ? `: about ${fmt(missed)} of profit missed each week` : ""}`
        : `${first.product.name} runs out in ${daysText(first.daysLeft)}`;
    const more = urgent.length > 1 ? `, and ${urgent.length - 1} more ${urgent.length === 2 ? "needs" : "need"} restocking` : "";
    return {
      text: `${about}${more}. Want me to plan a restock?`,
      prompt: `Help me plan a restock. ${urgent.map((l) => (l.status === "out" ? `${l.product.name} is sold out` : `${l.product.name} has ${l.onHand} left (${daysText(l.daysLeft)})`)).join("; ")}.`,
    };
  }
  const [cur] = monthSeries(entries, new Date(), 1);
  if (!cur.income && !cur.expenses) {
    return { text: "Nothing logged this month yet. Add your sales on the computer and I'll keep an eye on things." };
  }
  const top = expensesByCategory(entries, cur.key)[0];
  if (top && cur.expenses && top.amount / cur.expenses >= 0.4) {
    const share = Math.round((top.amount / cur.expenses) * 100);
    return {
      text: `${top.category} is ${share}% of your spending this month. Want ideas to bring it down?`,
      prompt: `${top.category} is ${share}% of my spending this month. How can I bring it down?`,
    };
  }
  if (cur.net < 0) {
    return {
      text: `You're ${fmt(-cur.net)} down so far this month. Want ideas to turn it around?`,
      prompt: `I'm ${fmt(-cur.net)} down so far this month. How can I turn it around?`,
    };
  }
  return {
    text: `You're ${fmt(cur.net)} up this month. Want to plan what to grow next?`,
    prompt: `I'm ${fmt(cur.net)} up this month. What should I grow next?`,
  };
}

/** What Lumi says, and asks for you if you tap it. */
function useLumiLine() {
  const entries = usePolaris((s) => s.entries);
  const currency = usePolaris((s) => s.profile.currency);
  const name = usePolaris((s) => mascotName(s.profile));
  const openMascot = usePolaris((s) => s.openMascot);
  const stock = useStock().summary;
  return { name, line: lumiLine(entries, currency, stock), openMascot };
}

/**
 * The shop's stock as a stack of boxes on the floor, with a label saying what needs restocking.
 * Opens the stockroom. On a phone it's a card instead.
 */
function StockBoxes({ className, card = false, onOpen }: { className?: string; card?: boolean; onOpen: () => void }) {
  const currency = usePolaris((s) => s.profile.currency);
  const stock = useStock().summary;
  const fmt = (n: number) => formatMoney(n, currency, { compact: true });
  const needs = stock.out.length + stock.low.length;
  const status = !stock.tracked ? "Start tracking" : needs ? `${needs} to restock` : "All stocked";
  const tone = !stock.tracked ? "text-[#6b5643]" : stock.out.length ? "text-[#c02626]" : needs ? "text-[#b45309]" : "text-[#15803d]";

  if (card) {
    return (
      <button type="button" onClick={onOpen} className="world-object flex w-full items-center gap-4 rounded-2xl bg-surface-900/80 p-3 text-left ring-1 ring-line">
        <StockBoxesArt className="h-[64px] w-[48px] shrink-0" />
        <span className="min-w-0">
          <span className="block font-bold">Stock</span>
          <span className="text-sm text-muted">{stock.tracked ? `${fmt(stock.value)} on the shelf · ${status.toLowerCase()}` : "Count your products to start tracking"}</span>
        </span>
        <ArrowRight className="ml-auto size-5 shrink-0 text-star-300" aria-hidden />
      </button>
    );
  }
  return (
    <div className={clsx("world-object h-[128px] w-[96px]", className)} aria-label={`Stock boxes: ${status}. Open your stock`} {...activate(onOpen)}>
      <StockBoxesArt />
      <div className="absolute left-[8px] top-[84px] w-[80px] rounded-sm bg-[#fffdf6] px-1 py-1 text-center leading-tight shadow-[0_4px_8px_-4px_rgb(0_0_0/0.5)]">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#2b2118]">Stock</p>
        <p className={clsx("whitespace-nowrap text-[11px] font-bold", tone)}>{status}</p>
      </div>
    </div>
  );
}

function SpeechBubble({ className }: { className?: string }) {
  const { name, line, openMascot } = useLumiLine();
  return (
    <button
      type="button"
      onClick={() => openMascot(line.prompt)}
      className={clsx("rounded-2xl rounded-bl-md bg-white px-4 py-3 text-left text-[13px] leading-snug text-space-900 shadow-xl", className)}
    >
      {line.text}
      <span className="mt-1.5 flex items-center gap-1 font-bold text-orbit-600">
        Ask {name} <ArrowRight className="size-3.5" aria-hidden />
      </span>
    </button>
  );
}

/**
 * Lumi's own little desk, standing on yours: a tiny lamp, a few books and a name plate. Lumi only
 * speaks up when you come over (hover or focus); until then a small "…" says it has something.
 */
function LumiDesk({ className }: { className?: string }) {
  const { name, openMascot } = useLumiLine();
  return (
    <div className={clsx("group h-[160px] w-[200px]", className)}>
      <SpeechBubble className="pointer-events-none absolute bottom-[144px] left-[-10px] w-[240px] translate-y-2 opacity-0 transition duration-200 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100" />
      <span className="absolute left-[124px] top-[-6px] rounded-full bg-white px-2 pb-1 text-sm font-black leading-none tracking-widest text-space-900 shadow-lg transition-opacity group-focus-within:opacity-0 group-hover:opacity-0" aria-hidden>
        …
      </span>

      <button type="button" onClick={() => openMascot()} aria-label={`Talk to ${name}`} className="absolute left-[52px] top-[10px] transition-transform hover:scale-105">
        <Mascot size={96} greet />
      </button>

      {/* the little desk, in front of Lumi */}
      <DeskLamp className="absolute left-[6px] top-[40px] h-[50px] w-[55px]" />
      <BookStack className="absolute left-[142px] top-[62px] h-[24px] w-[50px]" />
      <div className="world-wood absolute left-0 top-[86px] h-[13px] w-[200px] rounded-[3px] shadow-[0_6px_10px_-4px_rgb(0_0_0/0.5)]" aria-hidden />
      <div className="absolute left-[10px] top-[99px] flex h-[24px] w-[180px] items-center justify-center shadow-[inset_0_7px_8px_-6px_rgb(0_0_0/0.55)]" style={{ background: "var(--room-wood)" }}>
        <span className="rounded-sm bg-[#f5d27a] px-2 py-px text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#5b3a12] shadow-sm">
          {name} · Advisor
        </span>
      </div>
      <span className="absolute left-[14px] top-[123px] h-[35px] w-[9px] rounded-b-sm" style={{ background: "var(--room-wood)" }} aria-hidden />
      <span className="absolute right-[14px] top-[123px] h-[35px] w-[9px] rounded-b-sm" style={{ background: "var(--room-wood)" }} aria-hidden />
      <span className="absolute bottom-[-4px] left-[6px] h-2.5 w-[188px] rounded-[50%] bg-black/25 blur-[2px]" aria-hidden />
    </div>
  );
}

/** Lumi on a phone: there's no hovering, so the bubble is always showing. */
function Lumi() {
  const { name, openMascot } = useLumiLine();
  return (
    <div className="flex items-end gap-3 rounded-2xl bg-surface-900/80 p-4 ring-1 ring-line">
      <button type="button" onClick={() => openMascot()} aria-label={`Talk to ${name}`} className="shrink-0">
        <Mascot size={72} greet />
      </button>
      <SpeechBubble className="flex-1" />
    </div>
  );
}

/** The month planner on the wall: what you've done this month, newest first. */
function MonthPlanner({ className, onOpen }: { className?: string; onOpen: () => void }) {
  const now = useNow(60_000);
  // Logged activities, finished missions, saved ideas and Wrapped stories, this month only.
  const feed = useActivityFeed(60).filter((f) => {
    const d = new Date(f.at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const shown = feed.slice(0, 5);
  const left = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();

  return (
    <div
      // Positioned by the caller: absolute on the wall, relative in the phone stack.
      className={clsx("world-object flex flex-col rounded-md text-[#1f2937] shadow-[0_16px_26px_-14px_rgb(0_0_0/0.65)]", className)}
      style={{ background: "repeating-linear-gradient(#fffdf6 0 23px, #e8eef8 23px 24px)" }}
      aria-label="This month's activities: open Treasury to log more"
      {...activate(onOpen)}
    >
      <span className="absolute left-1/2 top-[-9px] h-4 w-12 -translate-x-1/2 rounded-sm bg-[#374151] shadow" aria-hidden />
      <div className="flex items-baseline justify-between rounded-t-md bg-[#ef4444] px-3 pb-1.5 pt-2.5 text-white">
        <span className="text-[13px] font-extrabold uppercase tracking-[0.18em]">{now.toLocaleDateString(undefined, { month: "long" })}</span>
        <span className="text-[11px] font-semibold opacity-90">{left === 0 ? "Last day" : `${left} day${left === 1 ? "" : "s"} left`}</span>
      </div>
      <div className="min-h-0 flex-1 px-3 pt-2">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#b45309]">This month · {feed.length}</p>
        {shown.length ? (
          <ul className="mt-1">
            {shown.map((f, i) => (
              <li key={i} className="flex h-6 items-center gap-1.5 text-[12px]">
                <f.icon className="size-3.5 shrink-0 text-[#b45309]" aria-hidden />
                <span className="min-w-0 flex-1 truncate font-medium" title={f.text}>
                  {f.text}
                </span>
                <span className="shrink-0 text-[11px] font-semibold text-[#6b7280]">{when(f.at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1.5 text-[12px] leading-[24px] text-[#4b5563]">Nothing yet this month. Launches, promos and events you log show up here.</p>
        )}
      </div>
      <p className="flex items-center gap-1 px-3 pb-2 text-[11.5px] font-bold text-[#2563eb]">
        <Plus className="size-3.5" aria-hidden /> {feed.length > shown.length ? `${feed.length - shown.length} more · log an activity` : "Log an activity"}
      </p>
    </div>
  );
}

/**
 * The month's Wrapped, as a present under the lamp. Open it to watch the story, or, if it isn't
 * made yet, to have Lumi wrap the month up. On a phone it's a card instead.
 */
function WrappedGift({ className, card = false }: { className?: string; card?: boolean }) {
  const now = new Date();
  const month = monthKey(now);
  const monthName = now.toLocaleDateString(undefined, { month: "long" });
  const monthLabel = now.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const report = usePolaris((s) => s.monthReports[month]);
  const hasRows = usePolaris((s) => s.entries.some((e) => e.date.startsWith(month)));
  const wrapped = useWrapped(month);
  const writing = wrapped.state === "writing";

  const status = writing ? "Wrapping it up…" : report ? "Open to watch" : hasRows ? "Tap to wrap it up" : "Log some sales first";
  const open = () => {
    if (writing) return;
    if (report) wrapped.watch(report);
    else if (hasRows) void wrapped.make();
  };
  const label = report ? `Watch your ${monthName} Wrapped` : hasRows ? `Make your ${monthName} Wrapped` : `${monthName} Wrapped: log some sales in Treasury first`;

  return (
    <>
      {card ? (
        <button type="button" onClick={open} disabled={!report && !hasRows} className="world-gift flex w-full items-center gap-4 rounded-2xl bg-surface-900/80 p-3 text-left ring-1 ring-line disabled:opacity-70">
          <GiftBox className={clsx("h-[62px] w-[72px] shrink-0", writing && "world-gift-wrapping")} />
          <span className="min-w-0">
            <span className="block font-bold">{monthName} Wrapped</span>
            <span className="text-sm text-muted">{status}</span>
          </span>
          {report ? <Play className="ml-auto size-5 shrink-0 text-star-300" aria-hidden /> : <Sparkles className="ml-auto size-5 shrink-0 text-star-300" aria-hidden />}
        </button>
      ) : (
        <div className={clsx("world-gift h-[112px] w-[130px]", hasRows || report ? "cursor-pointer" : "cursor-default", className)} aria-label={label} {...activate(open)}>
          <GiftBox className={clsx(writing && "world-gift-wrapping")} />
          <div className="absolute left-[64px] top-[60px] w-[104px] rotate-[-5deg] rounded-md bg-[#fffdf6] px-2.5 py-1.5 text-[#2b2118] shadow-[0_8px_14px_-6px_rgb(0_0_0/0.55)]">
            <span className="absolute -top-1 left-3 size-2 rounded-full bg-[#2b2118]/30" aria-hidden />
            <p className="text-[12px] font-extrabold leading-tight">{monthName} Wrapped</p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-[#b45309]">
              {report && <Play className="size-3" aria-hidden />}
              {status}
            </p>
          </div>
        </div>
      )}
      <WrappedOverlays wrapped={wrapped} monthLabel={monthLabel} />
    </>
  );
}
