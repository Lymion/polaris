"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ArrowLeft, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { PolarisMark, Wordmark } from "@/components/brand/PolarisMark";
import { Mascot } from "@/components/mascot/Mascot";
import { currencyForCountry } from "@/lib/currency";
import { guessCountry } from "@/lib/locale";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { AppearancePicker } from "@/components/settings/Appearance";
import { demoBusiness } from "@/lib/demo";
import { useHydrated, usePolaris, useProfessional } from "@/lib/store";
import type { Goal, Industry, Stage } from "@/lib/types";

const INDUSTRIES: Industry[] = [
  "Food & Beverage",
  "Retail",
  "Fashion",
  "Beauty & Wellness",
  "Services",
  "Tech & Digital",
  "Creative & Arts",
  "Other",
];

const STAGES: { value: Stage; hint: string }[] = [
  { value: "Idea", hint: "Still planning" },
  { value: "Just started", hint: "Under 1 year" },
  { value: "Growing", hint: "1 to 3 years" },
  { value: "Established", hint: "3+ years" },
];

const GOALS: Goal[] = [
  "Get more customers",
  "Increase profit",
  "Build my brand",
  "Get organized",
  "Launch a new product",
];

/** Steps after the splash: look and feel, you, your business, your goal, your guide. */
const LAST_STEP = 5;

const inputClass =
  "w-full rounded-xl bg-fg/[0.05] px-4 py-3 text-ink ring-1 ring-line placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-star-400/70";

export function Onboarding() {
  const router = useRouter();
  const updateProfile = usePolaris((s) => s.updateProfile);
  const professional = useProfessional();
  const hydrated = useHydrated();

  // Hidden way in for demos: /welcome#atelier-nura loads the demo business. It replaces
  // everything saved, so ask first if a business already exists.
  useEffect(() => {
    if (!hydrated) return;
    function loadDemo() {
      if (window.location.hash !== "#atelier-nura") return;
      const { profile } = usePolaris.getState();
      if (profile.onboarded && !window.confirm(`Replace ${profile.businessName || "your business"} with the Atelier Nura demo? Everything saved will be lost.`)) return;
      usePolaris.setState(demoBusiness());
      router.replace("/");
    }
    loadDemo();
    window.addEventListener("hashchange", loadDemo);
    return () => window.removeEventListener("hashchange", loadDemo);
  }, [hydrated, router]);

  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState<Industry | null>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [guideName, setGuideName] = useState("");
  const [country, setCountry] = useState("");

  function next() {
    if (step === 2 && (!ownerName.trim() || !businessName.trim())) {
      return setError("Add your name and your business name to continue.");
    }
    if (step === 2 && !country) setCountry(guessCountry());
    if (step === 3 && (!industry || !stage || !country.trim())) {
      return setError("Pick your industry, your stage and the country you operate in.");
    }
    if (step === 4 && !goal) return setError("Pick the goal that matters most right now.");
    if (step === LAST_STEP) {
      updateProfile({
        ownerName: ownerName.trim(),
        businessName: businessName.trim(),
        description: description.trim(),
        industry,
        stage,
        goal,
        country: country.trim(),
        currency: currencyForCountry(country) ?? "USD",
        mascotName: guideName.trim().slice(0, 24) || "Lumi",
        onboarded: true,
      });
      router.replace("/");
      return;
    }
    setError("");
    setStep(step + 1);
  }

  function back() {
    setError("");
    setStep(step - 1);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        {step === 0 ? (
          <div className="flex flex-col items-center text-center">
            <PolarisMark size={132} className="drop-shadow-[0_12px_40px_rgba(59,111,224,0.45)]" />
            <Wordmark className="mt-4 text-7xl" />
            <p className="mt-4 text-lg text-muted">Your North Star for business growth.</p>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-faint">
              Missions to grow your business, a creative studio for your brand, an AI advisor for when things go
              sideways, and a treasury that teaches you to master your cashflow.
            </p>
            <Button size="lg" className="mt-10" onClick={() => setStep(1)}>
              Chart your course <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        ) : (
          <div className={clsx("panel p-6 sm:p-8", step === 1 && "sm:-mx-16")}>
            <StepDots step={step} />

            {step === 1 && (
              <section>
                <h1 className="text-2xl font-bold tracking-tight">Make it yours</h1>
                <p className="mt-1 text-sm text-muted">
                  Pick how Polaris looks and feels. It changes as you tap, and you can switch anytime from Appearance.
                </p>
                <div className="mt-6">
                  <AppearancePicker />
                </div>
              </section>
            )}

            {step === 2 && (
              <section>
                <h1 className="text-2xl font-bold tracking-tight">Let&apos;s meet you</h1>
                <p className="mt-1 text-sm text-muted">Your advisor uses this to give advice that fits your business.</p>
                <div className="mt-6 space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">Your name</span>
                    <input
                      className={inputClass}
                      value={ownerName}
                      onChange={(e) => {
                        setOwnerName(e.target.value);
                        setError("");
                      }}
                      placeholder="e.g. Aisha"
                      autoFocus
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">Business name</span>
                    <input
                      className={inputClass}
                      value={businessName}
                      onChange={(e) => {
                        setBusinessName(e.target.value);
                        setError("");
                      }}
                      placeholder="e.g. Sunrise Bakery"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">
                      What do you sell? <span className="font-normal text-faint">(optional)</span>
                    </span>
                    <textarea
                      className={clsx(inputClass, "min-h-24 resize-none")}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Homemade cakes and pastries, sold from a small shop and on Instagram"
                    />
                  </label>
                </div>
              </section>
            )}

            {step === 3 && (
              <section>
                <h1 className="text-2xl font-bold tracking-tight">Where are you now?</h1>
                <p className="mt-1 text-sm text-muted">Every journey starts from somewhere.</p>
                <h2 className="mb-2.5 mt-6 text-sm font-medium">Industry</h2>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRIES.map((i) => (
                    <Chip
                      key={i}
                      selected={industry === i}
                      onClick={() => {
                        setIndustry(i);
                        setError("");
                      }}
                    >
                      {i}
                    </Chip>
                  ))}
                </div>
                <h2 className="mb-2.5 mt-6 text-sm font-medium">Stage</h2>
                <div className="grid grid-cols-2 gap-2">
                  {STAGES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      aria-pressed={stage === s.value}
                      onClick={() => {
                        setStage(s.value);
                        setError("");
                      }}
                      className={clsx(
                        "rounded-xl px-4 py-3 text-left ring-1 transition-[transform,background-color,color,box-shadow] duration-150 ease-out active:scale-[0.98]",
                        stage === s.value
                          ? "bg-star-400/15 ring-star-400/60"
                          : "bg-fg/[0.04] ring-line hover:bg-fg/[0.08]",
                      )}
                    >
                      <span className={clsx("block text-sm font-semibold", stage === s.value && "text-star-200")}>
                        {s.value}
                      </span>
                      <span className="text-xs text-faint">{s.hint}</span>
                    </button>
                  ))}
                </div>
                <label className="mt-6 block">
                  <span className="mb-1.5 block text-sm font-medium">Country</span>
                  <input
                    className={inputClass}
                    value={country}
                    onChange={(e) => {
                      setCountry(e.target.value);
                      setError("");
                    }}
                    placeholder="e.g. Malaysia"
                  />
                  <span className="mt-1.5 block text-xs text-faint">
                    {currencyForCountry(country)
                      ? `Money will be shown in ${currencyForCountry(country)}.`
                      : "Sets your currency and the right offices for registration."}
                  </span>
                </label>
              </section>
            )}

            {step === 4 && (
              <section>
                <h1 className="text-2xl font-bold tracking-tight">Where do you want to go?</h1>
                <p className="mt-1 text-sm text-muted">
                  Pick your main goal. Your first missions will be built around it.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {GOALS.map((g) => (
                    <Chip
                      key={g}
                      selected={goal === g}
                      onClick={() => {
                        setGoal(g);
                        setError("");
                      }}
                    >
                      {g}
                    </Chip>
                  ))}
                </div>
              </section>
            )}

            {step === LAST_STEP && (
              <section className="text-center">
                <Mascot size={150} greet className="mx-auto" />
                <h1 className="mt-2 text-2xl font-bold tracking-tight">{professional ? "Meet your assistant" : "Meet your guide"}</h1>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
                  {professional ? (
                    <>
                      Hi {ownerName.trim() || "there"}. I&apos;m your business assistant, available from the corner of every page
                      whenever you need advice. What should I be called?
                    </>
                  ) : (
                    <>
                      Hi {ownerName.trim() || "there"}! I&apos;m a little star with a big book of business know-how. I&apos;ll be in
                      the corner of every page. Tap me whenever you&apos;re stuck. What should I be called?
                    </>
                  )}
                </p>
                <input
                  className={clsx(inputClass, "mx-auto mt-6 max-w-xs text-center")}
                  value={guideName}
                  onChange={(e) => setGuideName(e.target.value)}
                  placeholder="Lumi"
                  maxLength={24}
                  aria-label="Your guide's name"
                  autoFocus
                />
                <p className="mt-2 text-xs text-faint">Leave it blank to keep &ldquo;Lumi&rdquo;.</p>
                <p className="mx-auto mt-6 flex max-w-sm gap-2 rounded-2xl bg-fg/[0.04] p-3 text-left text-xs leading-relaxed text-muted ring-1 ring-line">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-star-300" aria-hidden />
                  <span>
                    Your business data stays in this browser. When you use AI help, the details it needs go to NVIDIA Nemotron on
                    Nebius to write the answer.{" "}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-star-300 underline decoration-star-300/40 underline-offset-4 transition-colors hover:decoration-star-300"
                    >
                      Privacy notice
                    </a>
                  </span>
                </p>
              </section>
            )}

            {error && (
              <p role="alert" className="mt-5 text-sm text-alert">
                {error}
              </p>
            )}

            <div className="mt-8 flex items-center justify-between">
              <Button variant="ghost" onClick={back}>
                <ArrowLeft className="size-4" aria-hidden /> Back
              </Button>
              <Button onClick={next}>
                {step === LAST_STEP ? (
                  <>
                    Launch Polaris <Sparkles className="size-4" aria-hidden />
                  </>
                ) : (
                  <>
                    Continue <ArrowRight className="size-4" aria-hidden />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function StepDots({ step }: { step: number }) {
  return (
    <div className="mb-6 flex items-center gap-2" aria-label={`Step ${step} of ${LAST_STEP}`}>
      {Array.from({ length: LAST_STEP }, (_, i) => i + 1).map((n) => (
        <span
          key={n}
          className={clsx(
            "h-1.5 rounded-full transition-[width,background-color] duration-300 ease-out",
            n === step ? "w-8 bg-star-400" : n < step ? "w-4 bg-orbit-400" : "w-4 bg-fg/10",
          )}
        />
      ))}
    </div>
  );
}
