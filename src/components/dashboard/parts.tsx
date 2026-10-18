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
      <Link href={href} className="flex items-center text-xs font-medium text-muted hover:text-ink">
        Open <ChevronRight className="size-3.5" aria-hidden />
      </Link>
    </div>
  );
}

export function Stat({ label, value, tone, note }: { label: string; value: string; tone?: "good" | "bad" | "gold"; note?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wider text-faint">{label}</dt>
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
      {note && <dd className="mt-0.5 truncate text-[11px] text-faint">{note}</dd>}
    </div>
  );
}
