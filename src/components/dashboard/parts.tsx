import Link from "next/link";
import clsx from "clsx";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { Hint } from "@/components/ui/Hint";
import { Ticker } from "@/components/ui/motion";

export function CardTitle({ icon: Icon, title, href }: { icon: LucideIcon; title: string; href: string }) {
  return (
    <div className="relative flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Icon className="size-[18px] text-star-300" aria-hidden />
        {title}
      </h2>
      {/* Padded out to a comfortable tap target; the negative margin keeps the text aligned to the card edge. */}
      <Link
        href={href}
        className="tap-target relative -mr-2 inline-flex h-8 items-center gap-0.5 rounded-full px-2 text-xs font-medium text-muted transition-colors hover:bg-fg/[0.05] hover:text-ink"
      >
        Open <ChevronRight className="size-3.5" aria-hidden />
      </Link>
    </div>
  );
}

/** A labelled figure. `hint` is context for it (last month, what it's worth), kept behind an ⓘ. */
export function Stat({ label, value, num, tone, hint }: { label: string; value: string; num?: number; tone?: "good" | "bad" | "gold"; hint?: string }) {
  return (
    // A column whose label grows: when one label wraps to two lines, the values in a row still line up.
    <div className="flex min-w-0 flex-col">
      <dt className="eyebrow flex flex-1 items-center gap-1.5 text-faint">
        {label}
        {hint && <Hint label={`About ${label.toLowerCase()}`}>{hint}</Hint>}
      </dt>
      <dd
        className={clsx(
          "mt-1 text-lg font-bold tabular-nums sm:text-xl",
          tone === "good" && "text-growth",
          tone === "bad" && "text-alert",
          tone === "gold" && "text-star-300",
        )}
      >
        <Ticker value={value} num={num} />
      </dd>
    </div>
  );
}
