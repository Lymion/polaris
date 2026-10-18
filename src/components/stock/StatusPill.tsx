import clsx from "clsx";
import { STATUS_LABEL, type StockStatus } from "@/lib/inventory";

const STATUS_STYLE: Record<StockStatus, string> = {
  out: "bg-alert/15 text-alert ring-alert/30",
  low: "bg-caution/15 text-caution ring-caution/30",
  ok: "bg-growth/15 text-growth ring-growth/30",
  slow: "bg-fg/[0.06] text-muted ring-line",
  untracked: "bg-transparent text-faint ring-line",
};

/** How a product's stock is doing, as a small labelled pill. */
export function StatusPill({ status }: { status: StockStatus }) {
  return (
    <span className={clsx("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1", STATUS_STYLE[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}
