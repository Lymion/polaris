"use client";

import clsx from "clsx";
import { Check, LayoutDashboard, Map } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { EXPERIENCES, THEMES, worldAllowed, type Experience } from "@/lib/appearance";
import { usePolaris } from "@/lib/store";

const EXPERIENCE_ICONS: Record<Experience, typeof Map> = { classic: LayoutDashboard, world: Map };

/** Experience (classic dashboard or interactive world) and colour theme. Changes apply at once. */
export function AppearancePicker() {
  const prefs = usePolaris((s) => s.prefs);
  const setPrefs = usePolaris((s) => s.setPrefs);
  const canWorld = worldAllowed(prefs.theme);

  return (
    <div className="space-y-7">
      <fieldset>
        <legend className="text-sm font-semibold">Experience</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {EXPERIENCES.map((e) => {
            const Icon = EXPERIENCE_ICONS[e.id];
            const disabled = e.id === "world" && !canWorld;
            const selected = (canWorld ? prefs.experience : "classic") === e.id;
            return (
              <button
                key={e.id}
                type="button"
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => setPrefs({ experience: e.id })}
                className={clsx(
                  "relative flex flex-col items-start gap-2 rounded-2xl p-4 text-left ring-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  selected ? "bg-star-400/10 ring-2 ring-star-400" : "bg-fg/[0.03] ring-line hover:bg-fg/[0.06]",
                )}
              >
                <ExperiencePreview id={e.id} />
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Icon className="size-4 text-star-300" aria-hidden /> {e.name}
                </span>
                <span className="text-xs leading-relaxed text-muted">
                  {disabled ? "Not available with the Workspace theme, which keeps things plain." : e.blurb}
                </span>
                {selected && <Check className="absolute right-3 top-3 size-4 text-star-300" aria-hidden />}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold">Theme</legend>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {THEMES.map((t) => {
            const selected = prefs.theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setPrefs({ theme: t.id })}
                className={clsx(
                  "relative rounded-2xl p-3 text-left ring-1 transition-colors",
                  selected ? "bg-star-400/10 ring-2 ring-star-400" : "bg-fg/[0.03] ring-line hover:bg-fg/[0.06]",
                )}
              >
                <span className="flex h-12 overflow-hidden rounded-xl ring-1 ring-black/10" aria-hidden>
                  <span className="flex-[2]" style={{ backgroundColor: t.swatch[0] }} />
                  <span className="flex-[2]" style={{ backgroundColor: t.swatch[1] }} />
                  <span className="flex-1" style={{ backgroundColor: t.swatch[2] }} />
                </span>
                <span className="mt-2 block text-sm font-semibold">{t.name}</span>
                <span className="block text-xs leading-snug text-muted">{t.blurb}</span>
                {selected && <Check className="absolute right-2.5 top-2.5 size-4 rounded-full bg-star-400 p-0.5 text-on-accent" aria-hidden />}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

/** A tiny sketch of each experience so the choice is easy to picture. */
function ExperiencePreview({ id }: { id: Experience }) {
  if (id === "classic") {
    return (
      <span className="grid h-20 w-full grid-cols-[22%_1fr] gap-1.5 rounded-xl bg-surface-950 p-1.5 ring-1 ring-line" aria-hidden>
        <span className="rounded-md bg-fg/[0.06]" />
        <span className="grid grid-rows-[auto_1fr] gap-1.5">
          <span className="h-3 w-2/3 rounded bg-fg/[0.1]" />
          <span className="grid grid-cols-3 gap-1.5">
            <span className="rounded-md bg-fg/[0.08]" />
            <span className="rounded-md bg-fg/[0.08]" />
            <span className="rounded-md bg-star-400/40" />
          </span>
        </span>
      </span>
    );
  }
  return (
    <span
      className="relative block h-20 w-full overflow-hidden rounded-xl ring-1 ring-line"
      style={{ background: "linear-gradient(var(--room-wall-l-a), var(--room-wall-l-b))" }}
      aria-hidden
    >
      {/* board, monitor, door, desk */}
      <span className="absolute left-[6%] top-[12%] h-[48%] w-[24%] rounded-sm border-2 border-[#6b4a2c] bg-[#b98552]" />
      <span className="absolute left-[38%] top-[18%] h-[44%] w-[30%] rounded-sm border-[3px] border-[#0a0f1f] bg-[#16306e]" />
      <span className="absolute right-[5%] top-[8%] h-[70%] w-[14%] rounded-t-sm bg-[#8a6a4a]" />
      <span className="absolute inset-x-0 bottom-0 h-[30%]" style={{ background: "linear-gradient(var(--desk-top-a), var(--desk-top-b))" }} />
      <span className="absolute left-[72%] top-[48%] size-3 rotate-45 rounded-[3px] bg-[#ffc94d] shadow-[0_0_10px_#ffc94d]" />
    </span>
  );
}

export function AppearanceDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Appearance" onClose={onClose}>
      <p className="mt-1 text-sm text-muted">Choose how Polaris looks and feels. You can change it anytime.</p>
      <div className="mt-6">
        <AppearancePicker />
      </div>
    </Modal>
  );
}
