"use client";

import type { FormEvent } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { fieldClass } from "@/lib/inputs";
import { usePolaris } from "@/lib/store";
import type { BrandKit } from "@/lib/studio";
import { ChipField, SaveButton, StudioError, TextField, opts, useDraft, useStudioContext, useStudioRun } from "../kit";
import { BrandKitView } from "../views";
import { Sketching, WorkspaceFrame, type LumiLine, type StationNav } from "../Workspace";

const PARTS = [
  { value: "names", label: "Business names" },
  { value: "slogans", label: "Slogans" },
  { value: "voice", label: "Brand voice" },
  { value: "palette", label: "Colour palette" },
  { value: "story", label: "Our story" },
];

const VIBES = opts(["Warm & homely", "Playful", "Premium", "Modern & clean", "Bold", "Traditional", "Natural", "Cute"]);

function partsIn(brand: BrandKit) {
  return [
    brand.names.length && "names",
    brand.slogans.length && "slogans",
    brand.voice && "voice",
    brand.palette.length && "palette",
    brand.story && "story",
  ].filter((p): p is string => !!p);
}

export function BrandDesk({ nav }: { nav: StationNav }) {
  const hasName = usePolaris((s) => !!s.profile.businessName);
  const run = useStudioRun("brand");
  const [parts, setParts] = useDraft<string[]>("brand.parts", hasName ? ["slogans", "voice", "palette"] : ["names", "slogans", "palette"]);
  const [vibe, setVibe] = useDraft<string[]>("brand.vibe", []);
  const [audience, setAudience] = useDraft("brand.audience", "");
  const [notes, setNotes] = useDraft("brand.notes", "");

  const brand = run.output?.brand ?? null;
  const made = brand ? partsIn(brand) : [];
  const madeLabel = made.map((p) => PARTS.find((x) => x.value === p)?.label.toLowerCase()).join(", ");

  useStudioContext(
    brand
      ? `At the Brand desk. On screen, a draft brand kit:${brand.names.length ? ` names ${brand.names.map((n) => n.name).join(", ")};` : ""}${
          brand.slogans.length ? ` slogans "${brand.slogans.join('", "')}";` : ""
        }${brand.palette.length ? ` palette ${brand.palette.map((p) => `${p.name} ${p.hex}`).join(", ")};` : ""}${
          brand.voice ? ` voice traits ${brand.voice.traits.join(", ")};` : ""
        }${brand.story ? ` story: ${brand.story}` : ""}`
      : "At the Brand desk, choosing which brand pieces to create.",
  );

  const lumi: LumiLine = run.busy
    ? { mood: "thinking", text: "Sketching it on the monitor…" }
    : run.error
      ? { mood: "idle", text: "Hmm, that didn't come through. Let's try once more." }
      : brand
        ? { mood: "happy", text: "Here's a first draft! Save it, or change the feel and I'll sketch another." }
        : { mood: "idle", text: "Pick what you need and the feel you're after. I'll put a first draft on the monitor." };

  function submit(e: FormEvent) {
    e.preventDefault();
    if (parts.length) void run.generate({ parts, vibe, audience: audience.trim(), notes: notes.trim() });
  }

  return (
    <WorkspaceFrame station="brand" lumi={lumi} nav={nav}>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:items-start">
        <form onSubmit={submit} className="studio-desk space-y-6 p-5 sm:p-6">
          <ChipField legend="What do you need?" options={PARTS} value={parts} onChange={setParts} />
          <ChipField legend="The feel" hint="up to 3" options={VIBES} value={vibe} onChange={setVibe} max={3} />
          <TextField label="Who it's for" hint="optional">
            <input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. office workers nearby, young families"
              maxLength={160}
              className={fieldClass}
            />
          </TextField>
          <TextField label="Keep or avoid" hint="optional">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. we already use orange, nothing too girly"
              maxLength={280}
              rows={2}
              className={`${fieldClass} resize-none`}
            />
          </TextField>
          <StudioError message={run.error} />
          <Button type="submit" disabled={run.busy || parts.length === 0} className="w-full">
            <Sparkles className="size-4" aria-hidden />
            {run.busy ? "Sketching…" : brand ? "Sketch another" : "Sketch it"}
          </Button>
        </form>

        {/* The monitor on the desk */}
        <div>
          <div className="rounded-[1.75rem] bg-[#0A0F1F] p-2.5 shadow-[0_40px_60px_-30px_rgb(0_0_0/0.9)] ring-1 ring-fg/10 sm:p-3">
            <div className="scope-dark relative min-h-[420px] overflow-clip rounded-[1.25rem] bg-linear-to-b from-[#12204A] to-[#0B1532] p-5 ring-1 ring-fg/5 sm:p-7">
              <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-fg/[0.04] blur-2xl" />
              {run.busy ? (
                <Sketching label="Sketching your brand pieces…" />
              ) : brand ? (
                <>
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted">Brand kit: {madeLabel}</p>
                    <SaveButton
                      saved={run.isSaved("kit")}
                      onClick={() => run.toggleSave("kit", `Brand kit: ${madeLabel}`, { tool: "brand", brand })}
                    />
                  </div>
                  <BrandKitView brand={brand} />
                </>
              ) : (
                <EmptyScreen />
              )}
            </div>
          </div>
          <div aria-hidden className="mx-auto h-8 w-20 bg-linear-to-b from-[#1F2937] to-[#0B1020]" />
          <div aria-hidden className="mx-auto h-3.5 w-56 rounded-[50%] bg-[#1F2937] shadow-[0_10px_18px_rgb(0_0_0/0.55)]" />
        </div>
      </div>
    </WorkspaceFrame>
  );
}

function EmptyScreen() {
  return (
    <div className="grid min-h-[360px] place-items-center text-center">
      <div>
        <div className="mx-auto flex w-56 overflow-hidden rounded-xl opacity-80 ring-1 ring-fg/10" aria-hidden>
          {["#F5B942", "#E0661F", "#3B6FE0", "#0B1B3F", "#EEF2FF"].map((c) => (
            <span key={c} className="h-12 flex-1" style={{ backgroundColor: c }} />
          ))}
        </div>
        <p className="mt-5 font-semibold">Your brand kit shows up here</p>
        <p className="mx-auto mt-1 max-w-xs text-sm text-muted">Names, slogans, a colour palette, your voice and your story, made for your business.</p>
      </div>
    </div>
  );
}
