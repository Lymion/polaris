"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { STATIONS, type StationId } from "@/lib/studio";
import { ROOM, box, iso, onFloor, onLeftWall, onRightWall, pts, wallText } from "./iso";

const H = ROOM.height;

/** Where Lumi stands (room x, y) next to each station. */
const SPOTS: Record<StationId | "idle", [number, number]> = {
  // Clear of the video camera, which stands just in front of the rug's right side.
  idle: [3.6, 4.6],
  brand: [3.3, 7.0],
  campaign: [2.6, 1.6],
  calendar: [1.6, 2.8],
  // In front of the shelf, clear of the video booth's ring light (any further left, Lumi stands behind it).
  library: [8.0, 1.6],
  video: [5.7, 6.5],
};

/** Screen anchor for each station's floating label (room x, y, z). */
const LABELS: Record<StationId, [number, number, number]> = {
  brand: [1.3, 7.2, 3.9],
  campaign: [2.6, 0, 5.0],
  calendar: [0, 2.7, 5.0],
  library: [8.8, 0.4, 4.85],
  video: [8.9, 5.3, 4.6],
};

/** Station centre in viewBox units, used as the zoom origin. */
export function stationCenter(id: StationId) {
  const [x, y, z] = LABELS[id];
  return iso(x, y, Math.max(0, z - 2));
}

export const VIEWBOX = { x: 80, y: 0, w: 840, h: 790 };

export function StudioRoom({
  onOpen,
  zooming,
  hovered,
  onHover,
  onLeave,
}: {
  onOpen: (id: StationId) => void;
  zooming: StationId | null;
  hovered: StationId | null;
  onHover: (id: StationId | null) => void;
  /** In the interactive world, a door on the left wall leads back to your desk. */
  onLeave?: () => void;
}) {
  const tiltRef = useRef<HTMLDivElement>(null);
  const [doorHover, setDoorHover] = useState(false);
  const spot = SPOTS[zooming ?? hovered ?? "idle"];
  const [lx, ly] = iso(spot[0], spot[1], 0);

  // The whole room tilts gently toward the pointer, like a diorama. Written straight to the
  // element's transform in an animation frame: no React re-render per mouse move.
  useEffect(() => {
    const el = tiltRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let raf = 0;
    const tick = () => {
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      el.style.transform = `perspective(1600px) rotateX(${(-current.y * 4).toFixed(2)}deg) rotateY(${(current.x * 6).toFixed(2)}deg)`;
      if (Math.abs(target.x - current.x) > 0.001 || Math.abs(target.y - current.y) > 0.001) raf = requestAnimationFrame(tick);
      else raf = 0;
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      target = { x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 };
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onLeave = () => {
      target = { x: 0, y: 0 };
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const host = el.parentElement!;
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  const station = (id: StationId, children: ReactNode) => {
    const meta = STATIONS.find((s) => s.id === id)!;
    return (
      <g
        className="studio-station"
        data-active={hovered === id || zooming === id}
        role="button"
        tabIndex={0}
        aria-label={`${meta.name}: ${meta.blurb}`}
        onClick={() => onOpen(id)}
        onKeyDown={(e: KeyboardEvent) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen(id))}
        onPointerEnter={() => onHover(id)}
        onPointerLeave={() => hovered === id && onHover(null)}
        onFocus={() => onHover(id)}
        onBlur={() => hovered === id && onHover(null)}
      >
        {children}
      </g>
    );
  };

  return (
    <div className="studio-room relative w-full">
      <div ref={tiltRef} className="will-change-transform" style={{ transformStyle: "preserve-3d" }}>
        <svg viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.w} ${VIEWBOX.h}`} className="h-auto w-full" role="group" aria-label="Your creative studio">
          <defs>
            {/* Walls, floor and sky follow the theme's room colours (globals.css --room-*). */}
            <linearGradient id="st-wall-l" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" style={{ stopColor: "var(--room-wall-l-a)" }} />
              <stop offset="1" style={{ stopColor: "var(--room-wall-l-b)" }} />
            </linearGradient>
            <linearGradient id="st-wall-r" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" style={{ stopColor: "var(--room-wall-r-a)" }} />
              <stop offset="1" style={{ stopColor: "var(--room-wall-r-b)" }} />
            </linearGradient>
            <linearGradient id="st-floor" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0" style={{ stopColor: "var(--room-floor-a)" }} />
              <stop offset="1" style={{ stopColor: "var(--room-floor-b)" }} />
            </linearGradient>
            <linearGradient id="st-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: "var(--room-sky-a)" }} />
              <stop offset="1" style={{ stopColor: "var(--room-sky-b)" }} />
            </linearGradient>
            <radialGradient id="st-glow">
              <stop offset="0" stopColor="#F5B942" stopOpacity="0.55" />
              <stop offset="1" stopColor="#F5B942" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="st-lamp">
              <stop offset="0" stopColor="#FFF3C4" stopOpacity="0.35" />
              <stop offset="1" stopColor="#FFF3C4" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* In the world, the room stands on the building's floor, which runs on past the edges. */}
          {onLeave && (
            <g aria-hidden>
              <polygon points={pts([-4, -4, -0.45], [14, -4, -0.45], [14, 14, -0.45], [-4, 14, -0.45])} style={{ fill: "var(--room-floor-b)" }} />
              {Array.from({ length: 9 }, (_, i) => -4 + i * 2.25).map((t) => {
                const [a, b, c, d] = [iso(t, -4, -0.45), iso(t, 14, -0.45), iso(-4, t, -0.45), iso(14, t, -0.45)];
                return (
                  <g key={t} stroke="#fff" strokeOpacity="0.04">
                    <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
                    <line x1={c[0]} y1={c[1]} x2={d[0]} y2={d[1]} />
                  </g>
                );
              })}
              <ellipse cx={iso(5, 5, -0.45)[0]} cy={iso(5, 5, -0.45)[1] + 6} rx="420" ry="190" fill="#000" fillOpacity="0.18" />
            </g>
          )}

          {/* Room shell */}
          <polygon points={pts([0, 0, 0], [0, 10, 0], [0, 10, H], [0, 0, H])} fill="url(#st-wall-l)" />
          <polygon points={pts([0, 0, 0], [10, 0, 0], [10, 0, H], [0, 0, H])} fill="url(#st-wall-r)" />
          <polygon points={pts([0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0])} fill="url(#st-floor)" />
          {/* The floor has thickness, so the room stands on something instead of floating. */}
          <polygon points={pts([0, 10, 0], [10, 10, 0], [10, 10, -0.45], [0, 10, -0.45])} style={{ fill: "var(--room-base-l)" }} />
          <polygon points={pts([10, 10, 0], [10, 0, 0], [10, 0, -0.45], [10, 10, -0.45])} style={{ fill: "var(--room-base-r)" }} />
          <polyline points={pts([0, 10, 0], [10, 10, 0], [10, 0, 0])} fill="none" stroke="#fff" strokeOpacity="0.12" strokeWidth="1.5" />
          {Array.from({ length: 12 }, (_, i) => (i + 1) * 0.8).map((j) => {
            const [a, b] = [iso(0, j, 0), iso(10, j, 0)];
            return <line key={j} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#fff" strokeOpacity="0.035" />;
          })}
          <polygon points={onLeftWall(0, 10, 0, 0.22, 0.01)} style={{ fill: "var(--room-base-l)" }} />
          <polygon points={onRightWall(0, 10, 0, 0.22, 0.01)} style={{ fill: "var(--room-base-r)" }} />
          <polyline points={pts([0, 10, H], [0, 0, H], [10, 0, H])} fill="none" style={{ stroke: "var(--room-trim)" }} strokeOpacity="0.5" strokeWidth="2" />
          <line x1={iso(0, 0, 0)[0]} y1={iso(0, 0, 0)[1]} x2={iso(0, 0, H)[0]} y2={iso(0, 0, H)[1]} stroke="#000" strokeOpacity="0.25" strokeWidth="2" />

          {/* Window with the night sky */}
          <polygon points={onRightWall(5.0, 7.6, 2.0, 4.6)} fill="url(#st-sky)" />
          {[
            [5.4, 4.2, 1.6],
            [6.0, 3.6, 1.1],
            [6.9, 4.3, 1.4],
            [7.2, 3.2, 1],
            [5.7, 2.6, 1.2],
          ].map(([x, z, r]) => {
            const [cx, cy] = iso(x, 0, z);
            return <circle key={`${x}-${z}`} cx={cx} cy={cy} r={r} fill="#fff" className="m-twinkle" />;
          })}
          <circle cx={iso(6.9, 0, 3.7)[0]} cy={iso(6.9, 0, 3.7)[1]} r="11" fill="#FFE9A8" />
          {/* Cut out of the moon to make a crescent; daytime themes hide it, leaving the sun. */}
          <circle cx={iso(6.75, 0, 3.78)[0]} cy={iso(6.75, 0, 3.78)[1]} r="10" className="room-moon-cut" />
          <polygon points={onRightWall(5.0, 7.6, 2.0, 4.6)} fill="none" stroke="#C7D2FE" strokeOpacity="0.55" strokeWidth="5" />
          <line x1={iso(6.3, 0, 2)[0]} y1={iso(6.3, 0, 2)[1]} x2={iso(6.3, 0, 4.6)[0]} y2={iso(6.3, 0, 4.6)[1]} stroke="#C7D2FE" strokeOpacity="0.55" strokeWidth="3" />
          <line x1={iso(5, 0, 3.3)[0]} y1={iso(5, 0, 3.3)[1]} x2={iso(7.6, 0, 3.3)[0]} y2={iso(7.6, 0, 3.3)[1]} stroke="#C7D2FE" strokeOpacity="0.55" strokeWidth="3" />
          <Box b={box(4.9, 0, 1.82, 2.8, 0.3, 0.14)} top="#DCE3FF" left="#A9B6E8" right="#8E9CD6" />

          {/* Neon sign */}
          <g transform={wallText("left", 0.02, 9.75, 4.05)}>
            <text fontSize="32" style={{ fontFamily: "var(--font-brand)", stroke: "var(--room-neon-glow)" }} fill="none" strokeOpacity="0.35" strokeWidth="7">
              Creative Studio
            </text>
            <text fontSize="32" style={{ fontFamily: "var(--font-brand)", fill: "var(--room-neon)" }}>
              Creative Studio
            </text>
          </g>

          {/* The door back to your desk (interactive world only) */}
          {onLeave && (
            <g
              className="studio-station"
              data-active={doorHover}
              role="button"
              tabIndex={0}
              aria-label="Door back to your desk"
              onClick={onLeave}
              onKeyDown={(e: KeyboardEvent) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onLeave())}
              onPointerEnter={() => setDoorHover(true)}
              onPointerLeave={() => setDoorHover(false)}
            >
              <polygon className="station-ring" points={onLeftWall(8.82, 9.98, 0, 2.78, 0.01)} fill="none" stroke="#F5B942" strokeWidth="4" />
              <polygon points={onLeftWall(8.9, 9.9, 0, 2.7, 0.015)} style={{ fill: "var(--room-wood)" }} />
              <polygon points={onLeftWall(9.0, 9.8, 0.02, 2.6, 0.02)} style={{ fill: "var(--room-wood-light)" }} />
              <polygon points={onLeftWall(9.08, 9.72, 1.5, 2.45, 0.025)} fill="#000" fillOpacity="0.15" />
              <circle cx={iso(0.03, 9.12, 1.25)[0]} cy={iso(0.03, 9.12, 1.25)[1]} r="3.5" fill="#FFD27A" />
              {(() => {
                const [x, y] = iso(0, 9.4, 3.15);
                return (
                  <g transform={`translate(${x - 44} ${y - 13})`} className="pointer-events-none">
                    <rect width="88" height="26" rx="13" fill={doorHover ? "#F5B942" : "#0B1B3F"} stroke="#3B6FE0" strokeOpacity="0.7" />
                    <text x="44" y="17.5" textAnchor="middle" fontSize="12" fontWeight="600" fill={doorHover ? "#0B1B3F" : "#EEF2FF"} style={{ fontFamily: "var(--font-jakarta)" }}>
                      ← Your desk
                    </text>
                  </g>
                );
              })()}
            </g>
          )}

          {/* Corner plant */}
          <Box b={box(0.25, 0.25, 0, 0.6, 0.6, 0.7)} top="#C2410C" left="#9A3412" right="#7C2D12" />
          {[
            [0.55, 0.55, 1.5, 16, 34, -20],
            [0.4, 0.7, 1.3, 14, 30, 25],
            [0.7, 0.4, 1.35, 13, 28, -50],
            [0.55, 0.55, 1.9, 12, 26, 5],
          ].map(([x, y, z, rx, ry, rot]) => {
            const [cx, cy] = iso(x, y, z);
            return <ellipse key={`${rot}`} cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${rot} ${cx} ${cy})`} fill="#15803D" stroke="#166534" />;
          })}

          {/* Rug where Lumi waits */}
          <polygon points={onFloor(2.6, 2.8, 5.6, 5.8)} style={{ fill: "var(--room-rug)" }} fillOpacity="0.35" />
          <polygon points={onFloor(2.8, 3.0, 5.4, 5.6)} fill="none" stroke="#F5B942" strokeOpacity="0.45" strokeWidth="2" />

          {/* Campaign board: corkboard with pinned cards and string */}
          {station(
            "campaign",
            <>
              <polygon className="station-ring" points={onRightWall(0.8, 4.4, 1.7, 4.6, 0.01)} fill="none" stroke="#F5B942" strokeWidth="4" />
              <polygon points={onRightWall(0.9, 4.3, 1.8, 4.5)} fill="#6B4A2C" />
              <polygon points={onRightWall(1.0, 4.2, 1.9, 4.4)} fill="#B98552" />
              {(
                [
                  [1.25, 3.55, "#FFF3C4"],
                  [2.25, 3.65, "#C7E0FF"],
                  [3.25, 3.5, "#FFD1DC"],
                  [1.5, 2.3, "#D1FAE5"],
                  [2.65, 2.45, "#FFF3C4"],
                  [3.5, 2.2, "#C7E0FF"],
                ] as const
              ).map(([x, z, c]) => (
                <g key={`${x}-${z}`}>
                  <polygon points={onRightWall(x, x + 0.7, z, z + 0.55, 0.02)} fill={c} />
                  {[0.38, 0.26, 0.14].map((dz, k) => {
                    const [a, b] = [iso(x + 0.1, 0.02, z + dz), iso(x + (k === 2 ? 0.4 : 0.58), 0.02, z + dz)];
                    return <line key={dz} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#0B1B3F" strokeOpacity="0.35" strokeWidth="1.5" />;
                  })}
                </g>
              ))}
              <polyline
                points={pts([1.6, 0.03, 4.05], [2.6, 0.03, 4.15], [3.0, 0.03, 2.95], [3.85, 0.03, 2.7])}
                fill="none"
                stroke="#EF4444"
                strokeWidth="1.5"
              />
              <polyline points={pts([1.6, 0.03, 4.05], [1.85, 0.03, 2.8])} fill="none" stroke="#EF4444" strokeWidth="1.5" />
              {[
                [1.6, 4.05],
                [2.6, 4.15],
                [3.6, 4.0],
                [1.85, 2.8],
                [3.0, 2.95],
                [3.85, 2.7],
              ].map(([x, z]) => {
                const [cx, cy] = iso(x, 0.03, z);
                return <circle key={`${x}-${z}`} cx={cx} cy={cy} r="4" fill="#EF4444" stroke="#7F1D1D" />;
              })}
            </>,
          )}

          {/* Content calendar poster */}
          {station(
            "calendar",
            <>
              <polygon className="station-ring" points={onLeftWall(0.9, 4.5, 1.7, 4.6, 0.01)} fill="none" stroke="#F5B942" strokeWidth="4" />
              <polygon points={onLeftWall(1.0, 4.4, 1.8, 4.5, 0.02)} fill="#EEF2FF" />
              <polygon points={onLeftWall(1.0, 4.4, 4.0, 4.5, 0.03)} fill="#F5B942" />
              <g transform={wallText("left", 0.04, 4.15, 4.12)}>
                <text fontSize="15" fontWeight="700" fill="#0B1B3F" letterSpacing="2">
                  CONTENT PLAN
                </text>
              </g>
              {Array.from({ length: 6 }, (_, i) => 1.0 + (i + 1) * (3.4 / 7)).map((y) => {
                const [a, b] = [iso(0.03, y, 1.9), iso(0.03, y, 3.95)];
                return <line key={y} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#9FB6E0" strokeWidth="1" />;
              })}
              {[2.4, 2.9, 3.4].map((z) => {
                const [a, b] = [iso(0.03, 1.0, z), iso(0.03, 4.4, z)];
                return <line key={z} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#9FB6E0" strokeWidth="1" />;
              })}
              {(
                [
                  [0, 3, "#3B6FE0"],
                  [2, 2, "#EC4899"],
                  [4, 3, "#F5B942"],
                  [1, 1, "#22C55E"],
                  [5, 1, "#3B6FE0"],
                  [6, 2, "#EC4899"],
                  [3, 0, "#F5B942"],
                ] as const
              ).map(([col, row, c]) => {
                const w = 3.4 / 7;
                const y1 = 4.4 - col * w - 0.08;
                const z0 = 1.95 + row * 0.5;
                return <polygon key={`${col}-${row}`} points={onLeftWall(y1 - w + 0.16, y1, z0 + 0.1, z0 + 0.36, 0.04)} fill={c} />;
              })}
            </>,
          )}

          {/* Idea library: bookshelf */}
          {station(
            "library",
            <>
              <ellipse className="station-glow" cx={iso(8.8, 1.3, 0)[0]} cy={iso(8.8, 1.3, 0)[1]} rx="95" ry="34" fill="url(#st-glow)" />
              <Box b={box(7.9, 0.05, 0, 1.8, 0.85, 4.1)} top="#8A6A4A" left="#5B3F28" right="#4A321F" />
              {[0.15, 1.15, 2.15, 3.15].map((z, shelf) => (
                <g key={z}>
                  <Box b={box(7.95, 0.12, z - 0.07, 1.7, 0.78, 0.07)} top="#A07A55" left="#6B4A2C" right="#5B3F28" />
                  {Array.from({ length: 7 }, (_, k) => k).map((k) => {
                    const w = 0.18 + ((k + shelf) % 3) * 0.03;
                    const x = 8.02 + k * 0.235;
                    const h = 0.6 + ((k * 7 + shelf * 3) % 4) * 0.07;
                    const colors = ["#F5B942", "#3B6FE0", "#EC4899", "#22C55E", "#EEF2FF", "#A78BFA"];
                    const c = colors[(k + shelf * 2) % colors.length];
                    return <Box key={k} b={box(x, 0.25, z, w, 0.55, h)} top={c} left={shade(c, 0.78)} right={shade(c, 0.62)} />;
                  })}
                </g>
              ))}
              <Box b={box(8.3, 0.3, 4.1, 0.35, 0.35, 0.3)} top="#FDE68A" left="#F59E0B" right="#D97706" />
              <polygon points={pts([8.47, 0.47, 4.4], [8.47, 0.47, 4.9], [8.42, 0.47, 4.6])} fill="#F5B942" />
            </>,
          )}

          {/* Brand desk */}
          {station(
            "brand",
            <>
              <ellipse className="station-glow" cx={iso(1.6, 7.2, 0)[0]} cy={iso(1.6, 7.2, 0)[1]} rx="130" ry="46" fill="url(#st-glow)" />
              <Box b={box(0.25, 5.6, 0, 2.3, 3.2, 1.45)} top="#F3EFFF" left="#C9C0F2" right="#B3A7EA" />
              <line x1={iso(2.55, 5.75, 0.75)[0]} y1={iso(2.55, 5.75, 0.75)[1]} x2={iso(2.55, 8.65, 0.75)[0]} y2={iso(2.55, 8.65, 0.75)[1]} stroke="#8F80D6" strokeWidth="1.5" />
              {[6.6, 7.9].map((y) => {
                const [cx, cy] = iso(2.55, y, 1.05);
                return <rect key={y} x={cx - 10} y={cy - 2} width="20" height="4" rx="2" fill="#7C6CC9" transform={`rotate(30 ${cx} ${cy})`} />;
              })}
              <Box b={box(0.95, 6.95, 1.45, 0.2, 0.35, 0.55)} top="#374151" left="#1F2937" right="#111827" />
              <Box b={box(0.72, 5.95, 1.95, 0.14, 2.3, 1.4)} top="#374151" left="#1F2937" right="#0B1736" />
              {(["#F5B942", "#3B6FE0", "#EC4899", "#22C55E"] as const).map((c, k) => {
                const y = 6.15 + k * 0.5;
                return <polygon key={c} points={pts([0.87, y, 2.75], [0.87, y + 0.38, 2.75], [0.87, y + 0.38, 3.15], [0.87, y, 3.15])} fill={c} />;
              })}
              {[2.45, 2.25].map((z) => (
                <polyline key={z} points={pts([0.87, 6.15, z], [0.87, z === 2.45 ? 7.9 : 7.2, z])} fill="none" stroke="#9FB6E0" strokeOpacity="0.7" strokeWidth="2" />
              ))}
              <polygon points={onFloor(1.35, 6.3, 1.8, 7.7, 1.452)} fill="#E5E7EB" stroke="#9CA3AF" />
              <polygon points={onFloor(1.45, 7.95, 1.62, 8.15, 1.452)} fill="#E5E7EB" stroke="#9CA3AF" />
              {(["#EC4899", "#F5B942", "#3B6FE0"] as const).map((c, k) => (
                <polygon key={c} points={onFloor(1.95 + k * 0.08, 5.9 + k * 0.12, 2.4 + k * 0.08, 6.2 + k * 0.12, 1.453 + k * 0.002)} fill={c} stroke="#fff" strokeOpacity="0.6" />
              ))}
              <Box b={box(2.05, 7.5, 1.45, 0.22, 0.22, 0.28)} top="#FFFFFF" left="#E5E7EB" right="#CBD5E1" />
              <Box b={box(0.45, 8.25, 1.45, 0.4, 0.4, 0.35)} top="#C2410C" left="#9A3412" right="#7C2D12" />
              {[
                [0.65, 8.45, 2.1, 9, 18, -25],
                [0.55, 8.6, 2.0, 8, 16, 30],
                [0.75, 8.35, 2.05, 8, 15, -60],
              ].map(([x, y, z, rx, ry, rot]) => {
                const [cx, cy] = iso(x, y, z);
                return <ellipse key={`${rot}`} cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${rot} ${cx} ${cy})`} fill="#22C55E" stroke="#15803D" />;
              })}
            </>,
          )}

          {/* Lumi walks to the station you point at. Drawn before the video booth, the nearest thing
              to you, so its ring light and camera pass in front of Lumi on the way across. */}
          <g className="studio-lumi" style={{ transform: `translate(${lx - 55}px, ${ly - 104}px)` }}>
            <Mascot size={110} mood={zooming ? "happy" : hovered ? "talking" : "idle"} greet />
          </g>

          {/* Video booth: tripod camera, ring light and a little stage */}
          {station(
            "video",
            <>
              <ellipse className="station-glow" cx={iso(7.8, 6.0, 0)[0]} cy={iso(7.8, 6.0, 0)[1]} rx="150" ry="55" fill="url(#st-glow)" />
              <ellipse cx={iso(8.4, 7.0, 0.36)[0]} cy={iso(8.4, 7.0, 0.36)[1]} rx="70" ry="30" fill="url(#st-lamp)" />
              <Box b={box(7.6, 6.3, 0, 1.6, 1.6, 0.35)} top="#475569" left="#334155" right="#1E293B" />
              <Box b={box(8.15, 6.85, 0.35, 0.55, 0.55, 0.35)} top="#FBCFE8" left="#F9A8D4" right="#F472B6" />
              <Box b={box(8.15, 6.85, 0.7, 0.55, 0.55, 0.06)} top="#FFF7ED" left="#FED7AA" right="#FDBA74" />
              <circle cx={iso(8.42, 7.12, 0.82)[0]} cy={iso(8.42, 7.12, 0.82)[1]} r="5" fill="#DC2626" />
              {(
                [
                  [9.0, 4.7],
                  [9.6, 5.0],
                  [9.25, 5.45],
                ] as const
              ).map(([x, y]) => {
                const [a, b] = [iso(9.3, 5.05, 0.5), iso(x, y, 0)];
                return <line key={`${x}-${y}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#94A3B8" strokeWidth="2.5" />;
              })}
              <line x1={iso(9.3, 5.05, 0.5)[0]} y1={iso(9.3, 5.05, 0.5)[1]} x2={iso(9.3, 5.05, 2.75)[0]} y2={iso(9.3, 5.05, 2.75)[1]} stroke="#CBD5E1" strokeWidth="3" />
              <ellipse cx={iso(9.3, 5.05, 3.25)[0]} cy={iso(9.3, 5.05, 3.25)[1]} rx="24" ry="28" fill="none" stroke="#FEF3C7" strokeWidth="8" />
              <ellipse cx={iso(9.3, 5.05, 3.25)[0]} cy={iso(9.3, 5.05, 3.25)[1]} rx="31" ry="35" fill="none" stroke="#FEF3C7" strokeOpacity="0.25" strokeWidth="6" />
              {(
                [
                  [6.25, 5.25],
                  [6.95, 5.35],
                  [6.6, 6.05],
                ] as const
              ).map(([x, y]) => {
                const [a, b] = [iso(6.62, 5.62, 1.7), iso(x, y, 0)];
                return <line key={`${x}-${y}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#94A3B8" strokeWidth="2.5" />;
              })}
              <Box b={box(6.35, 5.35, 1.7, 0.55, 0.5, 0.42)} top="#4B5563" left="#1F2937" right="#111827" />
              <ellipse cx={iso(6.9, 5.6, 1.91)[0]} cy={iso(6.9, 5.6, 1.91)[1]} rx="8" ry="10" fill="#0F172A" stroke="#64748B" strokeWidth="2" />
              <circle cx={iso(6.5, 5.85, 2.02)[0]} cy={iso(6.5, 5.85, 2.02)[1]} r="3.5" fill="#EF4444" className="m-twinkle" />
            </>,
          )}

          {/* Floating labels */}
          {STATIONS.map((s) => {
            const [x, y] = iso(...LABELS[s.id]);
            const active = hovered === s.id;
            const w = s.name.length * 7.6 + 26;
            return (
              <g key={s.id} className="pointer-events-none" transform={`translate(${x - w / 2} ${y - 16})`} opacity={active ? 1 : 0.88}>
                <rect width={w} height="30" rx="15" fill={active ? "#F5B942" : "#0B1B3F"} stroke={active ? "#FFE2A6" : "#3B6FE0"} strokeOpacity="0.7" />
                <text x={w / 2} y="20" textAnchor="middle" fontSize="13.5" fontWeight="600" fill={active ? "#0B1B3F" : "#EEF2FF"} style={{ fontFamily: "var(--font-jakarta)" }}>
                  {s.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function Box({ b, top, left, right }: { b: ReturnType<typeof box>; top: string; left: string; right: string }) {
  return (
    <>
      <polygon points={b.left} fill={left} />
      <polygon points={b.right} fill={right} />
      <polygon points={b.top} fill={top} />
    </>
  );
}

/** Darkens a hex colour by `factor` (0 to 1) for the shaded sides of a box. */
function shade(hex: string, factor: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.round(v * factor).toString(16).padStart(2, "0");
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`;
}
