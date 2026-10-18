"use client";

import { useState } from "react";
import clsx from "clsx";
import { Check, ChevronDown, CircleHelp, ClipboardCheck, Info, RotateCcw, Trash2 } from "lucide-react";
import { Mascot } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/Button";
import { CATEGORY_LABELS, CATEGORY_STYLES } from "@/lib/categories";
import { mascotName, usePolaris } from "@/lib/store";
import type { Mission } from "@/lib/types";
import { ReportDialog } from "./ReportDialog";

export function MissionCard({ mission, defaultOpen = false }: { mission: Mission; defaultOpen?: boolean }) {
  const toggleStep = usePolaris((s) => s.toggleStep);
  const reopenMission = usePolaris((s) => s.reopenMission);
  const removeMission = usePolaris((s) => s.removeMission);
  const openMascot = usePolaris((s) => s.openMascot);
  const name = usePolaris((s) => mascotName(s.profile));
  const [open, setOpen] = useState(defaultOpen);
  const [reporting, setReporting] = useState(false);
  const [confirm, setConfirm] = useState<"delete" | "reopen" | null>(null);

  const done = mission.status === "done";
  const stepsDone = mission.steps.filter((s) => s.done).length;
  const allStepsDone = mission.steps.length > 0 && stepsDone === mission.steps.length;
  const progress = mission.steps.length ? stepsDone / mission.steps.length : done ? 1 : 0;
  const stepsId = `steps-${mission.id}`;

  const walkthrough = `Walk me through my mission "${mission.title}" step by step. What do I prepare, where do I go or what do I search for, and what are the common mistakes?\nSteps:\n${mission.steps
    .map((s) => `- ${s.text}`)
    .join("\n")}`;

  /** Destructive actions need a second tap within 3 seconds. */
  function confirmThen(kind: "delete" | "reopen", action: () => void) {
    if (confirm === kind) {
      action();
      setConfirm(null);
    } else {
      setConfirm(kind);
      setTimeout(() => setConfirm((c) => (c === kind ? null : c)), 3000);
    }
  }

  return (
    <article className={clsx("panel overflow-hidden transition-colors", done && "opacity-85")}>
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-semibold", CATEGORY_STYLES[mission.category])}>
            {CATEGORY_LABELS[mission.category]}
          </span>
          {mission.source === "advisor" && (
            <span className="rounded-full bg-fg/[0.06] px-2.5 py-0.5 text-xs font-medium text-muted">
              From {name}
            </span>
          )}
          <span className="ml-auto text-xs font-bold text-star-300">+{mission.xp} XP</span>
        </div>

        <h3 className={clsx("mt-3 text-lg font-semibold leading-snug", done && "text-muted line-through decoration-faint")}>
          {mission.title}
        </h3>
        {mission.description && <p className="mt-1 text-sm leading-relaxed text-muted">{mission.description}</p>}
        {mission.category === "legal" && !done && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-sky-400/[0.07] px-3 py-2 text-xs leading-relaxed text-sky-200/80 ring-1 ring-sky-400/20">
            <Info className="mt-px size-3.5 shrink-0" aria-hidden />
            Rules, forms and fees change. Confirm each step with the official office or an accountant before you act.
          </p>
        )}

        {mission.steps.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls={stepsId}
            className="group tap-target relative mt-2.5 flex w-full items-center gap-3 py-1.5 text-left"
          >
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-fg/[0.08]">
              <div
                className="h-full rounded-full bg-linear-to-r from-orbit-400 to-star-400 transition-[width] duration-500"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <span className="text-xs font-medium tabular-nums text-muted">
              {stepsDone}/{mission.steps.length} steps
            </span>
            <ChevronDown
              className={clsx("size-4 text-faint transition-transform group-hover:text-ink", open && "rotate-180")}
              aria-hidden
            />
          </button>
        )}
      </div>

      {open && mission.steps.length > 0 && (
        <ul id={stepsId} className="space-y-1 border-t border-line bg-fg/[0.02] px-3 py-3">
          {mission.steps.map((step) => (
            <li key={step.id} className="flex items-start gap-1 rounded-lg transition-colors hover:bg-fg/[0.04]">
              <label className={clsx("flex flex-1 items-start gap-3 px-2 py-2", done ? "cursor-default" : "cursor-pointer")}>
                <input
                  type="checkbox"
                  checked={step.done}
                  disabled={done}
                  onChange={() => toggleStep(mission.id, step.id)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className={clsx(
                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md ring-1 transition-[background-color,box-shadow] duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-star-400",
                    step.done ? "bg-star-400 ring-star-400" : "bg-fg/[0.04] ring-fg/20",
                  )}
                >
                  {step.done && <Check className="size-3.5 text-space-900" strokeWidth={3} />}
                </span>
                <span className={clsx("text-sm leading-relaxed", step.done ? "text-faint line-through" : "text-ink")}>
                  {step.text}
                </span>
              </label>
              {!done && (
                <button
                  type="button"
                  onClick={() =>
                    openMascot(
                      `Explain this step of my mission "${mission.title}": "${step.text}". Exactly how do I do it, for my business?`,
                    )
                  }
                  aria-label={`Ask ${name} about this step`}
                  title={`Ask ${name} about this step`}
                  className="tap-target relative mr-1 mt-1.5 grid size-7 shrink-0 place-items-center rounded-full text-faint transition-colors hover:bg-star-400/15 hover:text-star-300"
                >
                  <CircleHelp className="size-4" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!done && allStepsDone && (
        <div className="flex items-center gap-3 border-t border-star-400/30 bg-star-400/10 px-5 py-3">
          <ClipboardCheck className="size-5 shrink-0 text-star-300" aria-hidden />
          <p className="flex-1 text-sm text-star-200">Every step is ticked. Report your results to claim the XP.</p>
        </div>
      )}

      {done && mission.report && (
        <details className="border-t border-line px-5 py-3 text-sm">
          <summary className="cursor-pointer font-medium text-muted hover:text-ink">Your report</summary>
          <dl className="mt-3 space-y-2">
            {mission.report.answers.map((a) => (
              <div key={a.question}>
                <dt className="text-xs text-faint">{a.question}</dt>
                <dd className="text-ink">{a.answer}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 flex gap-2 rounded-xl bg-fg/[0.04] p-3 text-xs leading-relaxed text-muted">
            <Mascot size={26} still className="-mt-0.5 shrink-0" />
            {mission.report.feedback}
          </p>
        </details>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
        {done ? (
          <>
            <span className="flex items-center gap-1.5 text-xs font-medium text-growth">
              <Check className="size-3.5" aria-hidden /> Completed
              {mission.completedAt && ` ${new Date(mission.completedAt).toLocaleDateString()}`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className={clsx("ml-auto", confirm === "reopen" && "bg-alert/15 text-alert")}
              onClick={() => confirmThen("reopen", () => reopenMission(mission.id))}
            >
              <RotateCcw className="size-3.5" aria-hidden />
              {confirm === "reopen" ? `Tap again: returns ${mission.xp} XP` : "Reopen"}
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant={allStepsDone ? "primary" : "secondary"} onClick={() => setReporting(true)}>
              <ClipboardCheck className="size-3.5" aria-hidden /> Report results
            </Button>
            <button
              type="button"
              onClick={() => openMascot(walkthrough)}
              className="tap-target relative inline-flex h-8 items-center gap-1.5 rounded-full pl-1.5 pr-3 text-sm font-medium text-muted transition-colors hover:bg-fg/[0.06] hover:text-ink"
            >
              <Mascot size={24} still /> Walk me through it
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => confirmThen("delete", () => removeMission(mission.id))}
          aria-label={confirm === "delete" ? "Confirm delete" : "Delete mission"}
          className={clsx(
            "tap-target relative inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors",
            !done && "ml-auto",
            confirm === "delete" ? "bg-alert/15 text-alert" : "text-faint hover:bg-fg/[0.06] hover:text-alert",
          )}
        >
          <Trash2 className="size-3.5" aria-hidden />
          {confirm === "delete" && "Tap again to delete"}
        </button>
      </div>

      {reporting && <ReportDialog mission={mission} onClose={() => setReporting(false)} />}
    </article>
  );
}
