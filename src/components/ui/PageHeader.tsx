import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Hint } from "./Hint";

export function PageHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  actions,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  /** What the page is for: worth reading once, so it waits behind the ⓘ beside the title. */
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <div className="icon-tile grid size-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-orbit-500 to-surface-700 ring-1 ring-fg/10">
          <Icon className="size-6 text-star-300" aria-hidden />
        </div>
        <div>
          <p className="eyebrow text-star-400">{eyebrow}</p>
          {/* The ⓘ sits beside the heading, not in it, so the heading reads as just its title. */}
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            <Hint label={`About ${title}`}>{description}</Hint>
          </div>
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
