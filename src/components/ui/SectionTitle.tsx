import type { ReactNode } from "react";
import clsx from "clsx";
import { Hint } from "./Hint";

/**
 * A card's heading, with what it shows tucked behind an ⓘ instead of a line of small print under
 * every title.
 */
export function SectionTitle({ icon, title, hint, className }: { icon?: ReactNode; title: string; hint?: ReactNode; className?: string }) {
  return (
    <div className={clsx("flex items-center gap-1.5", className)}>
      <h2 className="flex items-center gap-2 font-semibold">
        {icon}
        {title}
      </h2>
      {hint && <Hint label={`About ${title}`}>{hint}</Hint>}
    </div>
  );
}
