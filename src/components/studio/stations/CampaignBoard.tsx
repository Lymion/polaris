"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CalendarPlus, Check, ListTodo, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AiError, generateMissions } from "@/lib/ai/client";
import { fieldClass, parseAmount, todayIso } from "@/lib/inputs";
import { formatMoney } from "@/lib/money";
import { newId, usePolaris } from "@/lib/store";
import type { Campaign } from "@/lib/studio";
import { ChipField, SaveButton, StudioError, TextField, opts, useDraft, useStudioContext, useStudioRun } from "../kit";
import { CampaignCard } from "../views";
import { Sketching, WorkspaceFrame, type LumiLine, type StationNav } from "../Workspace";

const GOALS = opts(["More sales", "New customers", "Launch a product", "Clear old stock", "Bring customers back", "Grow followers"]);
const DURATIONS = opts(["One weekend", "One week", "Two weeks", "One month"]);
const BASE_CHANNELS = ["Instagram", "TikTok", "Facebook", "WhatsApp", "In store"];

type Done = Record<string, { activity?: boolean; missions?: number }>;

export function CampaignBoard({ nav }: { nav: StationNav }) {
  const currency = usePolaris((s) => s.profile.currency);
  const salesChannels = usePolaris((s) => s.channels);
  const run = useStudioRun("campaign");
  const [goal, setGoal] = useDraft<string[]>("campaign.goal", ["More sales"]);
  const [occasion, setOccasion] = useDraft("campaign.occasion", "");
  const [budget, setBudget] = useDraft("campaign.budget", "");
  const [duration, setDuration] = useDraft<string[]>("campaign.duration", ["One week"]);
  const [channels, setChannels] = useDraft<string[]>("campaign.channels", ["Instagram", "WhatsApp"]);
  // What's been done with each plan (keyed by name), kept across visits like the plans themselves.
  const [done, setDone] = useDraft<Done>("campaign.done", {});

  const channelOptions = opts([
    ...new Set([...BASE_CHANNELS, ...salesChannels.map((c) => c.name).filter((n) => n !== "Direct sales")]),
  ]);
  const budgetAmount = parseAmount(budget);
  const campaigns = run.output?.campaigns ?? null;

  useStudioContext(
    campaigns
      ? `At the Campaign board. Pinned campaign plans: ${campaigns.map((c) => `"${c.name}" (offer: ${c.offer}; hook: ${c.hook})`).join("; ")}.`
      : "At the Campaign board, planning a promotion.",
  );

  const lumi: LumiLine = run.busy
    ? { mood: "thinking", text: "Pinning ideas to the board…" }
    : run.error
      ? { mood: "idle", text: "Something slipped off the board. Let's try again." }
      : campaigns
        ? { mood: "happy", text: "Two plans on the board: a safe one and a bolder one. Save the one you like, or log it so we can see what it does to your sales." }
        : { mood: "idle", text: "Let's plan a promo! Tell me the goal and the occasion, and I'll pin two plans to the board." };

  function submit(e: FormEvent) {
    e.preventDefault();
    void run.generate({
      goal: goal[0] ?? "",
      occasion: occasion.trim(),
      budget: Number.isFinite(budgetAmount) ? formatMoney(budgetAmount, currency) : "",
      duration: duration[0] ?? "",
      channels,
    });
  }

  return (
    <WorkspaceFrame station="campaign" lumi={lumi} nav={nav}>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:items-start">
        <form onSubmit={submit} className="studio-desk space-y-6 p-5 sm:p-6">
          <ChipField legend="Goal" options={GOALS} value={goal} onChange={setGoal} single />
          <TextField label="Occasion or season" hint="optional">
            <input
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              placeholder="e.g. school holidays, payday weekend"
              maxLength={80}
              className={fieldClass}
            />
          </TextField>
          <TextField label="Budget" hint="optional">
            <input
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              inputMode="decimal"
              placeholder={`e.g. ${formatMoney(300, currency, { compact: true })}`}
              maxLength={20}
              className={fieldClass}
            />
          </TextField>
          <ChipField legend="How long" options={DURATIONS} value={duration} onChange={setDuration} single />
          <ChipField legend="Where you can promote" options={channelOptions} value={channels} onChange={setChannels} />
          <StudioError message={run.error} />
          <Button type="submit" disabled={run.busy || channels.length === 0} className="w-full">
            <Megaphone className="size-4" aria-hidden />
            {run.busy ? "Planning…" : campaigns ? "Plan two more" : "Plan my campaign"}
          </Button>
        </form>

        <div className="studio-cork relative min-h-[460px] p-4 pt-8 sm:p-7 sm:pt-10">
          {run.busy ? (
            <div className="rounded-md bg-[#FFF8E1] p-6 shadow-lg">
              <span className="studio-pin" aria-hidden />
              <Sketching label="Writing up two plans…" tone="light" />
            </div>
          ) : campaigns ? (
            <div className="space-y-8">
              {campaigns.map((c, i) => (
                <CampaignCard
                  key={c.name}
                  campaign={c}
                  index={i}
                  actions={
                    <CampaignActions
                      campaign={c}
                      cost={Number.isFinite(budgetAmount) ? budgetAmount : 0}
                      done={done[c.name] ?? {}}
                      onDone={(patch) => setDone((d) => ({ ...d, [c.name]: { ...d[c.name], ...patch } }))}
                      saved={run.isSaved(c.name)}
                      onSave={() => run.toggleSave(c.name, c.name, { tool: "campaign", campaigns: [c] })}
                    />
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyBoard />
          )}
        </div>
      </div>
    </WorkspaceFrame>
  );
}

const cardButton =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-space-900/[0.08] px-3 py-1.5 text-xs font-semibold text-space-800 transition-colors hover:bg-space-900/[0.15] disabled:opacity-60";

function CampaignActions({
  campaign: c,
  cost,
  done,
  onDone,
  saved,
  onSave,
}: {
  campaign: Campaign;
  cost: number;
  done: Done[string];
  onDone: (patch: Done[string]) => void;
  saved: boolean;
  onSave: () => void;
}) {
  const saveActivity = usePolaris((s) => s.saveActivity);
  const addMissions = usePolaris((s) => s.addMissions);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function logActivity() {
    saveActivity({ id: newId(), date: todayIso(), kind: "promotion", title: c.name.slice(0, 80), cost });
    onDone({ activity: true });
  }

  async function toMissions() {
    setBusy(true);
    setError("");
    try {
      const text = [
        `Campaign plan "${c.name}": ${c.bigIdea}`,
        `Offer: ${c.offer}`,
        `Hook: ${c.hook}`,
        `Channels: ${c.channels.map((ch) => `${ch.channel}: ${ch.action}`).join("; ")}`,
        `Timeline: ${c.timeline.map((t) => `${t.when}: ${t.task}`).join("; ")}`,
        `Budget: ${c.budget}`,
        `Track: ${c.watch.join("; ")}`,
      ].join("\n");
      const created = await generateMissions({ mode: "advice", text, source: "ai" });
      addMissions(created);
      onDone({ missions: created.length });
    } catch (err) {
      setError(err instanceof AiError ? err.message : "Couldn't create missions. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SaveButton saved={saved} onClick={onSave} tone="light" />
      {done.activity ? (
        <span className={cardButton}>
          <Check className="size-3.5" aria-hidden /> Logged in this month&apos;s activities
        </span>
      ) : (
        <button type="button" onClick={logActivity} className={cardButton} title="Log it in Treasury so your monthly report can link it to sales">
          <CalendarPlus className="size-3.5" aria-hidden /> Log as this month&apos;s promo
        </button>
      )}
      {done.missions ? (
        <Link href="/missions" className={`${cardButton} underline-offset-2 hover:underline`}>
          <Check className="size-3.5" aria-hidden /> {done.missions} missions added
        </Link>
      ) : (
        <button type="button" onClick={toMissions} disabled={busy} className={cardButton}>
          <ListTodo className="size-3.5" aria-hidden /> {busy ? "Creating missions…" : "Turn into missions"}
        </button>
      )}
      {error && (
        <p role="alert" className="w-full text-xs font-semibold text-[#B91C1C]">
          {error}
        </p>
      )}
    </>
  );
}

function EmptyBoard() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {[-1.2, 1.4].map((tilt, i) => (
        <div
          key={tilt}
          className="relative rounded-md bg-[#FFF8E1]/90 p-5 pt-6 text-space-900 shadow-lg"
          style={{ transform: `rotate(${tilt}deg)` }}
        >
          <span className="studio-pin" aria-hidden />
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#B45309]">Plan {i ? "B" : "A"}</p>
          <div className="mt-3 space-y-2.5" aria-hidden>
            {[80, 95, 60, 70].map((w) => (
              <div key={w} className="h-2.5 rounded-full bg-space-900/10" style={{ width: `${w}%` }} />
            ))}
          </div>
          <p className="mt-4 text-sm text-space-700">{i ? "A bolder idea goes here." : "A safe, proven idea goes here."}</p>
        </div>
      ))}
    </div>
  );
}
