import type { LucideIcon } from "lucide-react";

export interface PreviewFeature {
  icon: LucideIcon;
  title: string;
  text: string;
}

/** Temporary placeholder listing what a section will do, until the section is built. */
export function SectionPreview({ features }: { features: PreviewFeature[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {features.map((f) => (
        <div key={f.title} className="panel p-5">
          <f.icon className="size-6 text-star-300" aria-hidden />
          <h2 className="mt-3 font-semibold">{f.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">{f.text}</p>
        </div>
      ))}
    </div>
  );
}
