import { useId } from "react";

const SPARKS = [
  { x: 31, y: 143, s: 14 },
  { x: 54, y: 114, s: 16 },
  { x: 73, y: 129, s: 14 },
  { x: 115, y: 65, s: 18 },
  { x: 135, y: 75, s: 14 },
  { x: 157, y: 51, s: 18 },
];

const STAR = "M100,46 Q111,93 158,104 Q111,115 100,162 Q89,115 42,104 Q89,93 100,46 Z";

/** The Polaris logo mark: orb, constellation growth line and the North Star. Source: branding/polaris-mark.svg */
export function PolarisMark({ size = 40, className }: { size?: number; className?: string }) {
  // Unique ids so several marks on one page don't share gradients.
  const id = useId().replace(/:/g, "");
  const ref = (name: string) => `${name}-${id}`;
  const url = (name: string) => `url(#${ref(name)})`;

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={className} role="img" aria-label="Polaris">
      <defs>
        <radialGradient id={ref("orb")} cx="42%" cy="36%" r="70%">
          <stop offset="0" stopColor="#3B6FE0" />
          <stop offset=".6" stopColor="#2450B8" />
          <stop offset="1" stopColor="#1C3F9A" />
        </radialGradient>
        <linearGradient id={ref("trail")} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#6FD3FF" stopOpacity=".15" />
          <stop offset=".55" stopColor="#7FB4FF" />
          <stop offset="1" stopColor="#FFC861" />
        </linearGradient>
        <linearGradient id={ref("goldL")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF1C2" />
          <stop offset="1" stopColor="#FFC24D" />
        </linearGradient>
        <linearGradient id={ref("goldD")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F7A531" />
          <stop offset="1" stopColor="#E0661F" />
        </linearGradient>
        <radialGradient id={ref("halo")} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#FFD27A" stopOpacity=".55" />
          <stop offset="1" stopColor="#FFD27A" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={ref("area")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5B8DEF" stopOpacity=".35" />
          <stop offset="1" stopColor="#5B8DEF" stopOpacity="0" />
        </linearGradient>
        <clipPath id={ref("orbClip")}>
          <circle cx="100" cy="104" r="80" />
        </clipPath>
        <clipPath id={ref("starClip")}>
          <path d={STAR} />
        </clipPath>
        <symbol id={ref("spark")} viewBox="-10 -10 20 20">
          <polygon points="0,-10 -2,-2 0,0" fill="#FFFFFF" />
          <polygon points="0,-10 2,-2 0,0" fill="#BFD4FF" />
          <polygon points="10,0 2,-2 0,0" fill="#FFFFFF" />
          <polygon points="10,0 2,2 0,0" fill="#BFD4FF" />
          <polygon points="0,10 2,2 0,0" fill="#BFD4FF" />
          <polygon points="0,10 -2,2 0,0" fill="#FFFFFF" />
          <polygon points="-10,0 -2,2 0,0" fill="#BFD4FF" />
          <polygon points="-10,0 -2,-2 0,0" fill="#FFFFFF" />
        </symbol>
      </defs>
      <circle cx="100" cy="104" r="80" fill={url("orb")} />
      <path d="M38 76 A64 64 0 0 1 120 42" fill="none" stroke="#ffffff" strokeOpacity=".18" strokeWidth="5" strokeLinecap="round" />
      <polygon
        clipPath={url("orbClip")}
        points="10,184 38,150 62,122 80,136 124,74 142,82 166,60 192,36 192,190 10,190"
        fill={url("area")}
      />
      <polyline points="40,154 64,126 82,140 126,78 144,86 168,64" fill="none" stroke="#050D24" strokeOpacity=".55" strokeWidth="5" />
      <polyline points="38,150 62,122 80,136 124,74 142,82 166,60" fill="none" stroke={url("trail")} strokeWidth="4.5" />
      {SPARKS.map((p) => (
        <use key={`${p.x}-${p.y}`} href={`#${ref("spark")}`} x={p.x} y={p.y} width={p.s} height={p.s} />
      ))}
      <circle cx="100" cy="104" r="46" fill={url("halo")} />
      <path d={STAR} fill={url("goldD")} stroke="#F7A531" strokeWidth="5" strokeLinejoin="round" />
      <g clipPath={url("starClip")}>
        <polygon points="100,104 300,104 300,-96" fill={url("goldL")} />
        <polygon points="100,104 100,-100 -100,-100 -100,104" fill={url("goldL")} />
        <polygon points="100,104 -100,304 100,304" fill={url("goldL")} />
      </g>
      <ellipse cx="88" cy="88" rx="5" ry="3" transform="rotate(-45 88 88)" fill="#FFFFFF" fillOpacity=".7" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return <span className={`font-brand text-starlight leading-none ${className}`}>Polaris</span>;
}
