import Link from "next/link";
import clsx from "clsx";
import { ChevronRight, type LucideIcon } from "lucide-react";

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

export function Stat({ label, value, tone, note }: { label: string; value: string; tone?: "good" | "bad" | "gold"; note?: string }) {
  return (
    // A column whose label grows: when one label wraps to two lines, the values in a row still line up.
    <div className="flex min-w-0 flex-col">
      <dt className="eyebrow flex-1 text-faint">{label}</dt>
      <dd
        className={clsx(
          "mt-1 text-lg font-bold tabular-nums sm:text-xl",
          tone === "good" && "text-growth",
          tone === "bad" && "text-alert",
          tone === "gold" && "text-star-300",
        )}
      >
        {value}
      </dd>
      {note && <dd className="mt-1 text-xs leading-snug text-faint">{note}</dd>}
    </div>
  );
}
