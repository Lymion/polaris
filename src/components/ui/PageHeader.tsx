import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

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
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-orbit-500 to-surface-700 ring-1 ring-fg/10">
          <Icon className="size-6 text-star-300" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-star-400">{eyebrow}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted">{description}</p>
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
