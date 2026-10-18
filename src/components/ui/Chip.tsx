import clsx from "clsx";
import type { ReactNode } from "react";

export function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={clsx(
        "rounded-full px-4 py-2 text-sm font-medium ring-1 transition-[transform,background-color,color,box-shadow] duration-150 ease-out active:scale-[0.97]",
        selected
          ? "bg-star-400/15 text-star-200 ring-star-400/60"
          : "bg-fg/[0.04] text-muted ring-line hover:bg-fg/[0.08] hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
