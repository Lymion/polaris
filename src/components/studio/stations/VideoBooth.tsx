"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Check, Clapperboard, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { AiError, generateMissions } from "@/lib/ai/client";
import { fieldClass } from "@/lib/inputs";
import { usePolaris } from "@/lib/store";
import type { VideoIdea } from "@/lib/studio";
import { ChipField, SaveButton, StudioError, TextField, opts, useDraft, useStudioContext, useStudioRun } from "../kit";
import { VideoIdeaCard } from "../views";
import { WorkspaceFrame, type LumiLine, type StationNav } from "../Workspace";

const PLATFORMS = opts(["TikTok", "Instagram Reels", "YouTube Shorts", "Facebook"]);
const GOALS = opts(["Get views", "Get orders", "Build trust", "Show behind the scenes", "Teach something"]);
const STYLES = opts(["Funny", "Aesthetic", "Storytelling", "Educational", "On-trend", "Satisfying"]);
const CREW = opts(["Just me", "Me and a friend", "Small team"]);

export function VideoBooth({ nav }: { nav: StationNav }) {
  const products = usePolaris((s) => s.products);
  const run = useStudioRun("video");
  const [platform, setPlatform] = useDraft<string[]>("video.platform", ["TikTok"]);
  const [goal, setGoal] = useDraft<string[]>("video.goal", ["Get orders"]);
  const [topic, setTopic] = useDraft("video.topic", "");
  const [styles, setStyles] = useDraft<string[]>("video.styles", []);
  const [crew, setCrew] = useDraft<string[]>("video.crew", ["Just me"]);
  const [missions, setMissions] = useDraft<Record<string, boolean>>("video.missions", {});

  const ideas = run.output?.ideas ?? null;

  useStudioContext(
    ideas
      ? `At the Video booth. On screen, ${ideas.length} ${platform[0] ?? ""} video ideas: ${ideas.map((i) => `"${i.title}" (hook: ${i.hook})`).join("; ")}.`
      : "At the Video booth, planning short videos.",
  );

  const lumi: LumiLine = run.busy
    ? { mood: "thinking", text: "Storyboarding… quiet on set!" }
    : run.error
      ? { mood: "idle", text: "The camera hiccupped. Let's do another take." }
      : ideas
        ? { mood: "happy", text: "Three takes ready to film with your phone. The first 2 seconds matter most, so nail the hook!" }
        : { mood: "idle", text: "Lights, camera, phone! Tell me what to film and I'll storyboard three ideas." };

  function submit(e: FormEvent) {
    e.preventDefault();
    void run.generate({ platform: platform[0] ?? "", goal: goal[0] ?? "", topic: topic.trim(), styles, crew: crew[0] ?? "" });
  }

  return (
    <WorkspaceFrame station="video" lumi={lumi} nav={nav}>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:items-start">
        <form onSubmit={submit} className="studio-desk space-y-6 p-5 sm:p-6">
          <ChipField legend="Platform" options={PLATFORMS} value={platform} onChange={setPlatform} single />
          <ChipField legend="Goal" options={GOALS} value={goal} onChange={setGoal} single />
          <TextField label="What to feature" hint="optional">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. our new pandan cake"
              maxLength={120}
              className={fieldClass}
            />
          </TextField>
          {products.length > 0 && (
            <div className="-mt-3 flex flex-wrap gap-1.5">
              {products.slice(0, 6).map((p) => (
                <Chip key={p.id} selected={topic === p.name} onClick={() => setTopic(p.name)}>
                  {p.name}
                </Chip>
              ))}
            </div>
          )}
          <ChipField legend="Style" hint="up to 3" options={STYLES} value={styles} onChange={setStyles} max={3} />
          <ChipField legend="Who's filming" options={CREW} value={crew} onChange={setCrew} single />
          <StudioError message={run.error} />
          <Button type="submit" disabled={run.busy} className="w-full">
            <Clapperboard className="size-4" aria-hidden />
            {run.busy ? "Storyboarding…" : ideas ? "Three more takes" : "Storyboard ideas"}
          </Button>
        </form>

        {/* The stage, lit by the ring light */}
        <div className="relative">
          <div aria-hidden className="card-glow pointer-events-none absolute -top-16 left-1/2 h-64 w-[80%] -translate-x-1/2 rounded-full bg-[#FEF3C7]/10 blur-3xl" />
          {run.busy ? (
            <Viewfinder rolling />
          ) : ideas ? (
            <div className="relative space-y-6">
              {ideas.map((idea, i) => (
                <VideoIdeaCard
                  key={idea.title}
                  idea={idea}
                  index={i}
                  actions={
                    <>
                      <SaveButton saved={run.isSaved(idea.title)} onClick={() => run.toggleSave(idea.title, idea.title, { tool: "video", ideas: [idea] })} />
                      <FilmMission
                        idea={idea}
                        platform={platform[0] ?? "social media"}
                        added={!!missions[idea.title]}
                        onAdded={() => setMissions((m) => ({ ...m, [idea.title]: true }))}
                      />
                    </>
                  }
                />
              ))}
            </div>
          ) : (
            <Viewfinder />
          )}
        </div>
      </div>
    </WorkspaceFrame>
  );
}

/** Before there's anything to show: a camera viewfinder waiting to roll. */
function Viewfinder({ rolling = false }: { rolling?: boolean }) {
  const corner = "absolute size-8 border-fg/50";
  return (
    <div className="scope-dark relative grid min-h-[420px] place-items-center overflow-hidden rounded-2xl bg-black/85 p-8 ring-1 ring-fg/10" role={rolling ? "status" : undefined}>
      <span className={`${corner} left-4 top-4 border-l-2 border-t-2`} aria-hidden />
      <span className={`${corner} right-4 top-4 border-r-2 border-t-2`} aria-hidden />
      <span className={`${corner} bottom-4 left-4 border-b-2 border-l-2`} aria-hidden />
      <span className={`${corner} bottom-4 right-4 border-b-2 border-r-2`} aria-hidden />
      <p className="absolute left-7 top-6 flex items-center gap-2 font-mono text-xs font-bold tracking-widest text-fg/80">
        <span className={`size-2.5 rounded-full ${rolling ? "animate-pulse bg-alert" : "bg-fg/40"}`} aria-hidden />
        {rolling ? "REC" : "STANDBY"}
      </p>
      <p className="absolute right-7 top-6 font-mono text-xs text-fg/50" aria-hidden>
        9:16 · 1080p
      </p>
      <div className="text-center">
        <Clapperboard className="mx-auto size-10 text-fg/30" aria-hidden />
        <p className="mt-3 font-semibold">{rolling ? "Writing your storyboards…" : "Your storyboards show up here"}</p>
        <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
          {rolling ? "Hooks, shot lists, scripts and captions." : "Each one has a hook, a shot-by-shot list, a script and a ready caption."}
        </p>
      </div>
    </div>
  );
}

function FilmMission({ idea, platform, added, onAdded }: { idea: VideoIdea; platform: string; added: boolean; onAdded: () => void }) {
  const addMissions = usePolaris((s) => s.addMissions);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (added) {
    return (
      <Link href="/missions" className="inline-flex items-center gap-1.5 rounded-full bg-growth/15 px-3 py-1.5 text-xs font-semibold text-growth">
        <Check className="size-3.5" aria-hidden /> Mission added
      </Link>
    );
  }

  async function add() {
    setBusy(true);
    setError("");
    try {
      const text = `A marketing mission: film and post this ${platform} video: "${idea.title}". Hook: ${idea.hook}. Shots: ${idea.shots.join("; ")}. Then check how it did (views, likes, saves, and any orders or messages it brought in).`;
      const created = await generateMissions({ mode: "custom", text, source: "ai" });
      addMissions(created);
      onAdded();
    } catch (err) {
      setError(err instanceof AiError ? err.message : "Couldn't create the mission. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={add}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-full bg-fg/[0.08] px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-fg/[0.14] disabled:opacity-60"
      >
        <ListTodo className="size-3.5" aria-hidden /> {busy ? "Adding…" : "Make it a mission"}
      </button>
      {error && (
        <p role="alert" className="w-full text-xs text-alert">
          {error}
        </p>
      )}
    </>
  );
}
