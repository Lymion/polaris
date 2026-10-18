import type { Foundation, MissionCategory } from "./types";

export const CATEGORY_LABELS: Record<MissionCategory, string> = {
  legal: "Legal & admin",
  operations: "Operations",
  finance: "Finance",
  sales: "Sales",
  marketing: "Marketing",
  branding: "Branding",
};

export const CATEGORY_STYLES: Record<MissionCategory, string> = {
  legal: "bg-sky-400/15 text-sky-300",
  operations: "bg-fg/10 text-muted",
  finance: "bg-star-400/15 text-star-300",
  sales: "bg-growth/15 text-growth",
  marketing: "bg-orbit-400/15 text-orbit-300",
  branding: "bg-fuchsia-400/15 text-fuchsia-300",
};

export const INCOME_CATEGORIES = ["Sales", "Wholesale / B2B", "Services", "Other income"];

export const EXPENSE_CATEGORIES = [
  "Ingredients / stock",
  "Packaging",
  "Rent",
  "Utilities",
  "Staff",
  "Marketing",
  "Platform fees",
  "Equipment",
  "Transport",
  "Other",
];

export const OVERHEAD_PRESETS = [
  "Rent",
  "Electricity & water",
  "Internet & phone",
  "Staff salaries",
  "Software & subscriptions",
  "Insurance",
  "Loan repayment",
];

/**
 * Chart series colours, validated with the dataviz palette checker against the card surface
 * (#0C193B, dark mode): inside the lightness band, ΔE ≥ 28 under colour-blind simulation.
 */
export const CHART_COLORS = { income: "#C08418", expense: "#4A7FE8" } as const;

export const FOUNDATIONS: { id: Foundation; label: string }[] = [
  { id: "registered", label: "Business registered" },
  { id: "licenses", label: "Licences or permits" },
  { id: "bank", label: "Business bank account" },
  { id: "bookkeeping", label: "Bookkeeping system" },
  { id: "suppliers", label: "Reliable suppliers" },
  { id: "pricing", label: "Prices worked out" },
  { id: "brand", label: "Logo and brand" },
  { id: "online", label: "Online presence" },
];
