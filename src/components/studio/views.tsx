"use client";

import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";
import { Check, Clapperboard, X } from "lucide-react";
import type { BrandKit, Campaign, PlannedPost, StudioOutput, VideoIdea } from "@/lib/studio";
import { CopyButton } from "./kit";

// How each Creative Studio result looks. Used at the stations and again in the Idea library.

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="eyebrow text-star-300">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function BrandKitView({ brand }: { brand: BrandKit }) {
  return (
    <div className="space-y-8">
      {brand.palette.length > 0 && (
        <Section title="Colour palette">
          <div className="flex h-12 overflow-hidden rounded-xl ring-1 ring-fg/10" aria-hidden>
            {brand.palette.map((p) => (
              <div key={p.hex} className="flex-1" style={{ backgroundColor: p.hex }} />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {brand.palette.map((p) => (
              <PaintChip key={p.hex} {...p} />
            ))}
          </div>
        </Section>
      )}

      {brand.names.length > 0 && (
        <Section title="Name ideas">
          <div className="grid gap-3 sm:grid-cols-2">
            {brand.names.map((n) => (
              <div key={n.name} className="rounded-xl bg-fg/[0.04] p-4 ring-1 ring-line">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-2xl leading-tight text-star-200" style={{ fontFamily: "var(--font-brand)" }}>
                    {n.name}
                  </p>
                  <CopyButton text={n.name} label="" />
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{n.why}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {brand.slogans.length > 0 && (
        <Section title="Slogans">
          <ul className="space-y-2">
            {brand.slogans.map((s) => (
              <li key={s} className="flex items-center justify-between gap-3 rounded-xl bg-fg/[0.04] px-4 py-3 ring-1 ring-line">
                <span className="font-semibold">&ldquo;{s}&rdquo;</span>
                <CopyButton text={s} label="" />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {brand.voice && (
        <Section title="Brand voice">
          <div className="flex flex-wrap gap-2">
            {brand.voice.traits.map((t) => (
              <span key={t} className="rounded-full bg-star-400/15 px-3 py-1 text-sm font-semibold text-star-200 ring-1 ring-star-400/40">
                {t}
              </span>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <VoiceList title="Sounds like" items={brand.voice.doSay} good />
            <VoiceList title="Never says" items={brand.voice.dontSay} />
          </div>
        </Section>
      )}

      {brand.story && (
        <Section title="Our story" action={<CopyButton text={brand.story} />}>
          <p className="whitespace-pre-line rounded-xl bg-fg/[0.04] p-4 text-[15px] leading-relaxed ring-1 ring-line">{brand.story}</p>
        </Section>
      )}
    </div>
  );
}

function PaintChip({ name, hex, use }: { name: string; hex: string; use: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard?.writeText(hex).then(() => setCopied(true), () => {})}
      title={`Copy ${hex}`}
      className="group overflow-hidden rounded-xl bg-[#F8FAFC] text-left text-space-900 shadow-[0_10px_18px_-10px_rgb(0_0_0/0.7)] transition-transform hover:-translate-y-1"
    >
      <span className="relative block h-16" style={{ backgroundColor: hex }}>
        {copied && (
          <span className="absolute inset-0 grid place-items-center bg-black/30 text-xs font-bold text-white">
            Copied
          </span>
        )}
      </span>
      <span className="block p-2.5">
        <span className="block text-sm font-bold leading-tight">{name}</span>
        <span className="block font-mono text-xs text-space-600">{hex}</span>
        <span className="mt-1 block text-xs leading-snug text-space-700">{use}</span>
      </span>
    </button>
  );
}

function VoiceList({ title, items, good = false }: { title: string; items: string[]; good?: boolean }) {
  const Icon = good ? Check : X;
  return (
    <div className="rounded-xl bg-fg/[0.04] p-4 ring-1 ring-line">
      <p className={clsx("text-sm font-semibold", good ? "text-growth" : "text-alert")}>{title}</p>
      <ul className="mt-2 space-y-2">
        {items.map((i) => (
          <li key={i} className="flex gap-2 text-sm leading-snug">
            <Icon className={clsx("mt-0.5 size-4 shrink-0", good ? "text-growth" : "text-alert")} aria-hidden />
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A campaign as an index card pinned to the cork board. */
export function CampaignCard({ campaign: c, index, actions }: { campaign: Campaign; index: number; actions?: ReactNode }) {
  return (
    <article
      className="relative rounded-md bg-[#FFF8E1] p-5 pt-6 text-space-900 shadow-[0_14px_22px_-10px_rgb(0_0_0/0.55)] sm:p-6 sm:pt-7"
      style={{ transform: `rotate(${index % 2 ? 0.5 : -0.4}deg)` }}
    >
      <span className="studio-pin" aria-hidden />
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B45309]">Plan {String.fromCharCode(65 + index)}</p>
      <h3 className="mt-1 text-xl font-bold leading-tight">{c.name}</h3>
      <p className="mt-2 text-sm leading-relaxed text-space-700">{c.bigIdea}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {c.hook && (
          <div className="rounded-lg bg-[#FDE68A]/60 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-[#92400E]">The hook</p>
            <p className="mt-1 text-sm font-semibold leading-snug">&ldquo;{c.hook}&rdquo;</p>
          </div>
        )}
        {c.offer && (
          <div className="rounded-lg bg-[#BBF7D0]/60 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-[#166534]">The offer</p>
            <p className="mt-1 text-sm font-semibold leading-snug">{c.offer}</p>
          </div>
        )}
      </div>

      {c.channels.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-space-600">Where</p>
          <ul className="mt-1.5 space-y-1.5">
            {c.channels.map((ch) => (
              <li key={ch.channel} className="text-sm leading-snug">
                <span className="font-bold">{ch.channel}:</span> {ch.action}
              </li>
            ))}
          </ul>
        </div>
      )}

      {c.timeline.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-space-600">When</p>
          {/* Steps hang on a red string, like the board in the room. */}
          <ol className="relative mt-2 space-y-2.5 border-l-2 border-[#EF4444] pl-4">
            {c.timeline.map((t, k) => (
              <li key={k} className="relative text-sm leading-snug">
                <span className="absolute -left-[23px] top-1 size-3 rounded-full bg-[#EF4444] ring-2 ring-[#FFF8E1]" aria-hidden />
                <span className="font-bold">{t.when}</span> <span className="text-space-700">{t.task}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {(c.budget || c.watch.length > 0) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {c.budget && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-space-600">Budget</p>
              <p className="mt-1 text-sm leading-snug">{c.budget}</p>
            </div>
          )}
          {c.watch.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-space-600">How you&apos;ll know it worked</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-sm leading-snug">
                {c.watch.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {actions && <div className="mt-5 flex flex-wrap gap-2 border-t border-dashed border-space-900/20 pt-4">{actions}</div>}
    </article>
  );
}

/** A video idea: clapperboard on top, the shot list as a film strip. */
export function VideoIdeaCard({ idea, index, actions }: { idea: VideoIdea; index: number; actions?: ReactNode }) {
  const [showScript, setShowScript] = useState(index === 0);
  return (
    <article className="scope-dark overflow-hidden rounded-2xl bg-[#121831] shadow-[0_24px_40px_-20px_rgb(0_0_0/0.9)] ring-1 ring-fg/10">
      <div className="studio-clapper h-4" aria-hidden />
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-fg/[0.08] px-2.5 py-1 text-muted">
            <Clapperboard className="size-3.5" aria-hidden /> Take {index + 1}
          </span>
          {idea.format && <span className="rounded-full bg-orbit-500/20 px-2.5 py-1 text-orbit-200">{idea.format}</span>}
        </div>
        <h3 className="mt-3 text-xl font-bold leading-tight">{idea.title}</h3>
        <div className="mt-3 rounded-xl bg-star-400/10 p-3 ring-1 ring-star-400/30">
          <p className="text-xs font-bold uppercase tracking-wider text-star-300">First 2 seconds</p>
          <p className="mt-1 text-sm font-semibold leading-snug text-star-50">{idea.hook}</p>
        </div>
        {idea.concept && <p className="mt-3 text-sm leading-relaxed text-muted">{idea.concept}</p>}

        {idea.shots.length > 0 && (
          <div className="mt-4">
            <p className="eyebrow text-faint">Shot list</p>
            {/* Frames wrap onto more rows rather than scrolling sideways */}
            <ol className="studio-film mt-2 grid grid-cols-2 gap-2 rounded-lg sm:grid-cols-3">
              {idea.shots.map((s, k) => (
                <li key={k} className="min-w-0 rounded-md bg-[#1E2747] p-2.5 text-xs leading-snug text-ink ring-1 ring-fg/10">
                  <span className="block font-bold text-star-300">Shot {k + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        )}

        {idea.script && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowScript((v) => !v)}
              aria-expanded={showScript}
              className="eyebrow text-faint hover:text-ink"
            >
              Script {showScript ? "▾" : "▸"}
            </button>
            {showScript && (
              <div className="mt-2 rounded-xl bg-black/30 p-4 ring-1 ring-fg/10">
                <p className="whitespace-pre-line text-[15px] leading-relaxed">{idea.script}</p>
                <CopyButton text={idea.script} label="Copy script" className="mt-3" />
              </div>
            )}
          </div>
        )}

        {idea.caption && (
          <div className="mt-4 rounded-xl bg-fg/[0.04] p-4 ring-1 ring-line">
            <div className="flex items-center justify-between gap-2">
              <p className="eyebrow text-faint">Caption</p>
              <CopyButton text={[idea.caption, idea.hashtags.join(" ")].filter(Boolean).join("\n\n")} />
            </div>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{idea.caption}</p>
            {idea.hashtags.length > 0 && <p className="mt-2 text-sm text-orbit-400">{idea.hashtags.join(" ")}</p>}
          </div>
        )}

        {actions && <div className="mt-5 flex flex-wrap gap-2">{actions}</div>}
      </div>
    </article>
  );
}

const NOTE_COLORS: [RegExp, string][] = [
  [/insta/i, "#FFD1DC"],
  [/tiktok/i, "#CFFAFE"],
  [/face/i, "#C7E0FF"],
  [/whats/i, "#D1FAE5"],
  [/youtube/i, "#FECACA"],
  [/thread|twitter|^x$/i, "#E5E7EB"],
];

const noteColor = (platform: string) => NOTE_COLORS.find(([re]) => re.test(platform))?.[1] ?? "#FFF3C4";

const day = (iso: string) => new Date(`${iso}T00:00:00`);

function addDays(iso: string, n: number) {
  const d = day(iso);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function weekLabel(posts: PlannedPost[]) {
  return posts.length ? `Week of ${day(posts[0].date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}` : "This week";
}

/** A week of posts on a wall-calendar poster, as sticky notes per day. */
export function CalendarPoster({ posts, actions }: { posts: PlannedPost[]; actions?: ReactNode }) {
  const start = posts[0]?.date;
  const days = start ? [...new Set([...Array.from({ length: 7 }, (_, i) => addDays(start, i)), ...posts.map((p) => p.date)])].sort() : [];
  const allCaptions = posts
    .map((p) => `${day(p.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} · ${p.platform} ${p.format}\n${p.caption}\n${p.hashtags.join(" ")}`)
    .join("\n\n");

  return (
    <div className="overflow-hidden rounded-2xl bg-[#EEF2FF] text-space-900 shadow-[0_30px_50px_-24px_rgb(0_0_0/0.85)]">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-star-400 px-5 py-3">
        <p className="text-sm font-extrabold uppercase tracking-[0.2em]">
          Content plan <span className="font-semibold normal-case tracking-normal">· {weekLabel(posts)}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <CopyButton text={allCaptions} label="Copy all captions" tone="light" />
          {actions}
        </div>
      </div>
      <div className="grid gap-px bg-[#C7D2FE] sm:grid-cols-2 xl:grid-cols-7">
        {days.map((d) => {
          const today = posts.filter((p) => p.date === d);
          return (
            <div key={d} className="min-h-[120px] bg-[#EEF2FF] p-2.5 xl:min-h-[260px]">
              <p className="text-xs font-bold uppercase tracking-wider text-space-600">
                {day(d).toLocaleDateString(undefined, { weekday: "short" })}{" "}
                <span className="text-base text-space-900">{day(d).getDate()}</span>
              </p>
              <div className="mt-2 space-y-2.5">
                {today.length === 0 && <p className="text-xs italic text-space-600/70">Rest day</p>}
                {today.map((p, k) => (
                  <StickyNote key={k} post={p} tilt={(d.charCodeAt(9) + k) % 2 ? 1 : -1} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StickyNote({ post, tilt }: { post: PlannedPost; tilt: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-sm p-2.5 shadow-[0_6px_10px_-6px_rgb(0_0_0/0.5)]"
      style={{ backgroundColor: noteColor(post.platform), transform: `rotate(${tilt * 0.8}deg)` }}
    >
      <p className="text-xs font-bold uppercase tracking-wider text-space-700">
        {post.platform} · {post.format}
      </p>
      <p className="mt-1 text-[13px] font-semibold leading-snug">{post.idea}</p>
      {post.caption && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-1.5 text-xs font-semibold text-space-700 underline decoration-dotted underline-offset-2"
          >
            {open ? "Hide caption" : "Caption"}
          </button>
          {open && (
            <div className="mt-1.5">
              <p className="whitespace-pre-line text-xs leading-relaxed">{post.caption}</p>
              {post.hashtags.length > 0 && <p className="mt-1 text-xs text-[#1D4ED8]">{post.hashtags.join(" ")}</p>}
              <CopyButton text={[post.caption, post.hashtags.join(" ")].filter(Boolean).join("\n\n")} tone="light" className="mt-2" />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Any saved result, read-only (the Idea library). */
export function OutputView({ output }: { output: StudioOutput }) {
  switch (output.tool) {
    case "brand":
      return <BrandKitView brand={output.brand} />;
    case "campaign":
      return (
        <div className="studio-cork space-y-6 p-4 sm:p-6">
          {output.campaigns.map((c, i) => (
            <CampaignCard key={c.name} campaign={c} index={i} />
          ))}
        </div>
      );
    case "video":
      return (
        <div className="space-y-5">
          {output.ideas.map((idea, i) => (
            <VideoIdeaCard key={idea.title} idea={idea} index={i} />
          ))}
        </div>
      );
    case "calendar":
      return <CalendarPoster posts={output.posts} />;
  }
}
