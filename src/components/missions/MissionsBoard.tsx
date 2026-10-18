"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Check, ClipboardCheck, LoaderCircle, Plus, Sparkles, Target, Wand2 } from "lucide-react";
import { PolarisMark } from "@/components/brand/PolarisMark";
import { rovingKeys } from "@/components/ui/a11y";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { AiError, generateMissions } from "@/lib/ai/client";
import { newId, uncoveredFoundations, useHydrated, usePolaris } from "@/lib/store";
import type { Mission } from "@/lib/types";
import { BusinessBasics } from "./BusinessBasics";
import { MissionCard } from "./MissionCard";

const PLANNING_MESSAGES = [
  "Reading your business profile…",
  "Plotting your constellation…",
  "Breaking missions into steps…",
  "Balancing quick wins and big pushes…",
];

type Tab = "active" | "done";

/** "More missions" pauses at this many open missions, so users finish what they start. */
const MAX_OPEN = 6;

export function MissionsBoard() {
  const hydrated = useHydrated();
  const profile = usePolaris((s) => s.profile);
  const missions = usePolaris((s) => s.missions);
  const addMissions = usePolaris((s) => s.addMissions);

  const updateProfile = usePolaris((s) => s.updateProfile);

  const [tab, setTab] = useState<Tab>("active");
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showBasics, setShowBasics] = useState(false);

  /**
   * starter: the first questline. foundations: missions for basics with no mission yet.
   * growth: next missions toward the goal. `sawChecklist`: the user saw the basics checklist,
   * so nothing ticked means nothing is in place.
   */
  async function plan(mode: "starter" | "foundations" | "growth", sawChecklist = false) {
    setPlanning(true);
    setError("");
    setShowBasics(false);
    if (sawChecklist && usePolaris.getState().profile.foundations === null) updateProfile({ foundations: [] });
    try {
      const created = await generateMissions({ mode, source: "ai" });
      addMissions(created);
      setTab("active");
    } catch (err) {
      setError(err instanceof AiError ? err.message : "Couldn't plan missions. Try again.");
    } finally {
      setPlanning(false);
    }
  }

  if (!hydrated) return <div className="h-96 animate-pulse rounded-[1.25rem] bg-fg/[0.04]" />;

  const active = missions.filter((m) => m.status !== "done");
  const done = missions.filter((m) => m.status === "done").reverse();
  const list = tab === "active" ? active : done;
  const gaps = uncoveredFoundations(profile, missions);
  const atLimit = active.length >= MAX_OPEN;

  return (
    <>
      <PageHeader
        icon={Target}
        eyebrow="Quest board"
        title="Missions"
        description="Clear, step-by-step missions that grow your business. Finish steps, earn XP and level up."
        actions={
          missions.length > 0 && (
            <>
              <Button
                variant="ghost"
                onClick={() => setShowBasics(!showBasics)}
                aria-expanded={showBasics}
                aria-label="Business basics"
                title="Business basics"
                className="px-3"
              >
                <ClipboardCheck className="size-4" aria-hidden />
                <span className="hidden sm:inline">Basics</span>
              </Button>
              <Button variant="secondary" onClick={() => setShowAdd(!showAdd)} aria-expanded={showAdd}>
                <Plus className="size-4" aria-hidden />
                <span>
                  Add<span className="hidden sm:inline"> mission</span>
                </span>
              </Button>
              <Button
                onClick={() => plan("growth")}
                disabled={planning || atLimit}
                title={atLimit ? `Finish or clear a mission first (max ${MAX_OPEN} open)` : "Plan growth missions"}
              >
                {planning ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
                More missions
              </Button>
            </>
          )
        }
      />

      {missions.length === 0 && !planning ? (
        <QuestlineHero goal={profile.goal} onPlan={() => plan("starter", true)} error={error} />
      ) : (
        <>
          {atLimit && (
            <p className="mb-5 flex items-center gap-2.5 rounded-xl bg-fg/[0.04] px-4 py-3 text-sm text-muted ring-1 ring-line">
              <Target className="size-4 shrink-0 text-star-300" aria-hidden />
              You have {active.length} missions open. Finish or clear some to unlock new ones; focus beats a long
              to-do list.
            </p>
          )}

          {showBasics && (
            <section className="panel mb-6 p-5 animate-rise-in sm:p-6">
              <BusinessBasics />
              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
                {gaps.length > 0 ? (
                  <Button onClick={() => plan("foundations", true)} disabled={planning || atLimit}>
                    <Sparkles className="size-4" aria-hidden /> Plan missions for {gaps.length}{" "}
                    {gaps.length === 1 ? "gap" : "gaps"}
                  </Button>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-growth">
                    <Check className="size-4" aria-hidden /> Every gap has a mission or is already in place.
                  </p>
                )}
                <Button variant="ghost" onClick={() => setShowBasics(false)}>
                  Done
                </Button>
              </div>
            </section>
          )}

          {showAdd && <AddMission onDone={() => setShowAdd(false)} />}

          {error && (
            <p role="alert" className="mb-4 rounded-xl bg-alert/10 px-4 py-3 text-sm text-alert ring-1 ring-alert/30">
              {error}
            </p>
          )}

          <div className="mb-5 inline-flex rounded-full bg-fg/[0.04] p-1 ring-1 ring-line" role="tablist" aria-label="Missions" onKeyDown={rovingKeys}>
            {(
              [
                ["active", `In progress (${active.length})`],
                ["done", `Completed (${done.length})`],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                id={`missions-tab-${value}`}
                role="tab"
                aria-selected={tab === value}
                aria-controls="missions-panel"
                tabIndex={tab === value ? 0 : -1}
                onClick={() => setTab(value)}
                className={clsx(
                  "tap-target relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  tab === value ? "bg-fg/[0.1] text-ink" : "text-muted hover:text-ink",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div id="missions-panel" role="tabpanel" aria-labelledby={`missions-tab-${tab}`}>
            {/* Names the list for screen readers, so the mission titles sit under a heading of their own. */}
            <h2 className="sr-only">{tab === "active" ? "Missions in progress" : "Completed missions"}</h2>
            {planning && <PlanningState />}

            {list.length === 0 && !planning ? (
              <p className="rounded-xl border border-dashed border-fg/10 p-8 text-center text-sm text-muted">
                {tab === "active"
                  ? "All missions complete. Ask for more missions to keep climbing."
                  : "No completed missions yet. Tick off steps to finish your first one."}
              </p>
            ) : (
              <Questline missions={list} />
            )}
          </div>
        </>
      )}
    </>
  );
}

/** Missions as stars on a constellation line: gold once done. */
function Questline({ missions }: { missions: Mission[] }) {
  const firstOpen = missions.find((m) => m.status !== "done")?.id;
  return (
    <ol className="relative space-y-4">
      {missions.map((m, i) => (
        <li key={m.id} className="relative grid grid-cols-[28px_1fr] gap-3 sm:grid-cols-[36px_1fr] sm:gap-4">
          <div className="relative flex justify-center">
            {/* Runs from just below this star (20px offset + 28/32px tall + 4px gap) to just above
                the next one (16px list gap + 20px offset - 4px gap), so it never enters a star. */}
            {i < missions.length - 1 && (
              <span
                aria-hidden
                className="absolute -bottom-8 top-[52px] w-px bg-linear-to-b from-orbit-400/50 to-orbit-400/15 sm:top-[56px]"
              />
            )}
            <StarNode done={m.status === "done"} active={m.status === "active"} />
          </div>
          <MissionCard mission={m} defaultOpen={m.id === firstOpen} />
        </li>
      ))}
    </ol>
  );
}

function StarNode({ done, active }: { done: boolean; active: boolean }) {
  return (
    <svg viewBox="-10 -10 20 20" className={clsx("mt-5 size-7 sm:size-8", active && !done && "animate-twinkle")} aria-hidden>
      <path
        d="M0,-9 Q1.6,-1.6 9,0 Q1.6,1.6 0,9 Q-1.6,1.6 -9,0 Q-1.6,-1.6 0,-9 Z"
        fill={done ? "#F5B942" : active ? "#7FB4FF" : "#0B1B3F"}
        stroke={done ? "#F7A531" : active ? "#7FB4FF" : "#64729A"}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function QuestlineHero({ goal, onPlan, error }: { goal: string | null; onPlan: () => void; error: string }) {
  return (
    <section className="panel relative overflow-hidden px-6 py-10 sm:px-10">
      <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 size-96 -translate-x-1/2 rounded-full bg-orbit-500/20 blur-3xl" />
      <div className="relative text-center">
        <PolarisMark size={88} className="mx-auto" />
        <h2 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">Chart your first questline</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted">
          Polaris plans missions across your whole business: legal setup, suppliers, money, sales and brand. First it
          fills the gaps in your basics, then it builds toward your goal
          {goal && (
            <>
              : <span className="font-semibold text-star-200">{goal}</span>
            </>
          )}
          .
        </p>
      </div>
      <BusinessBasics className="relative mx-auto mt-8 max-w-2xl rounded-2xl bg-fg/[0.03] p-5 ring-1 ring-line sm:p-6" />
      <div className="relative text-center">
        <Button size="lg" className="mt-8" onClick={onPlan}>
          <Wand2 className="size-4" aria-hidden /> Chart my questline
        </Button>
        {error && (
          <p role="alert" className="mt-4 text-sm text-alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

function PlanningState() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % PLANNING_MESSAGES.length), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mb-4 space-y-4" aria-live="polite" aria-busy>
      <div className="flex items-center gap-3 text-sm text-star-200">
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
        {PLANNING_MESSAGES[i]}
      </div>
      {[0, 1].map((n) => (
        <div key={n} className="ml-10 h-40 animate-pulse rounded-[1.25rem] bg-fg/[0.04] sm:ml-[52px]" />
      ))}
    </div>
  );
}

function AddMission({ onDone }: { onDone: () => void }) {
  const addMissions = usePolaris((s) => s.addMissions);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function planWithAi() {
    if (!text.trim()) return setError("Describe what you want to get done first.");
    setBusy(true);
    setError("");
    try {
      const created = await generateMissions({ mode: "custom", text, source: "user" });
      addMissions(created);
      onDone();
    } catch (err) {
      setError(err instanceof AiError ? err.message : "Couldn't plan that mission. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function addPlain() {
    if (!text.trim()) return setError("Describe what you want to get done first.");
    addMissions([
      {
        id: newId(),
        title: text.trim().slice(0, 80),
        description: "",
        category: "operations",
        xp: 50,
        status: "todo",
        steps: [],
        source: "user",
        createdAt: new Date().toISOString(),
      },
    ]);
    onDone();
  }

  return (
    <form
      className="panel mb-6 p-5 animate-rise-in"
      onSubmit={(e) => {
        e.preventDefault();
        void planWithAi();
      }}
    >
      <label htmlFor="new-mission" className="text-sm font-semibold">
        What do you want to get done?
      </label>
      <input
        id="new-mission"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setError("");
        }}
        placeholder="e.g. Start selling online, or get my first 10 reviews"
        autoFocus
        className="mt-2 w-full rounded-xl bg-fg/[0.05] px-4 py-3 text-sm ring-1 ring-line placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-focus/70"
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-alert">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
          {busy ? "Planning steps…" : "Plan it with AI"}
        </Button>
        <Button type="button" variant="ghost" onClick={addPlain} disabled={busy}>
          Add without steps
        </Button>
      </div>
    </form>
  );
}
