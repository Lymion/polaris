"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import clsx from "clsx";
import { Bookmark, BookmarkCheck, Check, Copy } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { notify } from "@/components/ui/toast";
import { AiError, generateStudio } from "@/lib/ai/client";
import { newId, usePolaris } from "@/lib/store";
import type { StudioOutput, StudioTool } from "@/lib/studio";

type OutputOf<T extends StudioTool> = Extract<StudioOutput, { tool: T }>;

interface Run {
  output: StudioOutput | null;
  /** Result piece key -> saved library item id. */
  saved: Record<string, string>;
  busy: boolean;
  error: string;
}

const EMPTY_RUN: Run = { output: null, saved: {}, busy: false, error: "" };

// Kept for the whole visit (not persisted), so walking to another station and back, or a
// reply landing after you left, doesn't lose what was made. Form choices are kept the same way.
let runs: Partial<Record<StudioTool, Run>> = {};
const listeners = new Set<() => void>();
const drafts = new Map<string, unknown>();

function patchRun(tool: StudioTool, patch: Partial<Run>) {
  runs = { ...runs, [tool]: { ...(runs[tool] ?? EMPTY_RUN), ...patch } };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const MADE: Record<StudioTool, string> = { brand: "Your brand kit", campaign: "Your campaign plans", video: "Your video ideas", calendar: "Your week of posts" };

/** Opens a station from anywhere in the studio: the studio follows the address. */
const openStation = (id: string) => {
  window.location.hash = id;
};

/** Form state for a station that survives walking away and back. */
export function useDraft<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => (drafts.has(key) ? (drafts.get(key) as T) : initial));
  useEffect(() => {
    drafts.set(key, value);
  }, [key, value]);
  return [value, setValue] as const;
}

/** Generates with one studio tool and tracks which pieces were saved to the Idea library. */
export function useStudioRun<T extends StudioTool>(tool: T) {
  const saveStudioItem = usePolaris((s) => s.saveStudioItem);
  const removeStudioItem = usePolaris((s) => s.removeStudioItem);
  const library = usePolaris((s) => s.studioItems);
  const run = useSyncExternalStore(
    subscribe,
    () => runs[tool] ?? EMPTY_RUN,
    () => EMPTY_RUN,
  );

  async function generate(input: Record<string, unknown>) {
    if (run.busy) return;
    patchRun(tool, { busy: true, error: "" });
    try {
      const output = await generateStudio(tool, input);
      patchRun(tool, { output, saved: {}, busy: false });
      // Lumi keeps working if you walk off; say so when it's done somewhere you're not looking.
      const here = window.location.pathname === "/studio";
      if (!here || window.location.hash.slice(1) !== tool) {
        notify({
          title: `${MADE[tool]} ${tool === "brand" ? "is" : "are"} ready`,
          description: here ? undefined : "In the Creative Studio",
          tone: "info",
          action: here ? { label: "View", onClick: () => openStation(tool) } : undefined,
        });
      }
    } catch (err) {
      patchRun(tool, {
        busy: false,
        error: err instanceof AiError ? err.message : "Couldn't reach the studio. Check your connection and try again.",
      });
    }
  }

  // A piece deleted from the library no longer counts as saved here.
  const isSaved = (key: string) => {
    const id = run.saved[key];
    return !!id && library.some((item) => item.id === id);
  };

  function toggleSave(key: string, title: string, piece: StudioOutput) {
    if (isSaved(key)) {
      removeStudioItem(run.saved[key]);
      const rest = { ...run.saved };
      delete rest[key];
      patchRun(tool, { saved: rest });
      return;
    }
    const id = newId();
    saveStudioItem({ id, createdAt: new Date().toISOString(), title, output: piece });
    patchRun(tool, { saved: { ...run.saved, [key]: id } });
    notify({ title: "Saved to your Idea library", description: title, action: { label: "View", onClick: () => openStation("library") } });
  }

  return {
    busy: run.busy,
    error: run.error,
    output: run.output?.tool === tool ? (run.output as OutputOf<T>) : null,
    generate,
    isSaved,
    toggleSave,
  };
}

/** Tells the chat what's on screen so Lumi can talk about these exact ideas. */
export function useStudioContext(text: string) {
  const setPageContext = usePolaris((s) => s.setPageContext);
  useEffect(() => {
    setPageContext(text);
    return () => setPageContext(null);
  }, [text, setPageContext]);
}

export function ChipField({
  legend,
  hint,
  options,
  value,
  onChange,
  single = false,
  max,
}: {
  legend: string;
  hint?: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  single?: boolean;
  max?: number;
}) {
  function toggle(v: string) {
    if (single) return onChange([v]);
    if (value.includes(v)) return onChange(value.filter((x) => x !== v));
    if (max && value.length >= max) return onChange([...value.slice(1), v]);
    onChange([...value, v]);
  }
  return (
    <fieldset>
      <legend className="text-sm font-semibold">
        {legend}
        {hint && <span className="ml-1.5 font-normal text-faint">{hint}</span>}
      </legend>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {options.map((o) => (
          <Chip key={o.value} selected={value.includes(o.value)} onClick={() => toggle(o.value)}>
            {o.label}
          </Chip>
        ))}
      </div>
    </fieldset>
  );
}

export function TextField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">
        {label}
        {hint && <span className="ml-1.5 font-normal text-faint">{hint}</span>}
      </span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

export const opts = (labels: string[]) => labels.map((l) => ({ value: l, label: l }));

/** What a small studio button sits on: the dark page, a light paper card, or a strip in the theme's accent. */
type Tone = "dark" | "light" | "accent";
const ON_ACCENT = "bg-on-accent/10 text-on-accent hover:bg-on-accent/15";

/** Small copy-to-clipboard button. */
export function CopyButton({ text, label = "Copy", tone = "dark", className }: { text: string; label?: string; tone?: Tone; className?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard?.writeText(text).then(() => setCopied(true), () => {})}
      aria-label={label ? undefined : copied ? "Copied" : "Copy"}
      title={label ? undefined : "Copy"}
      className={clsx(
        "tap-target relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-[transform,background-color,color] duration-150 ease-out active:scale-[0.97]",
        tone === "accent"
          ? ON_ACCENT
          : tone === "light"
            ? "bg-space-900/[0.07] text-space-800 hover:bg-space-900/[0.14]"
            : "bg-fg/[0.06] text-muted hover:bg-fg/[0.12] hover:text-ink",
        className,
      )}
    >
      {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      {label && (copied ? "Copied" : label)}
    </button>
  );
}

export function SaveButton({ saved, onClick, tone = "dark" }: { saved: boolean; onClick: () => void; tone?: Tone }) {
  const Icon = saved ? BookmarkCheck : Bookmark;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      className={clsx(
        "tap-target relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-[transform,background-color,color] duration-150 ease-out active:scale-[0.97]",
        tone === "accent"
          ? clsx(ON_ACCENT, saved && "ring-1 ring-on-accent/50")
          : saved
            ? "bg-star-400 text-on-accent"
            : tone === "light"
              ? "bg-space-900/[0.08] text-space-800 hover:bg-space-900/[0.15]"
              : "bg-fg/[0.08] text-ink hover:bg-fg/[0.14]",
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {saved ? "Saved" : "Save"}
    </button>
  );
}

export function StudioError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-alert/10 px-3.5 py-2.5 text-sm text-alert ring-1 ring-alert/30">
      {message}
    </p>
  );
}
