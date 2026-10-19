// Backup files: everything Polaris saves in this browser, as one JSON file the owner keeps.
// Importing one replaces what's here. Nothing is sent anywhere either way.

import { savedData, type SavedData, usePolaris } from "./store";

const KIND = "polaris-backup";
const VERSION = 1;

/** The current data as a backup file's text. */
export function backupText() {
  return JSON.stringify({ kind: KIND, version: VERSION, exportedAt: new Date().toISOString(), data: savedData(usePolaris.getState()) }, null, 2);
}

/** Saves the backup as a file named after the business and today's date. */
export function downloadBackup() {
  const name = usePolaris.getState().profile.businessName.trim() || "Polaris";
  const date = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(new Blob([backupText()], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name} backup ${date}.json`.replace(/[\\/:*?"<>|]/g, "");
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ReadBackup {
  data: SavedData;
  businessName: string;
  exportedAt: string;
  counts: { entries: number; missions: number; ideas: number };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const arrays = ["missions", "insights", "entries", "products", "channels", "overheads", "lessonsDone", "wins", "toursSeen", "activities", "stockMoves", "studioItems", "advisorThread"] as const;

/** Checks a backup file and returns what's in it, or throws with a reason the owner can act on. */
export function readBackup(text: string): ReadBackup {
  let file: unknown;
  try {
    file = JSON.parse(text);
  } catch {
    throw new Error("That file isn't a Polaris backup (it isn't readable JSON).");
  }
  if (!isObject(file) || file.kind !== KIND || !isObject(file.data)) throw new Error("That file isn't a Polaris backup.");
  if (typeof file.version !== "number" || file.version > VERSION) throw new Error("That backup comes from a newer version of Polaris.");
  const d = file.data;
  if (!isObject(d.profile)) throw new Error("That backup is missing the business profile.");
  for (const key of arrays) {
    if (d[key] !== undefined && !Array.isArray(d[key])) throw new Error("That backup looks damaged, so nothing was changed.");
  }
  // Fill anything an older backup doesn't have from what a fresh start would hold.
  const fresh = savedData(usePolaris.getInitialState());
  const data = { ...fresh, ...d, profile: { ...fresh.profile, ...d.profile }, revenue: { ...fresh.revenue, ...(isObject(d.revenue) ? d.revenue : {}) } } as SavedData;
  return {
    data,
    businessName: String(data.profile.businessName || "Your business"),
    exportedAt: typeof file.exportedAt === "string" ? file.exportedAt : "",
    counts: { entries: data.entries.length, missions: data.missions.length, ideas: data.studioItems.length },
  };
}

/** Replaces everything saved here with a backup. How Polaris looks on this device is kept. */
export function restoreBackup(backup: ReadBackup) {
  usePolaris.setState({ ...backup.data, prefs: usePolaris.getState().prefs, celebration: null });
}

/** Deletes everything Polaris saved in this browser. */
export function deleteEverything() {
  usePolaris.getState().reset();
  usePolaris.persist.clearStorage();
}
