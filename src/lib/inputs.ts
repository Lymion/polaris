/** Parses a typed amount like "1,250.50" or "RM 30". Returns NaN when there's no number. */
export function parseAmount(raw: string) {
  const cleaned = raw.replace(/[^\d.]/g, "");
  return cleaned ? Number(cleaned) : NaN;
}

/** Today's local date as "YYYY-MM-DD" (what <input type="date"> uses). */
export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const fieldClass =
  "w-full rounded-xl bg-fg/[0.05] px-3.5 py-2.5 text-sm text-ink ring-1 ring-line placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-star-400/70";
