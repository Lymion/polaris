"use client";

import { useState } from "react";
import clsx from "clsx";
import { Pencil, Sparkles } from "lucide-react";
import { Mascot } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { AiError, reviewMission } from "@/lib/ai/client";
import type { MissionReview } from "@/lib/ai/shared";
import { mascotName, usePolaris } from "@/lib/store";
import type { CheckInQuestion, Mission } from "@/lib/types";

/** Used for missions created before report questions existed, or when the model gave none. */
const FALLBACK_QUESTIONS: CheckInQuestion[] = [
  { id: "did", question: "What exactly did you do to finish this mission?", kind: "text" },
  { id: "result", question: "What happened? Share any result or number you got.", kind: "text" },
];

const fieldClass =
  "w-full rounded-xl bg-fg/[0.05] px-4 py-3 text-sm text-ink ring-1 ring-line placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-focus/70";

type Phase = "form" | "reviewing" | "result";

export function ReportDialog({ mission, onClose }: { mission: Mission; onClose: () => void }) {
  const profile = usePolaris((s) => s.profile);
  const completeMission = usePolaris((s) => s.completeMission);
  const questions = mission.checkIn?.length ? mission.checkIn : FALLBACK_QUESTIONS;
  const name = mascotName(profile);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<Phase>("form");
  const [review, setReview] = useState<MissionReview | null>(null);
  const [error, setError] = useState("");

  async function submit() {
    for (const q of questions) {
      const a = (answers[q.id] ?? "").trim();
      if (!a) return setError("Answer every question so I can check your results.");
      if (q.kind !== "text" && !/\d/.test(a)) return setError(`"${q.question}" needs a number.`);
    }
    setError("");
    setPhase("reviewing");
    try {
      const result = await reviewMission(
        mission,
        questions.map((q) => ({ question: q.question, answer: format(q, answers[q.id], profile.currency) })),
      );
      setReview(result);
      setPhase("result");
    } catch (err) {
      setError(err instanceof AiError ? err.message : "I couldn't check your report. Try again.");
      setPhase("form");
    }
  }

  function collect() {
    if (!review) return;
    completeMission(
      mission.id,
      {
        answers: questions.map((q) => ({ question: q.question, answer: format(q, answers[q.id], profile.currency) })),
        feedback: review.feedback,
        at: new Date().toISOString(),
      },
      review.insights,
    );
    onClose();
  }

  return (
    <Modal onClose={phase === "reviewing" ? () => {} : onClose} labelledBy="report-title">
      {phase === "form" && (
        <>
          <div className="flex items-center gap-3">
            <Mascot size={64} greet />
            <div>
              <p className="eyebrow text-star-400">Mission report</p>
              <h2 id="report-title" className="text-lg font-bold leading-snug">
                {mission.title}
              </h2>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted">
            How did it go? {name} checks your answers before handing out XP, and remembers your numbers to plan
            better missions.
          </p>
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            {questions.map((q, i) => (
              <label key={q.id} className="block">
                <span className="mb-1.5 block text-sm font-medium">{q.question}</span>
                {q.kind === "text" ? (
                  <textarea
                    className={clsx(fieldClass, "min-h-20 resize-none")}
                    value={answers[q.id] ?? ""}
                    onChange={(e) => {
                      setAnswers({ ...answers, [q.id]: e.target.value });
                      setError("");
                    }}
                    autoFocus={i === 0}
                  />
                ) : (
                  <div className="relative">
                    {q.kind === "money" && (
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-faint">
                        {profile.currency}
                      </span>
                    )}
                    <input
                      inputMode="decimal"
                      className={clsx(fieldClass, q.kind === "money" && "pl-14", q.kind === "percent" && "pr-10")}
                      value={answers[q.id] ?? ""}
                      onChange={(e) => {
                        setAnswers({ ...answers, [q.id]: e.target.value });
                        setError("");
                      }}
                      placeholder={q.kind === "percent" ? "e.g. 2.4" : "e.g. 12"}
                      autoFocus={i === 0}
                    />
                    {q.kind === "percent" && (
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-faint">
                        %
                      </span>
                    )}
                  </div>
                )}
              </label>
            ))}
            {error && (
              <p role="alert" className="text-sm text-alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full">
              Send my report to {name}
            </Button>
          </form>
        </>
      )}

      {phase === "reviewing" && (
        <div className="flex flex-col items-center py-6 text-center" aria-live="polite">
          <Mascot size={130} mood="thinking" />
          <p className="mt-3 font-semibold">{name} is reading your report…</p>
          <p className="mt-1 text-sm text-muted">Checking your results against the mission.</p>
        </div>
      )}

      {phase === "result" && review && (
        <div className="text-center" aria-live="polite">
          <Mascot size={130} mood={review.verdict === "complete" ? "happy" : "idle"} className="mx-auto" />
          <h2 id="report-title" className="mt-2 text-xl font-bold">
            {review.verdict === "complete" ? "Mission complete!" : "Almost there"}
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">{review.feedback}</p>

          {review.insights.length > 0 && (
            <div className="mt-5 text-left">
              <p className="eyebrow text-faint">I&apos;ll remember</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {review.insights.map((i) => (
                  <li key={i.label} className="rounded-full bg-fg/[0.06] px-3 py-1.5 text-xs ring-1 ring-line">
                    <span className="text-muted">{i.label}:</span> <span className="font-semibold">{i.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {review.verdict === "complete" ? (
            <Button className="mt-7 w-full" onClick={collect} autoFocus>
              <Sparkles className="size-4" aria-hidden /> Collect +{mission.xp} XP
            </Button>
          ) : (
            <Button className="mt-7 w-full" variant="secondary" onClick={() => setPhase("form")} autoFocus>
              <Pencil className="size-4" aria-hidden /> Edit my answers
            </Button>
          )}
        </div>
      )}
    </Modal>
  );
}

function format(q: CheckInQuestion, raw: string | undefined, currency: string) {
  const a = (raw ?? "").trim();
  if (q.kind === "percent" && !a.endsWith("%")) return `${a}%`;
  if (q.kind === "money") return `${currency} ${a}`;
  return a;
}
