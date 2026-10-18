"use client";

import { memo, useEffect, useId, useState } from "react";
import clsx from "clsx";
import { useProfessional } from "@/lib/store";

export type MascotMood = "idle" | "talking" | "thinking" | "happy";
type Gesture = "wave" | "flip" | "read" | "idea" | "cheer";

const IDLE_GESTURES: Gesture[] = ["wave", "flip", "read", "idea", "flip", "read"];

/** How long each one-off gesture plays before returning to idle (matches globals.css). */
const GESTURE_MS: Record<Gesture, number> = { wave: 1600, flip: 1200, read: 1800, idea: 1800, cheer: 1400 };

/**
 * The Polaris guide: a bubbly star holding a book. Its side points are arms.
 * While idle it bobs, blinks and every few seconds waves, flips a page, reads or has an idea.
 * `still` renders a static pose (for small avatars).
 */
export const Mascot = memo(function Mascot({
  size = 96,
  mood = "idle",
  still = false,
  greet = false,
  className,
}: {
  size?: number;
  mood?: MascotMood;
  still?: boolean;
  /** Wave once when first shown. */
  greet?: boolean;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const [gesture, setGesture] = useState<Gesture | null>(greet ? "wave" : null);
  const professional = useProfessional();

  useEffect(() => {
    if (still || mood !== "idle" || professional) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = (delay: number) => {
      timer = setTimeout(() => {
        const next = IDLE_GESTURES[Math.floor(Math.random() * IDLE_GESTURES.length)];
        setGesture(next);
        timer = setTimeout(() => {
          setGesture(null);
          schedule(2600 + Math.random() * 3200);
        }, GESTURE_MS[next]);
      }, delay);
    };
    schedule(greet ? GESTURE_MS.wave + 1200 : 1500 + Math.random() * 2000);
    return () => clearTimeout(timer);
  }, [still, mood, greet, professional]);

  const g = (name: string) => `${name}-${id}`;
  const url = (name: string) => `url(#${g(name)})`;

  // The professional theme has no cartoon: the guide is a plain assistant badge. Still an
  // <svg>, so it works inside the studio's SVG scenes too.
  if (professional) {
    return (
      <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden className={className}>
        <circle cx="60" cy="60" r="56" style={{ fill: "var(--color-orbit-500)", opacity: 0.12 }} />
        <path
          d="M60 24 C62 46 74 58 96 60 C74 62 62 74 60 96 C58 74 46 62 24 60 C46 58 58 46 60 24 Z"
          style={{ fill: "var(--color-orbit-500)" }}
          className={mood === "thinking" ? "animate-pulse" : undefined}
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      aria-hidden
      className={clsx(
        "mascot overflow-visible",
        `mood-${mood}`,
        gesture && mood === "idle" && `g-${gesture}`,
        still && "m-still",
        className,
      )}
    >
      <defs>
        <linearGradient id={g("body")} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#FFE9A8" />
          <stop offset="0.45" stopColor="#FFC94D" />
          <stop offset="1" stopColor="#F59E2E" />
        </linearGradient>
        <radialGradient id={g("glow")} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#FFD27A" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFD27A" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse className="m-shadow" cx="60" cy="113" rx="20" ry="3.2" fill="#000" opacity="0.35" />
      <circle className="m-glow" cx="60" cy="64" r="48" fill={url("glow")} />

      {/* Background sparkles */}
      <g fill="#FFF3C4">
        <path className="m-twinkle" d="M14 30 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z" />
        <path className="m-twinkle" d="M106 20 l1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 3 -1.2z" />
        <path className="m-twinkle" d="M12 88 l1.1 2.8 2.8 1.1 -2.8 1.1 -1.1 2.8 -1.1 -2.8 -2.8 -1.1 2.8 -1.1z" />
      </g>

      <g className="m-float">
        {/* Left arm: the star's left point, waving from the shoulder */}
        {/* The base reaches into the body so no gap shows while the arm swings. */}
        <polygon
          className="m-arm-l"
          points="47,47.5 23.9,54.3 38.5,72.5 52,62"
          fill={url("body")}
          stroke="#FBBF45"
          strokeWidth="11"
          strokeLinejoin="round"
        />

        {/* Right arm holding the book */}
        <g className="m-arm-r">
          <polygon
            points="73,47.5 96.1,54.3 81.5,72.5 68,62"
            fill={url("body")}
            stroke="#FBBF45"
            strokeWidth="11"
            strokeLinejoin="round"
          />
          <g transform="rotate(-10 101 53)">
            <path d="M88 46 L101 48.5 L114 46 L114 61 L101 63.5 L88 61 Z" fill="#2450B8" stroke="#1C3F9A" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M89.5 45.5 Q95 44 101 47 L101 61 Q95 58.5 89.5 59.5 Z" fill="#FFFFFF" />
            <path d="M101 47 Q107 44 112.5 45.5 L112.5 59.5 Q107 58.5 101 61 Z" fill="#E6EDFF" />
            <path d="M91.5 49.5 L98.5 50.7 M91.5 52.5 L98.5 53.7 M91.5 55.5 L97 56.5 M103.5 50.7 L110.5 49.5 M103.5 53.7 L110.5 52.5 M103.5 56.5 L109 55.5" stroke="#9FB6E0" strokeWidth="0.9" strokeLinecap="round" />
            <path className="m-page" d="M101 47 Q107 44 112.5 45.5 L112.5 59.5 Q107 58.5 101 61 Z" fill="#FFFFFF" stroke="#C9D6F5" strokeWidth="0.6" />
            <path d="M105 61.5 L105 67 L106.6 65.6 L108.2 67 L108.2 61" fill="#F87171" />
          </g>
        </g>

        {/* Body: the rest of a rounded five-point star */}
        <polygon
          points="60,26 74.1,46.6 82.8,73.4 82.3,96.7 60,90 37.7,96.7 37.2,73.4 45.9,46.6"
          fill={url("body")}
          stroke="#FBBF45"
          strokeWidth="12"
          strokeLinejoin="round"
        />
        <ellipse cx="49" cy="44" rx="6" ry="9" transform="rotate(35 49 44)" fill="#FFFFFF" opacity="0.45" />
        <circle cx="57" cy="31" r="2" fill="#FFFFFF" opacity="0.7" />

        {/* Face */}
        <ellipse cx="45.5" cy="70" rx="4.2" ry="2.5" fill="#FF8FA3" opacity="0.55" />
        <ellipse cx="74.5" cy="70" rx="4.2" ry="2.5" fill="#FF8FA3" opacity="0.55" />

        <g className="m-eyes">
          <g className="m-pupils">
            <ellipse cx="52" cy="62" rx="3.6" ry="4.6" fill="#1D2754" />
            <ellipse cx="68" cy="62" rx="3.6" ry="4.6" fill="#1D2754" />
            <circle cx="53.3" cy="60.2" r="1.4" fill="#FFFFFF" />
            <circle cx="69.3" cy="60.2" r="1.4" fill="#FFFFFF" />
          </g>
        </g>
        <path
          className="m-eyes-happy"
          d="M48.5 63.5 Q52 58.5 55.5 63.5 M64.5 63.5 Q68 58.5 71.5 63.5"
          stroke="#1D2754"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />

        <path className="m-mouth-smile" d="M56 70 Q60 74.5 64 70" stroke="#1D2754" strokeWidth="2" strokeLinecap="round" fill="none" />
        <ellipse className="m-mouth-talk" cx="60" cy="71.5" rx="3" ry="2.6" fill="#1D2754" />
        <path className="m-mouth-open" d="M55.5 69.5 Q60 77.5 64.5 69.5 Z" fill="#1D2754" stroke="#1D2754" strokeWidth="1" strokeLinejoin="round" />
        <circle className="m-mouth-o" cx="61.5" cy="71.5" r="1.8" fill="#1D2754" />
      </g>

      {/* Idea sparkle that pops above the raised arm */}
      <path
        className="m-idea"
        d="M22 18 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z"
        fill="#FFFFFF"
        stroke="#FFD27A"
        strokeWidth="1"
      />
    </svg>
  );
});
