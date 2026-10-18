"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ArrowLeft, ArrowRight, BookOpen, Check, X } from "lucide-react";
import { Mascot } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { LESSONS, LESSON_XP, type Lesson } from "@/lib/lessons";
import { mascotName, usePolaris } from "@/lib/store";

const INTRO = -1;
const FINISH = LESSONS.length;

/** The first lesson not passed yet, or the first one when all are done. */
function nextLesson(done: string[]) {
  const i = LESSONS.findIndex((l) => !done.includes(l.id));
  return i < 0 ? 0 : i;
}

/**
 * The money lessons as a guided tour: an intro from Lumi on the first Treasury visit, one lesson
 * per step with its quick check, and a wrap-up. Skippable at any point; reopened from the header.
 */
export function LessonsTour({ firstVisit, onClose }: { firstVisit: boolean; onClose: () => void }) {
  const done = usePolaris((s) => s.lessonsDone);
  const name = usePolaris((s) => mascotName(s.profile));
  const openMascot = usePolaris((s) => s.openMascot);
  const [step, setStep] = useState(() => (firstVisit ? INTRO : nextLesson(usePolaris.getState().lessonsDone)));
  const top = useRef<HTMLDivElement>(null);

  // Each step starts at the top of the dialog.
  useEffect(() => {
    top.current?.scrollIntoView({ block: "start" });
  }, [step]);

  const lesson = step >= 0 && step < FINISH ? LESSONS[step] : null;
  const passedAll = done.length >= LESSONS.length;

  return (
    <Modal onClose={onClose} labelledBy="tour-title">
      <div ref={top} className="scroll-mt-8" />

      {step === INTRO && (
        <div className="flex flex-col items-center pt-2 text-center">
          <Mascot size={110} mood="happy" greet />
          <h2 id="tour-title" className="mt-3 text-xl font-bold tracking-tight">
            Welcome to your Treasury!
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Before you dive in, I&apos;ve got {LESSONS.length} quick money lessons for you. They take about 5 minutes and use your own
            numbers wherever you&apos;ve logged them.
          </p>
          <ul className="mt-4 flex flex-wrap justify-center gap-1.5">
            {LESSONS.map((l) => (
              <li key={l.id} className="rounded-full bg-fg/[0.05] px-2.5 py-1 text-xs text-muted ring-1 ring-line">
                {l.title}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-star-200">Pass each lesson&apos;s quick check for +{LESSON_XP} XP.</p>
          <Button className="mt-5 w-full" onClick={() => setStep(0)}>
            Start the lessons <ArrowRight className="size-4" aria-hidden />
          </Button>
          <Button variant="ghost" className="mt-2 w-full" onClick={onClose}>
            Skip for now
          </Button>
          <p className="mt-3 text-xs text-faint">You can open them anytime with the Lessons button at the top of Treasury.</p>
        </div>
      )}

      {lesson && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 pr-8">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-star-400">
              <BookOpen className="size-3.5" aria-hidden /> Lesson {step + 1} of {LESSONS.length}
            </p>
            <Progress current={step} done={done} onPick={setStep} />
          </div>
          <LessonContent
            key={lesson.id}
            lesson={lesson}
            onAsk={() => {
              onClose();
              openMascot(lesson.ask);
            }}
          />
          <div className="mt-6 flex items-center gap-2 border-t border-line pt-4">
            <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)} disabled={step === 0}>
              <ArrowLeft className="size-4" aria-hidden /> Back
            </Button>
            <button type="button" onClick={onClose} className="px-2 text-sm text-faint hover:text-ink">
              Skip
            </button>
            <Button size="sm" className="ml-auto" onClick={() => setStep(step + 1)}>
              {step === LESSONS.length - 1 ? "Finish" : "Next lesson"} <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        </>
      )}

      {step === FINISH && (
        <div className="flex flex-col items-center pt-2 text-center">
          <Mascot size={110} mood="happy" />
          <h2 id="tour-title" className="mt-3 text-xl font-bold tracking-tight">
            {passedAll ? "You've got the money basics!" : "That's all the lessons!"}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            You passed {done.length} of {LESSONS.length} quick checks
            {done.length ? `, worth ${done.length * LESSON_XP} XP` : ""}.{" "}
            {passedAll ? "Now let's put them to work on your own numbers." : "You can retry the ones you missed whenever you like."}
          </p>
          <Button className="mt-5 w-full" onClick={onClose}>
            Start using Treasury
          </Button>
          {!passedAll && (
            <Button variant="ghost" className="mt-2 w-full" onClick={() => setStep(nextLesson(done))}>
              Retry the ones I missed
            </Button>
          )}
          <p className="mt-3 text-xs text-faint">Reopen the lessons anytime with the Lessons button at the top. Or just ask {name}.</p>
        </div>
      )}
    </Modal>
  );
}

/** One dot per lesson: green when passed, gold for the current one. Click to jump. */
function Progress({ current, done, onPick }: { current: number; done: string[]; onPick: (i: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      {LESSONS.map((l, i) => {
        const passed = done.includes(l.id);
        return (
          <button
            key={l.id}
            type="button"
            onClick={() => onPick(i)}
            aria-label={`Lesson ${i + 1}: ${l.title}${passed ? " (passed)" : ""}`}
            aria-current={i === current ? "step" : undefined}
            className={clsx(
              "grid h-2.5 place-items-center rounded-full transition-all",
              i === current ? "w-6 bg-star-400" : passed ? "w-2.5 bg-growth" : "w-2.5 bg-fg/20 hover:bg-fg/40",
            )}
          />
        );
      })}
    </div>
  );
}

function LessonContent({ lesson, onAsk }: { lesson: Lesson; onAsk: () => void }) {
  const state = usePolaris();
  const passLesson = usePolaris((s) => s.passLesson);
  const [picked, setPicked] = useState<number | null>(null);
  const passed = state.lessonsDone.includes(lesson.id);
  const currency = state.profile.currency;
  const yours = lesson.yours(state);
  const options = lesson.quiz.options(currency);
  const correct = picked === lesson.quiz.answer;

  function pick(i: number) {
    if (picked === lesson.quiz.answer) return;
    setPicked(i);
    if (i === lesson.quiz.answer) passLesson(lesson.id, lesson.title, LESSON_XP);
  }

  return (
    <>
      <h2 id="tour-title" className="mt-3 text-xl font-bold tracking-tight">
        {lesson.title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted">
        {lesson.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>

      {yours && (
        <div className="mt-5 rounded-xl bg-star-400/10 p-4 text-sm ring-1 ring-star-400/30">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-star-300">Your numbers</p>
          <p className="mt-1 text-ink">{yours}</p>
        </div>
      )}

      <div className="mt-5 rounded-xl bg-fg/[0.03] p-4 ring-1 ring-line">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">
          Quick check {passed ? "· passed" : `· +${LESSON_XP} XP`}
        </p>
        <p className="mt-1.5 text-sm font-semibold">{lesson.quiz.question(currency)}</p>
        <div className="mt-3 space-y-2" role="radiogroup" aria-label="Answer">
          {options.map((o, i) => {
            const mark = picked === i ? (i === lesson.quiz.answer ? "right" : "wrong") : null;
            return (
              <button
                key={o}
                type="button"
                role="radio"
                aria-checked={picked === i}
                onClick={() => pick(i)}
                className={clsx(
                  "flex w-full items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-left text-sm ring-1 transition-colors",
                  mark === "right" && "bg-growth/10 text-ink ring-growth/50",
                  mark === "wrong" && "bg-alert/10 text-ink ring-alert/40",
                  !mark && "bg-fg/[0.03] text-muted ring-line hover:bg-fg/[0.07] hover:text-ink",
                )}
              >
                {o}
                {mark === "right" && <Check className="size-4 shrink-0 text-growth" aria-label="Correct" />}
                {mark === "wrong" && <X className="size-4 shrink-0 text-alert" aria-label="Not quite" />}
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <p className={clsx("mt-3 text-sm", correct ? "text-growth" : "text-muted")} role="status">
            {correct ? `Correct! ${lesson.quiz.why}` : "Not quite. Have another go."}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onAsk}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-star-400/10 py-1.5 pl-1.5 pr-4 text-sm font-semibold text-star-200 ring-1 ring-star-400/40 hover:bg-star-400/20"
      >
        <Mascot size={24} still /> Explain this with my numbers
      </button>
    </>
  );
}
