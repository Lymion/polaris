"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, CircleAlert, CircleCheck, ListPlus, LoaderCircle } from "lucide-react";
import { Mascot } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { AiError, generateMissions, reviewMoney } from "@/lib/ai/client";
import type { MoneyReview } from "@/lib/ai/shared";
import { mascotName, usePolaris } from "@/lib/store";

/** Score bands: the meter fill carries severity (status colour plus a text label). */
function band(score: number) {
  if (score >= 80) return { label: "Healthy", fill: "bg-growth", track: "bg-growth/15" };
  if (score >= 60) return { label: "Stable, with gaps", fill: "bg-orbit-400", track: "bg-orbit-400/15" };
  if (score >= 40) return { label: "Needs attention", fill: "bg-caution", track: "bg-caution/15" };
  return { label: "Urgent", fill: "bg-alert", track: "bg-alert/15" };
}

/** Deep money check-up on Nemotron Ultra, with the option to turn its actions into missions. */
export function MoneyCheckup({ onClose }: { onClose: () => void }) {
  const name = usePolaris((s) => mascotName(s.profile));
  const addMissions = usePolaris((s) => s.addMissions);
  const [review, setReview] = useState<MoneyReview | null>(null);
  const [error, setError] = useState("");
  const [converting, setConverting] = useState(false);
  const [added, setAdded] = useState(0);

  useEffect(() => {
    let cancelled = false;
    reviewMoney()
      .then((r) => !cancelled && setReview(r))
      .catch((err) => !cancelled && setError(err instanceof AiError ? err.message : "Couldn't finish the check-up. Try again."));
    return () => {
      cancelled = true;
    };
  }, []);

  async function toMissions() {
    if (!review) return;
    setConverting(true);
    try {
      const text = `Money check-up (score ${review.score}/100): ${review.headline}\nIssues:\n${review.issues
        .map((i) => `- ${i.title}: ${i.detail}`)
        .join("\n")}\nActions:\n${review.actions.map((a) => `- ${a}`).join("\n")}`;
      const created = await generateMissions({ mode: "advice", text, source: "advisor" });
      addMissions(created);
      setAdded(created.length);
    } catch (err) {
      setError(err instanceof AiError ? err.message : "Couldn't create missions. Try again.");
    } finally {
      setConverting(false);
    }
  }

  const b = review ? band(review.score) : null;

  return (
    <Modal onClose={onClose} labelledBy="checkup-title">
      {!review && !error && (
        <div className="flex flex-col items-center py-8 text-center" aria-live="polite">
          <Mascot size={130} mood="thinking" />
          <h2 id="checkup-title" className="mt-3 font-semibold">
            {name} is studying your numbers…
          </h2>
          <p className="mt-1 text-sm text-muted">Deep analysis with NVIDIA Nemotron Ultra. This takes a few seconds.</p>
        </div>
      )}

      {error && !review && (
        <div className="py-6 text-center">
          <Mascot size={100} className="mx-auto" />
          <h2 id="checkup-title" className="mt-3 font-semibold">
            Check-up didn&apos;t finish
          </h2>
          <p className="mt-1 text-sm text-alert">{error}</p>
        </div>
      )}

      {review && b && (
        <div aria-live="polite">
          <div className="flex items-center gap-4">
            <Mascot size={72} mood={review.score >= 60 ? "happy" : "idle"} className="shrink-0" />
            <div className="min-w-0">
              <p className="eyebrow text-star-400">Money check-up</p>
              <h2 id="checkup-title" className="text-lg font-bold leading-snug">
                {review.headline}
              </h2>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-bold">
                {review.score}
                <span className="text-base font-medium text-faint">/100</span>
              </p>
              <p className="text-sm font-semibold">{b.label}</p>
            </div>
            <div className={clsx("mt-2 h-2.5 overflow-hidden rounded-full", b.track)}>
              <div className={clsx("h-full rounded-full", b.fill)} style={{ width: `${review.score}%` }} />
            </div>
          </div>

          {review.strengths.length > 0 && (
            <ul className="mt-6 space-y-2">
              {review.strengths.map((s) => (
                <li key={s} className="flex gap-2 text-sm text-muted">
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-growth" aria-label="Going well" />
                  {s}
                </li>
              ))}
            </ul>
          )}

          <ul className="mt-5 space-y-3">
            {review.issues.map((i) => (
              <li key={i.title} className="rounded-xl bg-fg/[0.03] p-4 ring-1 ring-line">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  {i.severity === "fix" ? (
                    <CircleAlert className="size-4 shrink-0 text-alert" aria-hidden />
                  ) : (
                    <AlertTriangle className="size-4 shrink-0 text-caution" aria-hidden />
                  )}
                  {i.title}
                  <span
                    className={clsx(
                      "ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs",
                      i.severity === "fix" ? "bg-alert/15 text-alert" : "bg-caution/15 text-caution",
                    )}
                  >
                    {i.severity === "fix" ? "Fix now" : "Watch"}
                  </span>
                </p>
                {i.detail && <p className="mt-1.5 text-sm leading-relaxed text-muted">{i.detail}</p>}
              </li>
            ))}
          </ul>

          {review.actions.length > 0 && (
            <>
              <h3 className="mt-6 text-sm font-semibold">Do this in the next two weeks</h3>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-muted marker:font-semibold marker:text-star-300">
                {review.actions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ol>
            </>
          )}

          <div className="mt-6">
            {added ? (
              <p className="flex items-center justify-center gap-2 rounded-full bg-growth/10 px-4 py-2.5 text-sm font-semibold text-growth ring-1 ring-growth/30">
                {added} {added === 1 ? "mission" : "missions"} added ·{" "}
                <Link href="/missions" onClick={onClose} className="underline underline-offset-2">
                  View
                </Link>
              </p>
            ) : (
              <Button className="w-full" onClick={toMissions} disabled={converting}>
                {converting ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <ListPlus className="size-4" aria-hidden />}
                {converting ? "Creating missions…" : "Turn this into missions"}
              </Button>
            )}
            {error && <p className="mt-2 text-center text-sm text-alert">{error}</p>}
          </div>
        </div>
      )}
    </Modal>
  );
}
