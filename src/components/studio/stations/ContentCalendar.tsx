"use client";

import type { FormEvent } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { fieldClass, todayIso } from "@/lib/inputs";
import { ChipField, SaveButton, StudioError, TextField, opts, useDraft, useStudioContext, useStudioRun } from "../kit";
import { CalendarPoster, weekLabel } from "../views";
import { WorkspaceFrame, type LumiLine, type StationNav } from "../Workspace";

const PER_WEEK = [
  { value: "3", label: "3 posts" },
  { value: "5", label: "5 posts" },
  { value: "7", label: "7 posts" },
];
const PLATFORMS = opts(["Instagram", "TikTok", "Facebook", "WhatsApp Status", "Threads"]);

export function ContentCalendar({ nav }: { nav: StationNav }) {
  const run = useStudioRun("calendar");
  const [start, setStart] = useDraft("calendar.start", todayIso());
  const [perWeek, setPerWeek] = useDraft<string[]>("calendar.perWeek", ["5"]);
  const [platforms, setPlatforms] = useDraft<string[]>("calendar.platforms", ["Instagram", "TikTok"]);
  const [focus, setFocus] = useDraft("calendar.focus", "");

  const posts = run.output?.posts ?? null;

  useStudioContext(
    posts
      ? `At the Content calendar. On screen, a week of posts: ${posts.map((p) => `${p.date} ${p.platform} ${p.format}: ${p.idea}`).join("; ")}.`
      : "At the Content calendar, planning a week of social media posts.",
  );

  const lumi: LumiLine = run.busy
    ? { mood: "thinking", text: "Filling in your week…" }
    : run.error
      ? { mood: "idle", text: "My pen ran dry. Let's try that again." }
      : posts
        ? { mood: "happy", text: "Your week is planned! Tap a note to see its caption, then copy and post." }
        : { mood: "idle", text: "Never stare at a blank screen again. I'll plan a whole week of posts with captions." };

  function submit(e: FormEvent) {
    e.preventDefault();
    void run.generate({ start, perWeek: Number(perWeek[0] ?? 5), platforms, focus: focus.trim() });
  }

  const title = posts ? `Content plan: ${weekLabel(posts).replace("Week of", "week of")}` : "";

  return (
    <WorkspaceFrame station="calendar" lumi={lumi} nav={nav}>
      <form onSubmit={submit} className="studio-desk grid gap-6 p-5 sm:p-6 md:grid-cols-2 xl:grid-cols-[auto_auto_minmax(0,1fr)]">
        <TextField label="Week starting">
          <input type="date" value={start} onChange={(e) => setStart(e.target.value || todayIso())} className={`${fieldClass} sm:w-44`} />
        </TextField>
        <ChipField legend="How many" options={PER_WEEK} value={perWeek} onChange={setPerWeek} single />
        <ChipField legend="Platforms" options={PLATFORMS} value={platforms} onChange={setPlatforms} />
        <div className="md:col-span-2 xl:col-span-3 xl:flex xl:items-end xl:gap-4">
          <TextField label="Focus this week" hint="optional">
            <input
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="e.g. new menu item, school holiday orders"
              maxLength={120}
              className={`${fieldClass} xl:w-[420px]`}
            />
          </TextField>
          <Button type="submit" disabled={run.busy || platforms.length === 0} className="mt-4 w-full xl:mt-0 xl:w-auto">
            <CalendarDays className="size-4" aria-hidden />
            {run.busy ? "Planning…" : posts ? "Plan it again" : "Plan my week"}
          </Button>
        </div>
        <div className="md:col-span-2 xl:col-span-3">
          <StudioError message={run.error} />
        </div>
      </form>

      {/* The poster on the wall */}
      <div className="mt-12">
        {posts && !run.busy ? (
          <CalendarPoster
            posts={posts}
            actions={<SaveButton saved={run.isSaved("week")} onClick={() => run.toggleSave("week", title, { tool: "calendar", posts })} tone="light" />}
          />
        ) : (
          <BlankPoster start={start} busy={run.busy} />
        )}
      </div>
    </WorkspaceFrame>
  );
}

function BlankPoster({ start, busy }: { start: string; busy: boolean }) {
  const first = new Date(`${start}T00:00:00`);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(first);
    d.setDate(first.getDate() + i);
    return d;
  });
  return (
    <div className="overflow-hidden rounded-2xl bg-[#EEF2FF] text-space-900 shadow-[0_30px_50px_-24px_rgb(0_0_0/0.85)]" role={busy ? "status" : undefined}>
      <div className="bg-star-400 px-5 py-3">
        <p className="text-sm font-extrabold uppercase tracking-[0.2em]">
          Content plan{" "}
          <span className="font-semibold normal-case tracking-normal">
            · {busy ? "planning your week…" : `Week of ${first.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`}
          </span>
        </p>
      </div>
      <div className="grid gap-px bg-[#C7D2FE] sm:grid-cols-2 xl:grid-cols-7">
        {days.map((d, i) => (
          <div key={i} className="min-h-[90px] bg-[#EEF2FF] p-2.5 xl:min-h-[220px]">
            <p className="text-xs font-bold uppercase tracking-wider text-space-600">
              {d.toLocaleDateString(undefined, { weekday: "short" })} <span className="text-base text-space-900">{d.getDate()}</span>
            </p>
            {busy && i % 2 === 0 ? (
              <div className="mt-2 h-16 animate-pulse rounded-sm bg-[#FFF3C4]" style={{ animationDelay: `${i * 90}ms` }} />
            ) : (
              <div className="mt-2 h-16 rounded-sm border-2 border-dashed border-[#C7D2FE]" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
