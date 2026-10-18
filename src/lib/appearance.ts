// How Polaris looks: the experience (classic dashboard or the interactive 3D world) and the
// colour theme. Applied as data attributes on <html> (see globals.css for the themes).

export type ThemeId = "dark" | "light" | "cutesy" | "cool" | "professional";
export type Experience = "classic" | "world";

export interface Prefs {
  experience: Experience;
  theme: ThemeId;
}

export const DEFAULT_PREFS: Prefs = { experience: "classic", theme: "dark" };

export const THEMES: { id: ThemeId; name: string; blurb: string; swatch: [string, string, string] }[] = [
  { id: "dark", name: "Midnight", blurb: "Deep navy and starlight", swatch: ["#050b1c", "#13275a", "#f5b942"] },
  { id: "light", name: "Daylight", blurb: "Bright and airy", swatch: ["#f3f6fc", "#ffffff", "#e2a230"] },
  { id: "cutesy", name: "Candy", blurb: "Soft pinks, round and playful", swatch: ["#fff4f9", "#ffd9ea", "#ff7eb6"] },
  { id: "cool", name: "Neon", blurb: "Dark with cyan and magenta glow", swatch: ["#04060c", "#142033", "#22d3ee"] },
  { id: "professional", name: "Workspace", blurb: "Clean and professional, no cartoons", swatch: ["#f6f8fc", "#ffffff", "#0b57d0"] },
];

export const EXPERIENCES: { id: Experience; name: string; blurb: string }[] = [
  { id: "classic", name: "Classic dashboard", blurb: "Cards and pages. Quick to scan, simple to use." },
  { id: "world", name: "Interactive world", blurb: "Sit at your desk: a board for missions, a computer for money, a door to the studio." },
];

/** The interactive world is illustrated and playful, so the professional theme keeps the classic layout. */
export const worldAllowed = (theme: ThemeId) => theme !== "professional";

/** The things at your desk that lead somewhere: the mission board, the computer, the studio easel and the stock boxes. */
export type WorldSpot = "board" | "monitor" | "easel" | "stock";

/** Sets the attributes the stylesheet themes from. Also run before first paint (see layout). */
export function applyPrefs(prefs: Prefs) {
  const root = document.documentElement;
  root.dataset.theme = prefs.theme;
  root.dataset.experience = worldAllowed(prefs.theme) ? prefs.experience : "classic";
}

/**
 * Inline script for <head>: applies the saved look before the page paints, so a light theme
 * doesn't flash dark first. Reads the persisted store directly.
 */
export const PREFS_BOOT_SCRIPT = `try{var s=JSON.parse(localStorage.getItem("polaris")||"{}").state,p=s&&s.prefs;if(p){var d=document.documentElement;if(p.theme)d.dataset.theme=p.theme;d.dataset.experience=p.theme==="professional"?"classic":p.experience||"classic"}}catch(e){}`;
