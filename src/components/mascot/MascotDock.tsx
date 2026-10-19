"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Maximize2, RotateCcw, X } from "lucide-react";
import { ChatComposer, ChatThread, startNewChat } from "@/components/advisor/ChatParts";
import { sendAdvisorMessage } from "@/lib/advisorChat";
import { effectiveRevenue } from "@/lib/finance";
import { levelInfo } from "@/lib/levels";
import { useDialogFocus } from "@/components/ui/a11y";
import { mascotName, useHydrated, usePolaris, useWorld } from "@/lib/store";
import { Mascot, type MascotMood } from "./Mascot";

interface Tip {
  text: string;
  action?: { label: string; prompt: string };
  /** Friendly but says nothing about the business: skipped on phones, where the bubble covers the page. */
  filler?: boolean;
}

const isPhone = () => window.matchMedia("(max-width: 1023px)").matches;

const PAGE_NAMES: Record<string, string> = {
  "/": "Home dashboard",
  "/missions": "Missions page",
  "/studio": "Creative Studio page",
  "/treasury": "Treasury page",
  "/stock": "Stock page",
};

/** The always-present guide: corner mascot, page-aware speech bubble, and a chat panel. */
export function MascotDock() {
  const hydrated = useHydrated();
  const pathname = usePathname();
  const profile = usePolaris((s) => s.profile);
  const open = usePolaris((s) => s.mascot.open);
  const openMascot = usePolaris((s) => s.openMascot);
  const closeMascot = usePolaris((s) => s.closeMascot);
  // Derived so the dock re-renders when the mood changes, not on every streamed chunk.
  const chatMood = usePolaris((s): MascotMood =>
    s.chatStreaming === null ? "idle" : s.chatStreaming === "" ? "thinking" : "talking",
  );
  const celebrating = usePolaris((s) => s.celebration !== null);

  const [bubble, setBubble] = useState<Tip | null>(null);
  const shownOn = useRef(new Set<string>());

  const name = mascotName(profile);
  const pageContext = usePolaris((s) => s.pageContext);
  const world = useWorld();
  // Lumi already sits in the studio room, and on the desk in the interactive world.
  const onStage = usePolaris((s) => s.mascotOnStage) || (world && pathname === "/");
  const pageName = PAGE_NAMES[pathname] ?? pathname;
  // Pages can describe what's on screen (e.g. the sheet being edited) so Lumi can see it.
  const page = pageContext ? `${pageName}. ${pageContext}` : pageName;
  const onAdvisorPage = pathname.startsWith("/advisor");

  // Say something useful once per page per visit, based on the latest state.
  useEffect(() => {
    if (!hydrated || !profile.onboarded || open || onAdvisorPage || shownOn.current.has(pathname)) return;
    const show = setTimeout(() => {
      shownOn.current.add(pathname);
      const tip = tipFor(pathname, usePolaris.getState());
      if (!(tip.filler && isPhone())) setBubble(tip);
    }, 1200);
    return () => clearTimeout(show);
  }, [hydrated, profile.onboarded, pathname, open, onAdvisorPage]);

  // On a phone the bubble sits over the page, so it goes sooner, and as soon as you scroll to read.
  useEffect(() => {
    if (!bubble) return;
    const phone = isPhone();
    const hide = setTimeout(() => setBubble(null), phone ? 7000 : 12000);
    const onScroll = () => setBubble(null);
    if (phone) window.addEventListener("scroll", onScroll, { passive: true, once: true });
    return () => {
      clearTimeout(hide);
      window.removeEventListener("scroll", onScroll);
    };
  }, [bubble]);

  if (!hydrated || !profile.onboarded) return null;

  const mood: MascotMood = celebrating ? "happy" : chatMood;

  return (
    <>
      {open && <MascotPanel page={page} mood={mood} />}

      {!onAdvisorPage && !open && !onStage && (
        <div className="fixed bottom-[76px] right-2 z-40 flex items-end gap-1 lg:bottom-5 lg:right-5">
          {bubble && (
            <div
              role="status"
              className="relative mb-12 max-w-[230px] origin-bottom-right rounded-2xl rounded-br-md bg-white px-3.5 py-3 text-[13px] leading-snug text-space-900 shadow-2xl animate-rise-in sm:max-w-[260px]"
            >
              <button
                type="button"
                onClick={() => setBubble(null)}
                aria-label="Dismiss tip"
                className="tap-target absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-surface-700 text-ink ring-2 ring-surface-950 transition-colors hover:bg-surface-600"
              >
                <X className="size-3.5" aria-hidden />
              </button>
              <p>{bubble.text}</p>
              {bubble.action && (
                <button
                  type="button"
                  onClick={() => {
                    openMascot(bubble.action?.prompt);
                    setBubble(null);
                  }}
                  className="tap-target relative mt-2 rounded-full bg-space-800 px-3 py-1.5 text-xs font-semibold text-white transition-[transform,background-color] duration-150 ease-out hover:bg-space-700 active:scale-[0.97]"
                >
                  {bubble.action.label}
                </button>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setBubble(null);
              openMascot();
            }}
            aria-label={`Ask ${name}`}
            title={`Ask ${name}`}
            className="rounded-full transition-transform hover:scale-105 active:scale-95"
          >
            {/* No drop-shadow here: the SVG repaints every animation frame, so a filter on it would be
                recomputed every frame too. The mascot's built-in glow does the same job. */}
            <Mascot size={72} mood={mood} greet className="lg:size-[88px]" />
          </button>
        </div>
      )}

      {open && (
        <button
          type="button"
          aria-label="Close chat"
          onClick={closeMascot}
          className="fixed inset-0 z-40 bg-surface-950/40 backdrop-blur-[1px] lg:bg-transparent lg:backdrop-blur-none"
        />
      )}
    </>
  );
}

function MascotPanel({ page, mood }: { page: string; mood: MascotMood }) {
  const profile = usePolaris((s) => s.profile);
  const updateProfile = usePolaris((s) => s.updateProfile);
  const closeMascot = usePolaris((s) => s.closeMascot);
  const takeMascotPrompt = usePolaris((s) => s.takeMascotPrompt);
  const threadLength = usePolaris((s) => s.advisorThread.length);
  const streaming = usePolaris((s) => s.chatStreaming);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const name = mascotName(profile);
  useDialogFocus(panel);

  // A question sent from a mission or tip ("Walk me through it") arrives with the open request.
  useEffect(() => {
    const prompt = takeMascotPrompt();
    if (prompt) void sendAdvisorMessage(prompt, page);
  }, [takeMascotPrompt, page]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeMascot();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeMascot]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [threadLength, streaming]);

  const empty = threadLength === 0 && streaming === null;

  return (
    <section
      ref={panel}
      role="dialog"
      aria-label={`Chat with ${name}`}
      tabIndex={-1}
      className="fixed inset-x-0 bottom-0 z-50 flex h-[85dvh] flex-col overflow-hidden rounded-t-3xl bg-surface-900 shadow-2xl ring-1 ring-line outline-none animate-rise-in lg:inset-x-auto lg:bottom-5 lg:right-5 lg:h-[min(640px,85dvh)] lg:w-[400px] lg:origin-bottom-right lg:rounded-3xl"
    >
      <header className="flex items-center gap-3 border-b border-line bg-surface-800/80 px-4 py-3">
        <Mascot size={48} mood={mood} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{name}</p>
          <p className="truncate text-xs text-muted">Your business guide</p>
        </div>
        <IconButton label="New chat" onClick={startNewChat}>
          <RotateCcw className="size-4" aria-hidden />
        </IconButton>
        <Link
          href="/advisor"
          onClick={closeMascot}
          aria-label="Open full chat"
          title="Open full chat"
          className="tap-target relative grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-fg/[0.08] hover:text-ink"
        >
          <Maximize2 className="size-4" aria-hidden />
        </Link>
        <IconButton label="Close" onClick={closeMascot}>
          <X className="size-5" aria-hidden />
        </IconButton>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5" aria-live="polite">
        {!profile.mascotName && <NameMe onSave={(n) => updateProfile({ mascotName: n })} />}
        {empty ? (
          <div className="text-center">
            <p className="text-lg font-bold">Hi {profile.ownerName}! What can I help with?</p>
            <p className="mt-1 text-sm text-muted">Ask me anything about your business, or pick one:</p>
            <div className="mt-5 flex flex-col gap-2 text-left">
              {quickPrompts(page).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void sendAdvisorMessage(q, page)}
                  className="rounded-xl bg-fg/[0.04] px-3.5 py-2.5 text-sm text-muted ring-1 ring-line transition-colors hover:bg-fg/[0.08] hover:text-ink"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ChatThread compact />
        )}
      </div>

      <ChatComposer page={page} className="border-t border-line bg-surface-900 p-3" />
    </section>
  );
}

function NameMe({ onSave }: { onSave: (name: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="mb-5 rounded-2xl bg-star-400/10 p-4 ring-1 ring-star-400/30"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(value.trim().slice(0, 24) || "Lumi");
      }}
    >
      <p className="text-sm font-semibold text-star-200">Before we start: what should I be called?</p>
      <div className="mt-3 flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Lumi"
          maxLength={24}
          aria-label="Your guide's name"
          className="min-w-0 flex-1 rounded-full bg-fg/[0.06] px-4 py-2 text-sm ring-1 ring-line placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-focus/70"
        />
        <button
          type="submit"
          className="rounded-full bg-star-400 px-4 text-sm font-semibold text-on-accent transition-[transform,filter] duration-150 ease-out hover:brightness-105 active:scale-[0.97]"
        >
          Save
        </button>
      </div>
    </form>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="tap-target relative grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-fg/[0.08] hover:text-ink"
    >
      {children}
    </button>
  );
}

function quickPrompts(page: string) {
  if (page.startsWith("Missions")) {
    return [
      "Which of my missions should I do first, and why?",
      "Walk me through registering my business step by step.",
      "How do I find and compare suppliers?",
    ];
  }
  if (page.startsWith("Treasury")) {
    return ["What's the difference between margin and markup?", "How much should I keep aside for tax?", "How do I know if my prices are too low?"];
  }
  if (page.startsWith("Creative")) {
    return ["Give me 3 video ideas for this week.", "Help me write a better Instagram bio.", "What makes a good brand story?"];
  }
  return [
    "What should I focus on this week?",
    "Walk me through registering my business step by step.",
    "My sales are slow. Where do I start?",
  ];
}

function tipFor(pathname: string, state: ReturnType<typeof usePolaris.getState>): Tip {
  const open = state.missions.filter((m) => m.status !== "done");
  const lvl = levelInfo(state.xp, effectiveRevenue(state.revenue, state.entries), state.profile.currency);
  const owner = state.profile.ownerName;

  if (pathname === "/missions") {
    const ready = open.find((m) => m.steps.length > 0 && m.steps.every((s) => s.done));
    if (ready) {
      return { text: `You ticked every step of "${ready.title}"! Report your results and I'll hand you the XP.` };
    }
    const legal = open.find((m) => m.category === "legal");
    if (legal) {
      return {
        text: `Paperwork can be confusing. Want me to walk you through "${legal.title}"?`,
        action: {
          label: "Walk me through it",
          prompt: `Walk me through my mission "${legal.title}" step by step. What do I prepare, where do I go, and what are the common mistakes?\nSteps:\n${legal.steps.map((s) => `- ${s.text}`).join("\n")}`,
        },
      };
    }
    return { text: "Stuck on a step? Tap the little ? next to it and I'll explain how to do it.", filler: true };
  }
  if (pathname === "/studio") return { text: "Need a spark? My book is full of ideas. Just ask!", filler: true };
  if (pathname === "/treasury") return { text: "Money talk! Ask me what margins or overheads mean, using your own numbers.", filler: true };
  if (pathname === "/stock") {
    return {
      text: "Not sure what to restock first? I can weigh what each product earns against what's sitting on the shelf.",
      action: { label: "What should I stock more of?", prompt: "Looking at what each product earns and how fast it sells, what should I stock more of, and what should I stop buying?" },
    };
  }
  if (lvl.blockedByGate && lvl.next) {
    return { text: `You've earned the XP for Level ${lvl.next.level}! Report your sales and I'll unlock it.` };
  }
  if (open.length === 0) {
    return { text: `Hi ${owner}! Head to Missions and I'll chart your first questline.` };
  }
  return { text: `Tap me anytime you're stuck, ${owner}. I've got a whole book of answers!`, filler: true };
}
