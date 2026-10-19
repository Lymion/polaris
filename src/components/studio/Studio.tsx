"use client";

import { useEffect, useState, type AnimationEvent, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { MessageCircle, Palette } from "lucide-react";
import { Tooltip } from "@/components/ui/Hint";
import { PageHeader } from "@/components/ui/PageHeader";
import { mascotName, useHydrated, usePolaris, useProfessional, useWorld } from "@/lib/store";
import { STATIONS, type StationId } from "@/lib/studio";
import { BrandDesk } from "./stations/BrandDesk";
import { CampaignBoard } from "./stations/CampaignBoard";
import { ContentCalendar } from "./stations/ContentCalendar";
import { IdeaLibrary } from "./stations/IdeaLibrary";
import { VideoBooth } from "./stations/VideoBooth";
import { StudioRoom, VIEWBOX, stationCenter } from "./StudioRoom";
import { STATION_ICONS, type StationNav } from "./Workspace";

const WORKSPACES: Record<StationId, ComponentType<{ nav: StationNav }>> = {
  brand: BrandDesk,
  campaign: CampaignBoard,
  video: VideoBooth,
  calendar: ContentCalendar,
  library: IdeaLibrary,
};

/** What Lumi says in the room while you point at each station. */
const INTROS: Record<StationId, string> = {
  brand: "The brand desk! Names, slogans, colours, your voice and your story.",
  campaign: "The campaign board. We'll plan a promo: the hook, the offer and who does what, when.",
  video: "The video booth. I'll storyboard short videos you can film with your phone.",
  calendar: "The content calendar. A whole week of posts, planned and captioned.",
  library: "The idea library. Everything you save lives on these shelves.",
};

type Scene =
  | { kind: "room" }
  | { kind: "entering"; id: StationId }
  | { kind: "station"; id: StationId }
  | { kind: "leaving"; id: StationId };

const isStation = (v: string): v is StationId => STATIONS.some((s) => s.id === v);

function stationInUrl() {
  const hash = window.location.hash.slice(1);
  return isStation(hash) ? hash : null;
}

/** Where a zoom ends: at the station, or back in the room. */
function arrive(s: Scene): Scene {
  if (s.kind === "entering") return { kind: "station", id: s.id };
  return s.kind === "leaving" ? { kind: "room" } : s;
}

/** Creative Studio: the room, and the workspace of whichever station you walk up to. */
export function Studio() {
  const hydrated = useHydrated();
  const setMascotOnStage = usePolaris((s) => s.setMascotOnStage);
  // Only read on the client: until hydration the skeleton below renders either way.
  const [scene, setScene] = useState<Scene>(() => {
    const id = typeof window === "undefined" ? null : stationInUrl();
    return id ? { kind: "station", id } : { kind: "room" };
  });

  // Lumi is in the room with you here, so the corner button steps aside.
  useEffect(() => {
    setMascotOnStage(true);
    return () => setMascotOnStage(false);
  }, [setMascotOnStage]);

  // Each station has its own address (#video), so the browser's back button walks you out.
  useEffect(() => {
    const onPop = () => {
      const id = stationInUrl();
      setScene((s) => (id ? { kind: "station", id } : s.kind === "station" ? { kind: "leaving", id: s.id } : { kind: "room" }));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Backup for the zoom's animationend (e.g. the tab was hidden mid-animation).
  const zooming = scene.kind === "entering" || scene.kind === "leaving";
  useEffect(() => {
    if (!zooming) return;
    const t = setTimeout(() => setScene(arrive), 1200);
    return () => clearTimeout(t);
  }, [zooming]);

  // A station opens from its top, wherever you were on the room page.
  useEffect(() => {
    if (scene.kind === "station") window.scrollTo({ top: 0 });
  }, [scene.kind]);

  function enter(id: StationId) {
    if (scene.kind !== "room") return;
    window.history.pushState({ studio: id }, "", `#${id}`);
    setScene({ kind: "entering", id });
  }

  const nav: StationNav = {
    onBack() {
      if (scene.kind !== "station") return;
      // Pop our own history entry; for a deep link there's none, so just clear the hash.
      if (window.history.state?.studio) window.history.back();
      else {
        window.history.replaceState(null, "", window.location.pathname);
        setScene({ kind: "leaving", id: scene.id });
      }
    },
    onSwitch(id) {
      window.history.replaceState(window.history.state?.studio ? { studio: id } : null, "", `#${id}`);
      setScene({ kind: "station", id });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  };

  if (!hydrated) return <div className="mx-auto aspect-[840/790] w-full max-w-4xl animate-pulse rounded-3xl bg-fg/[0.04]" />;

  if (scene.kind === "station") {
    const Workspace = WORKSPACES[scene.id];
    return <Workspace key={scene.id} nav={nav} />;
  }

  return <Room scene={scene} onEnter={enter} onZoomEnd={() => setScene(arrive)} />;
}

function Room({ scene, onEnter, onZoomEnd }: { scene: Scene; onEnter: (id: StationId) => void; onZoomEnd: () => void }) {
  const router = useRouter();
  const profile = usePolaris((s) => s.profile);
  const saved = usePolaris((s) => s.studioItems.length);
  const openMascot = usePolaris((s) => s.openMascot);
  const world = useWorld();
  const professional = useProfessional();
  const [hovered, setHovered] = useState<StationId | null>(null);
  const name = mascotName(profile);

  const zoomId = scene.kind === "entering" || scene.kind === "leaving" ? scene.id : null;
  const origin = zoomId ? stationCenter(zoomId) : null;

  const line =
    scene.kind === "entering"
      ? "Let's go!"
      : hovered
        ? INTROS[hovered] + (hovered === "library" && saved ? ` You've saved ${saved} so far.` : "")
        : `Welcome to your studio${profile.ownerName ? `, ${profile.ownerName}` : ""}! Walk up to any station and we'll make something together.`;

  // Only the zoom's own animation ends the transition, not Lumi's gestures bubbling up.
  const onAnimationEnd = (e: AnimationEvent) => e.target === e.currentTarget && onZoomEnd();

  return (
    <div>
      {professional ? (
        // Workspace theme: no illustrated room, just the tools.
        <PageHeader
          icon={Palette}
          eyebrow="Creative Studio"
          title="Creative tools"
          description="Brand pieces, campaign plans, short-video storyboards and a week of posts, written for your business."
        />
      ) : (
        <h1 className="sr-only">Creative Studio</h1>
      )}
      <div className={clsx("overflow-clip", professional && "hidden")}>
        {/* Sized so the whole room fits on screen; the zoom scales from the chosen station. */}
        <div
          className={clsx("relative mx-auto", scene.kind === "entering" && "studio-zoom-in", scene.kind === "leaving" && "studio-zoom-back")}
          style={{
            width: "min(100%, max(560px, calc((100dvh - 150px) * 840 / 790)))",
            transformOrigin: origin
              ? `${(((origin[0] - VIEWBOX.x) / VIEWBOX.w) * 100).toFixed(1)}% ${(((origin[1] - VIEWBOX.y) / VIEWBOX.h) * 100).toFixed(1)}%`
              : undefined,
          }}
          onAnimationEnd={onAnimationEnd}
        >
          <StudioRoom
            onOpen={onEnter}
            zooming={scene.kind === "entering" ? scene.id : null}
            hovered={hovered}
            onHover={setHovered}
            onLeave={world ? () => router.push("/") : undefined}
          />

          {/* Lumi's narration, in the empty corner in front of the room */}
          <div className="mt-3 rounded-2xl bg-surface-900/85 p-3.5 shadow-xl ring-1 ring-line sm:absolute sm:bottom-[3%] sm:left-0 sm:mt-0 sm:w-[34%]">
            <p className="text-xs font-bold text-star-300">{name}</p>
            <p aria-live="polite" className="mt-1 min-h-[3lh] text-[13px] leading-snug lg:text-sm">
              {line}
            </p>
            <button
              type="button"
              onClick={() => openMascot()}
              className="tap-target relative mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-fg/[0.08] px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-fg/[0.14]"
            >
              <MessageCircle className="size-3.5" aria-hidden /> Ask {name} anything
            </button>
          </div>
        </div>
      </div>

      {/* Five across only from xl, with the icon above the text; at lg the sidebar leaves each card too narrow. */}
      <nav
        aria-label="Studio stations"
        className={clsx(
          "mt-6 grid gap-3 transition-opacity duration-300 sm:grid-cols-2 sm:*:last:odd:col-span-2 xl:grid-cols-5 xl:*:last:odd:col-span-1",
          scene.kind === "entering" && "opacity-0",
        )}
      >
        {STATIONS.map((s) => {
          const Icon = STATION_ICONS[s.id];
          const active = hovered === s.id;
          // The name says where it goes; what's made there shows on hover, and Lumi says it too.
          return (
            <Tooltip key={s.id} content={s.blurb}>
              <button
                type="button"
                onClick={() => onEnter(s.id)}
                onPointerEnter={() => setHovered(s.id)}
                onPointerLeave={() => setHovered((h) => (h === s.id ? null : h))}
                className={clsx(
                  "panel flex items-center gap-3 p-4 text-left transition-[transform,background-color] duration-150 ease-out active:scale-[0.98] xl:flex-col xl:items-start xl:gap-2.5",
                  active ? "bg-star-400/10 ring-1 ring-star-400/50" : "hover:bg-fg/[0.06]",
                )}
              >
                <span className={clsx("grid size-9 shrink-0 place-items-center rounded-xl transition-colors", active ? "bg-star-400 text-on-accent" : "bg-fg/[0.06] text-star-300")}>
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <span className="min-w-0 text-sm font-semibold">
                  {s.name}
                  {s.id === "library" && saved > 0 && <span className="ml-1.5 font-normal text-faint">({saved})</span>}
                </span>
              </button>
            </Tooltip>
          );
        })}
      </nav>
    </div>
  );
}
