"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2, X } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { notify } from "@/components/ui/toast";
import { usePolaris } from "@/lib/store";
import type { StudioItem, StudioTool } from "@/lib/studio";
import { useStudioContext } from "../kit";
import { OutputView } from "../views";
import { STATION_ICONS, WorkspaceFrame, type LumiLine, type StationNav } from "../Workspace";

const KINDS: Record<StudioTool, { label: string; plural: string; spine: string; text: string }> = {
  brand: { label: "Brand kit", plural: "Brand kits", spine: "#F5B942", text: "#0B1B3F" },
  campaign: { label: "Campaign", plural: "Campaigns", spine: "#EC4899", text: "#FFFFFF" },
  video: { label: "Video idea", plural: "Videos", spine: "#3B6FE0", text: "#FFFFFF" },
  calendar: { label: "Week plan", plural: "Week plans", spine: "#22C55E", text: "#0B1B3F" },
};

/** Stable little variety in book height, from the item id. */
const bookHeight = (id: string) => 150 + ([...id].reduce((a, c) => a + c.charCodeAt(0), 0) % 4) * 12;

export function IdeaLibrary({ nav }: { nav: StationNav }) {
  const items = usePolaris((s) => s.studioItems);
  const removeStudioItem = usePolaris((s) => s.removeStudioItem);
  const [filter, setFilter] = useState<StudioTool | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const bookRef = useRef<HTMLDivElement>(null);

  const shown = filter === "all" ? items : items.filter((i) => i.output.tool === filter);
  const open = items.find((i) => i.id === openId) ?? null;

  useEffect(() => {
    if (open) bookRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [open]);

  useStudioContext(
    open
      ? `At the Idea library, reading a saved ${KINDS[open.output.tool].label.toLowerCase()}: "${open.title}".`
      : `At the Idea library. Saved: ${items.length ? items.map((i) => `${KINDS[i.output.tool].label} "${i.title}"`).join("; ") : "nothing yet"}.`,
  );

  const lumi: LumiLine =
    items.length === 0
      ? { mood: "idle", text: "Nothing on the shelves yet. Save ideas at any station and they'll land here." }
      : open
        ? { mood: "happy", text: "Good pick! Want to build on it? Tap me and ask." }
        : { mood: "idle", text: `${items.length} idea${items.length === 1 ? "" : "s"} on the shelves. Pick a book to open it.` };

  function choose(item: StudioItem) {
    setOpenId((id) => (id === item.id ? null : item.id));
  }

  // One tap takes it off the shelf; Undo puts it back where it stood.
  function remove(item: StudioItem) {
    const index = items.findIndex((i) => i.id === item.id);
    removeStudioItem(item.id);
    setOpenId(null);
    notify({
      title: "Removed from your library",
      description: item.title,
      tone: "removed",
      action: { label: "Undo", onClick: () => usePolaris.setState((s) => ({ studioItems: s.studioItems.toSpliced(index, 0, item) })) },
    });
  }

  const counts = (Object.keys(KINDS) as StudioTool[]).map((k) => ({ k, n: items.filter((i) => i.output.tool === k).length }));

  return (
    <WorkspaceFrame station="library" lumi={lumi} nav={nav}>
      {items.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Show">
          <Chip selected={filter === "all"} onClick={() => setFilter("all")}>
            All ({items.length})
          </Chip>
          {counts
            .filter((c) => c.n > 0)
            .map(({ k, n }) => (
              <Chip key={k} selected={filter === k} onClick={() => setFilter(k)}>
                <span className="mr-1.5 inline-block size-2.5 rounded-full align-middle" style={{ backgroundColor: KINDS[k].spine }} aria-hidden />
                {KINDS[k].plural} ({n})
              </Chip>
            ))}
        </div>
      )}

      {/* The bookcase: each shelf row is 216px; the planks are painted by the background. */}
      <div
        className="scope-dark rounded-2xl border-x-[14px] border-t-[14px] border-[#5B3F28] bg-[#2A1D12] px-3 shadow-[0_40px_60px_-30px_rgb(0_0_0/0.9)] sm:px-5"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, transparent 0 200px, #8A6A4A 200px 210px, #5B3F28 210px 216px), linear-gradient(90deg, rgb(0 0 0 / 0.25), transparent 12%, transparent 88%, rgb(0 0 0 / 0.25))",
        }}
      >
        {items.length === 0 ? (
          <div className="flex h-[216px] items-end gap-4 pb-4">
            <div className="flex h-[200px] items-end gap-6" aria-hidden>
              <div className="h-10 w-10 rounded-b-lg bg-[#C2410C]">
                <div className="-mt-10 ml-1 h-12 w-8 rounded-full bg-[#15803D]" />
              </div>
              <div className="h-24 w-16 rounded-t-full bg-star-400/80" />
            </div>
            <p className="mb-6 max-w-xs text-sm text-orbit-200/80">No saved ideas yet. Your saves from the other stations will line up here.</p>
          </div>
        ) : (
          <ul className="flex flex-wrap">
            {shown.map((item) => {
              const kind = KINDS[item.output.tool];
              const Icon = STATION_ICONS[item.output.tool];
              return (
                <li key={item.id} className="flex h-[216px] items-end px-0.5 pb-4">
                  <button
                    type="button"
                    onClick={() => choose(item)}
                    aria-pressed={openId === item.id}
                    aria-label={`${kind.label}: ${item.title}`}
                    title={item.title}
                    className="studio-book relative flex w-11 items-center justify-between overflow-hidden rounded-t-md rounded-b-sm px-2 py-3 text-left shadow-[inset_-6px_0_0_rgb(0_0_0/0.18),inset_3px_0_0_rgb(255_255_255/0.25)] sm:w-12"
                    style={{ height: bookHeight(item.id), backgroundColor: kind.spine, color: kind.text }}
                  >
                    <span className="min-h-0 flex-1 truncate text-[13px] font-bold" title={item.title}>
                      {item.title}
                    </span>
                    <Icon className="mt-2 size-4 shrink-0 rotate-90 opacity-80" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {open && (
        <div ref={bookRef} className="panel studio-enter mt-10 scroll-mt-24 p-5 sm:p-7">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow" style={{ color: KINDS[open.output.tool].spine }}>
                {KINDS[open.output.tool].label}
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight">{open.title}</h2>
              <p className="mt-1 text-xs text-faint">
                Saved {new Date(open.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => remove(open)}
                className="tap-target relative inline-flex items-center gap-1.5 rounded-full bg-fg/[0.06] px-3 py-1.5 text-xs font-semibold text-muted transition-[transform,background-color,color] duration-150 ease-out hover:bg-fg/[0.12] hover:text-ink active:scale-[0.97]"
              >
                <Trash2 className="size-3.5" aria-hidden /> Remove
              </button>
              <button
                type="button"
                onClick={() => setOpenId(null)}
                aria-label="Close"
                className="grid size-8 place-items-center rounded-full bg-fg/[0.06] text-muted hover:bg-fg/[0.12] hover:text-ink"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          </div>
          <OutputView output={open.output} />
        </div>
      )}
    </WorkspaceFrame>
  );
}
