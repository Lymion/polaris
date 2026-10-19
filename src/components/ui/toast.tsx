"use client";

import type { ReactNode } from "react";
import { Toaster as SonnerToaster, toast } from "sonner";
import { Check, Info, Undo2 } from "lucide-react";

type Tone = "success" | "info" | "removed";

const ICONS: Record<Tone, ReactNode> = {
  success: <Check className="size-4" strokeWidth={2.75} aria-hidden />,
  info: <Info className="size-4" aria-hidden />,
  removed: <Undo2 className="size-4" aria-hidden />,
};

const ICON_STYLE: Record<Tone, string> = {
  success: "bg-growth/15 text-growth",
  info: "bg-star-400/15 text-star-200",
  removed: "bg-fg/[0.08] text-muted",
};

interface Notice {
  title: string;
  description?: string;
  tone?: Tone;
  /** One button: Undo after a removal, View after something lands somewhere else. */
  action?: { label: string; onClick: () => void };
}

/**
 * Confirms something that happened out of view, or offers a way back. Things that change right
 * where the owner is looking (a ticked step, a typed amount) don't need one.
 */
export function notify({ title, description, tone = "success", action }: Notice) {
  return toast.custom(
    (id) => (
      <div className="flex w-[min(356px,calc(100vw-2rem))] items-center gap-3 rounded-2xl bg-surface-800/95 py-3 pl-3 pr-2 shadow-2xl ring-1 ring-line backdrop-blur-xl">
        <span className={`grid size-8 shrink-0 place-items-center rounded-full ${ICON_STYLE[tone]}`}>{ICONS[tone]}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-ink">{title}</p>
          {description && <p className="mt-0.5 truncate text-xs text-muted" title={description}>{description}</p>}
        </div>
        {action && (
          <button
            type="button"
            onClick={() => {
              action.onClick();
              toast.dismiss(id);
            }}
            className="tap-target relative shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-star-200 transition-[transform,background-color] duration-150 ease-out hover:bg-fg/[0.08] active:scale-[0.97]"
          >
            {action.label}
          </button>
        )}
      </div>
    ),
    // An Undo needs a moment longer to reach.
    { duration: action ? 6000 : 4000 },
  );
}

/** Mounted once. Bottom centre keeps clear of Lumi's corner; on phones it sits above the tab bar. */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      offset={24}
      mobileOffset={{ bottom: "calc(env(safe-area-inset-bottom) + 84px)", left: 16, right: 16 }}
      gap={10}
      visibleToasts={3}
      containerAriaLabel="Notifications"
      toastOptions={{ unstyled: true }}
    />
  );
}
