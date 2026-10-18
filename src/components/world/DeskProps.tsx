"use client";

import { useEffect, useId, useState } from "react";
import clsx from "clsx";

// The things around your desk in the interactive world. They're drawn for the desk scene's
// 1440 x 810 stage and coloured from the theme (the --world-* and --room-* variables).

/** Fairy lights strung across the top of the wall, hung from two nails. */
export function StringLights({ className }: { className?: string }) {
  // Each swag hangs between two points at y 8 and sags to about y 60.
  const swags: [number, number][] = [
    [-200, 420],
    [420, 1020],
    [1020, 1640],
  ];
  const glow = useId();
  return (
    <svg className={className} viewBox="-200 0 1840 100" width={1840} height={100} aria-hidden>
      <defs>
        <radialGradient id={glow}>
          <stop offset="0" stopColor="var(--world-bulb-a)" stopOpacity={0.55} />
          <stop offset="1" stopColor="var(--world-bulb-a)" stopOpacity={0} />
        </radialGradient>
      </defs>
      {swags.map(([a, b], s) => {
        const c = (a + b) / 2;
        const at = (t: number) => ({
          x: (1 - t) ** 2 * a + 2 * (1 - t) * t * c + t * t * b,
          y: (1 - t) ** 2 * 8 + 2 * (1 - t) * t * 110 + t * t * 8,
        });
        return (
          <g key={s}>
            <path d={`M${a} 8 Q${c} 110 ${b} 8`} fill="none" stroke="var(--world-wire)" strokeWidth={2} />
            {Array.from({ length: 9 }, (_, i) => {
              const { x, y } = at((i + 1) / 10);
              const fill = (i + s) % 2 ? "var(--world-bulb-b)" : "var(--world-bulb-a)";
              return (
                <g key={i} className="world-twinkle" style={{ animationDelay: `${((i * 7 + s * 3) % 10) * 0.37}s` }}>
                  <circle cx={x} cy={y + 12} r={18} fill={`url(#${glow})`} />
                  <rect x={x - 3} y={y} width={6} height={6} rx={1.5} fill="var(--world-wire)" />
                  <ellipse cx={x} cy={y + 12} rx={5.5} ry={7.5} fill={fill} />
                  <ellipse cx={x - 1.5} cy={y + 10} rx={2} ry={3} fill="#fff" opacity={0.7} />
                </g>
              );
            })}
            <circle cx={b} cy={8} r={3} fill="var(--world-wire)" />
          </g>
        );
      })}
    </svg>
  );
}

// Points of your constellation, from the first star to the North Star (level 10), inside the
// window. They stay in the top of the glass, which the computer doesn't cover.
const CONSTELLATION = [
  [36, 186],
  [80, 152],
  [122, 172],
  [166, 128],
  [208, 146],
  [252, 104],
  [300, 118],
  [340, 76],
  [378, 92],
  [424, 44],
] as const;

const SKY_STARS = [
  [20, 30], [58, 98], [104, 22], [140, 84], [196, 40], [226, 192], [270, 30], [318, 182],
  [360, 150], [402, 128], [446, 160], [452, 96], [30, 128], [180, 196], [290, 62], [236, 64],
] as const;

/**
 * The window behind the computer. Its sky follows the theme, and your constellation is in it: a
 * star lights up for every level, on the way to the North Star.
 */
export function SkyWindow({ className, level }: { className?: string; level: number }) {
  const halo = useId();
  const lit = CONSTELLATION.slice(0, level);
  const points = (list: readonly (readonly [number, number])[]) => list.map(([x, y]) => `${x},${y}`).join(" ");
  return (
    <div className={clsx("rounded-md p-[14px] shadow-[0_24px_40px_-24px_rgb(0_0_0/0.6)]", className)} style={{ background: "var(--world-window-frame)" }}>
      <div className="relative h-full w-full overflow-hidden rounded-[3px] shadow-[inset_0_4px_16px_rgb(0_0_0/0.35)]" style={{ background: "linear-gradient(var(--room-sky-a), var(--room-sky-b))" }}>
        <svg viewBox="0 0 472 348" className="absolute inset-0 h-full w-full" aria-hidden>
          <defs>
            <radialGradient id={halo}>
              <stop offset="0" stopColor="#fff6d6" stopOpacity={0.55} />
              <stop offset="1" stopColor="#fff6d6" stopOpacity={0} />
            </radialGradient>
          </defs>
          {/* moon by night, sun by day */}
          <circle cx={150} cy={58} r={60} fill={`url(#${halo})`} />
          <circle cx={150} cy={58} r={24} fill="var(--world-moon)" />
          {/* clouds, on the bright themes */}
          <g fill="#fff" style={{ opacity: "var(--world-clouds)" }}>
            <ellipse cx={70} cy={120} rx={46} ry={16} />
            <ellipse cx={96} cy={108} rx={28} ry={18} />
            <ellipse cx={330} cy={190} rx={52} ry={15} />
            <ellipse cx={356} cy={178} rx={30} ry={17} />
          </g>
          <g fill="var(--world-star)" style={{ opacity: "var(--world-stars)" }}>
            {SKY_STARS.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={i % 3 ? 1.2 : 1.8} className="world-twinkle" style={{ animationDelay: `${(i % 7) * 0.5}s` }} />
            ))}
          </g>
          {/* the whole path, faint; the part you've travelled, bright */}
          <polyline points={points(CONSTELLATION)} fill="none" stroke="var(--world-star)" strokeOpacity={0.35} strokeWidth={1.2} strokeDasharray="3 5" />
          {lit.length > 1 && <polyline points={points(lit)} fill="none" stroke="var(--world-star)" strokeOpacity={0.9} strokeWidth={1.6} />}
          {CONSTELLATION.slice(0, 9).map(([x, y], i) =>
            i < level ? (
              <g key={i}>
                <circle cx={x} cy={y} r={13} fill={`url(#${halo})`} />
                <circle cx={x} cy={y} r={3.6} fill="#fffbe8" />
              </g>
            ) : (
              <circle key={i} cx={x} cy={y} r={2.4} fill="var(--world-star)" opacity={0.5} />
            ),
          )}
          {/* the North Star: always shining, yours at level 10 */}
          <circle cx={424} cy={44} r={level >= 10 ? 46 : 34} fill={`url(#${halo})`} />
          <path d="M424 20 L429 39 L448 44 L429 49 L424 68 L419 49 L400 44 L419 39 Z" fill="#fff8dc" />
        </svg>
        {/* window bars and a sheen on the glass */}
        <div className="absolute inset-y-0 left-1/2 w-[8px] -translate-x-1/2" style={{ background: "var(--world-window-frame)" }} />
        <div className="absolute inset-x-0 top-[62%] h-[8px]" style={{ background: "var(--world-window-frame)" }} />
        <div className="absolute inset-0 bg-linear-to-br from-white/12 via-transparent to-transparent" />
        <p className="absolute left-3 top-3 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm" title="Every level lights a star on your way to the North Star">
          ★ {Math.min(level, 10)} of 10 stars lit
        </p>
      </div>
    </div>
  );
}

/** A desk lamp on the left of the desk, throwing a warm pool of light. */
export function DeskLamp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 220 200" width={220} height={200} aria-hidden>
      <ellipse cx={60} cy={188} rx={44} ry={9} fill="rgb(0 0 0 / 0.25)" />
      <ellipse cx={60} cy={184} rx={40} ry={10} fill="var(--color-star-600)" />
      <ellipse cx={60} cy={180} rx={40} ry={10} fill="var(--color-star-400)" />
      <line x1={60} y1={178} x2={98} y2={98} stroke="var(--color-star-500)" strokeWidth={8} strokeLinecap="round" />
      <line x1={98} y1={98} x2={160} y2={62} stroke="var(--color-star-500)" strokeWidth={7} strokeLinecap="round" />
      <circle cx={98} cy={98} r={7} fill="var(--color-star-600)" />
      <g transform="translate(160 62) rotate(-35)">
        <path d="M-13 -8 L13 -8 L30 32 L-30 32 Z" fill="var(--color-star-400)" />
        <path d="M-13 -8 L0 -8 L-12 32 L-30 32 Z" fill="rgb(255 255 255 / 0.18)" />
        <ellipse cx={0} cy={32} rx={30} ry={7} fill="#fff6d8" />
        <circle cx={0} cy={-8} r={6} fill="var(--color-star-600)" />
      </g>
    </svg>
  );
}

/** Three books, stacked under the lamp. */
export function BookStack({ className }: { className?: string }) {
  const books = [
    { x: 6, y: 40, w: 112, color: "#3B6FE0" },
    { x: 14, y: 22, w: 98, color: "#F5B942" },
    { x: 0, y: 4, w: 106, color: "#EC4899" },
  ];
  return (
    <svg className={className} viewBox="0 0 124 60" width={124} height={60} aria-hidden>
      <ellipse cx={62} cy={58} rx={60} ry={4} fill="rgb(0 0 0 / 0.22)" />
      {books.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={b.y} width={b.w} height={17} rx={3} fill={b.color} />
          <rect x={b.x + b.w - 10} y={b.y + 2} width={8} height={13} rx={1.5} fill="#fffdf6" />
          <rect x={b.x + 8} y={b.y + 7} width={30} height={3} rx={1.5} fill="rgb(255 255 255 / 0.55)" />
        </g>
      ))}
    </svg>
  );
}

/** A mug of something hot, still steaming. */
export function Mug({ className }: { className?: string }) {
  const shade = useId();
  return (
    <svg className={className} viewBox="0 0 72 96" width={72} height={96} aria-hidden>
      {[14, 28, 42].map((x, i) => (
        <path
          key={x}
          d={`M${x} 34 q-6 -8 0 -16 q6 -8 0 -16`}
          fill="none"
          stroke="#ffffff"
          strokeOpacity={0.7}
          strokeWidth={3}
          strokeLinecap="round"
          className="world-steam"
          style={{ animationDelay: `${i * 0.9}s` }}
        />
      ))}
      <ellipse cx={30} cy={92} rx={30} ry={4} fill="rgb(0 0 0 / 0.25)" />
      <path d="M50 52 h6 a10 10 0 0 1 0 20 h-6" fill="none" stroke="#e8edf7" strokeWidth={6} />
      <path d="M6 40 h48 v40 a10 10 0 0 1 -10 10 h-28 a10 10 0 0 1 -10 -10 Z" fill="#f8fafc" />
      <rect x={6} y={52} width={48} height={10} fill="var(--color-star-400)" />
      <ellipse cx={30} cy={40} rx={24} ry={5} fill="#5b3a24" />
      <path d="M6 40 h48 v40 a10 10 0 0 1 -10 10 h-28 a10 10 0 0 1 -10 -10 Z" fill={`url(#${shade})`} />
      <defs>
        <linearGradient id={shade} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.12} />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** The time right now, kept up to date. */
export function useNow(everyMs: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), everyMs);
    return () => clearInterval(tick);
  }, [everyMs]);
  return now;
}

/** A stack of cardboard boxes: the shop's stock, standing on the floor. */
export function StockBoxesArt({ className }: { className?: string }) {
  const box = (x: number, y: number, w: number, h: number, tilt = 0) => (
    <g transform={`rotate(${tilt} ${x + w / 2} ${y + h})`}>
      <rect x={x} y={y} width={w} height={h} rx={3} fill="#c99a62" />
      <rect x={x + w - 9} y={y} width={9} height={h} rx={2} fill="#a87b47" />
      <rect x={x} y={y} width={w} height={6} rx={2} fill="#ddb57f" />
      <rect x={x + w / 2 - 6} y={y} width={12} height={h * 0.45} fill="#e9d3a6" opacity={0.85} />
    </g>
  );
  return (
    <svg className={className} viewBox="0 0 96 128" width={96} height={128} aria-hidden>
      <ellipse cx={48} cy={124} rx={46} ry={5} fill="rgb(0 0 0 / 0.28)" />
      {box(4, 74, 88, 50)}
      {box(12, 38, 70, 37)}
      {box(24, 10, 46, 29, -5)}
    </svg>
  );
}

/** A wrapped present with a bow. Its lid lifts when you hover the gift (see .world-gift in globals.css). */
export function GiftBox({ className }: { className?: string }) {
  const shade = useId();
  return (
    <svg className={className} viewBox="0 0 130 112" width={130} height={112} aria-hidden>
      <defs>
        <linearGradient id={shade} x1="0" x2="1">
          <stop offset="0.55" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.18} />
        </linearGradient>
      </defs>
      <ellipse cx={65} cy={106} rx={60} ry={5} fill="rgb(0 0 0 / 0.25)" />
      <rect x={12} y={46} width={106} height={58} rx={4} fill="#e8457c" />
      <rect x={57} y={46} width={16} height={58} fill="#ffd27a" />
      <rect x={12} y={46} width={106} height={58} rx={4} fill={`url(#${shade})`} />
      <g className="world-gift-lid">
        <rect x={6} y={32} width={118} height={18} rx={4} fill="#f2628f" />
        <rect x={57} y={32} width={16} height={18} fill="#ffc94d" />
        <ellipse cx={50} cy={22} rx={16} ry={9} fill="#ffd27a" stroke="#e0a82e" strokeWidth={2} transform="rotate(-24 50 22)" />
        <ellipse cx={80} cy={22} rx={16} ry={9} fill="#ffd27a" stroke="#e0a82e" strokeWidth={2} transform="rotate(24 80 22)" />
        <circle cx={65} cy={29} r={7} fill="#ffc94d" stroke="#e0a82e" strokeWidth={2} />
      </g>
      <g fill="#fff3c4" className="world-twinkle">
        <path d="M14 14 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" />
        <path d="M118 8 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5 Z" />
      </g>
    </svg>
  );
}

/** A round wall clock showing the real time. */
export function WallClock({ className }: { className?: string }) {
  const now = useNow(20_000);
  const minutes = now.getMinutes();
  const hours = (now.getHours() % 12) + minutes / 60;
  return (
    <svg className={className} viewBox="0 0 110 110" width={110} height={110} role="img" aria-label={`Clock: ${now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`}>
      <circle cx={55} cy={59} r={50} fill="rgb(0 0 0 / 0.2)" />
      <circle cx={55} cy={55} r={50} fill="var(--color-star-400)" />
      <circle cx={55} cy={55} r={43} fill="#fffdf6" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={53.5} y={15} width={3} height={i % 3 ? 5 : 9} rx={1.5} fill="#374151" transform={`rotate(${i * 30} 55 55)`} />
      ))}
      <rect x={52.5} y={30} width={5} height={28} rx={2.5} fill="#1f2937" transform={`rotate(${hours * 30} 55 55)`} />
      <rect x={53.5} y={19} width={3} height={39} rx={1.5} fill="#1f2937" transform={`rotate(${minutes * 6} 55 55)`} />
      <circle cx={55} cy={55} r={4.5} fill="var(--color-star-600)" />
    </svg>
  );
}

/** A trophy: how many missions you've finished. */
function Trophy() {
  const gold = useId();
  return (
    <svg viewBox="0 0 64 76" width={58} height={69} aria-hidden>
      <defs>
        <linearGradient id={gold} x1="0" x2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.55" stopColor="#f5b942" />
          <stop offset="1" stopColor="#c27c0e" />
        </linearGradient>
      </defs>
      <path d="M14 10 h-8 a8 10 0 0 0 10 18 M50 10 h8 a8 10 0 0 1 -10 18" fill="none" stroke="#e2a230" strokeWidth={4} />
      <path d="M12 6 h40 v12 a20 20 0 0 1 -40 0 Z" fill={`url(#${gold})`} />
      <path d="M32 9 l2.6 5.4 5.9 0.8 -4.3 4.1 1 5.8 -5.2 -2.8 -5.2 2.8 1 -5.8 -4.3 -4.1 5.9 -0.8 Z" fill="#fff7d6" opacity={0.9} />
      <rect x={28} y={38} width={8} height={14} fill="#d99a1e" />
      <rect x={18} y={52} width={28} height={8} rx={2} fill={`url(#${gold})`} />
      <rect x={14} y={60} width={36} height={12} rx={2} fill="#6b4a2c" />
    </svg>
  );
}

/** A coin jar: cash in hand, filled up to six months of fixed costs. */
function CoinJar({ fill }: { fill: number }) {
  const inside = useId();
  const top = 70 - 46 * Math.max(0.04, Math.min(1, fill));
  const coins = [];
  for (let y = 66; y >= top; y -= 5) coins.push(y);
  return (
    <svg viewBox="0 0 56 76" width={51} height={69} aria-hidden>
      <defs>
        <clipPath id={inside}>
          <path d="M10 22 h36 a6 6 0 0 1 6 6 v36 a8 8 0 0 1 -8 8 h-32 a8 8 0 0 1 -8 -8 v-36 a6 6 0 0 1 6 -6 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${inside})`}>
        {coins.map((y, i) => (
          <ellipse key={y} cx={28 + ((i % 3) - 1) * 4} cy={y} rx={17} ry={4.5} fill={i % 2 ? "#f5b942" : "#e2a230"} stroke="#b7791f" strokeWidth={0.8} />
        ))}
      </g>
      <path d="M10 22 h36 a6 6 0 0 1 6 6 v36 a8 8 0 0 1 -8 8 h-32 a8 8 0 0 1 -8 -8 v-36 a6 6 0 0 1 6 -6 Z" fill="rgb(255 255 255 / 0.14)" stroke="rgb(255 255 255 / 0.65)" strokeWidth={2} />
      <rect x={12} y={12} width={32} height={10} rx={3} fill="#64748b" />
      <rect x={22} y={14} width={12} height={3} rx={1.5} fill="#1f2937" />
      <path d="M12 30 v26" stroke="#fff" strokeOpacity={0.6} strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

/** A plant that grows as you level up. */
function LevelPlant({ level }: { level: number }) {
  const leaves = Math.min(3 + level, 11);
  const length = 16 + Math.min(level, 10) * 2.6;
  return (
    <svg viewBox="0 0 70 84" width={64} height={77} aria-hidden>
      {Array.from({ length: leaves }, (_, i) => {
        const angle = -70 + (140 * i) / Math.max(1, leaves - 1);
        const l = length * (i % 2 ? 0.82 : 1);
        return (
          <ellipse
            key={i}
            cx={35}
            cy={52 - l / 2}
            rx={6.5}
            ry={l / 2}
            fill={i % 2 ? "#22c55e" : "#16a34a"}
            transform={`rotate(${angle} 35 52)`}
          />
        );
      })}
      <path d="M18 52 h34 l-4 28 h-26 Z" fill="#c2410c" />
      <rect x={15} y={49} width={40} height={8} rx={2} fill="#ea580c" />
    </svg>
  );
}

/** The shelf of how you're doing: missions finished, cash in the jar, and the plant you're growing. */
export function VitalsShelf({
  className,
  done,
  cash,
  cashFill,
  level,
}: {
  className?: string;
  done: number;
  cash: string;
  cashFill: number;
  level: number;
}) {
  const items = [
    { art: <Trophy />, label: `${done} done`, title: `${done} mission${done === 1 ? "" : "s"} finished` },
    { art: <CoinJar fill={cashFill} />, label: cash, title: "Cash in hand (the jar is full at six months of fixed costs)" },
    { art: <LevelPlant level={level} />, label: `Level ${level}`, title: "Your plant grows every level" },
  ];
  return (
    <div className={clsx("w-[230px]", className)}>
      <div className="flex items-end justify-around px-2">
        {items.map((it) => (
          <div key={it.label} title={it.title} className="flex flex-col items-center">
            {it.art}
          </div>
        ))}
      </div>
      <div className="world-wood relative h-[14px] rounded-sm shadow-[0_10px_14px_-8px_rgb(0_0_0/0.6)]" />
      <div className="flex justify-around px-2">
        <span className="mt-[-1px] h-5 w-3 bg-black/30 [clip-path:polygon(0_0,100%_0,0_100%)]" aria-hidden />
        <span className="mt-[-1px] h-5 w-3 bg-black/30 [clip-path:polygon(0_0,100%_0,100%_100%)]" aria-hidden />
      </div>
      <div className="-mt-3 flex justify-around px-1">
        {items.map((it) => (
          <span key={it.label} className="rounded-full bg-surface-900/85 px-2 py-0.5 text-[11px] font-semibold text-muted ring-1 ring-line">
            {it.label}
          </span>
        ))}
      </div>
    </div>
  );
}
