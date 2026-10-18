"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, HardDrive, Send, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { deleteEverything, downloadBackup, readBackup, restoreBackup, type ReadBackup } from "@/lib/backup";
import { usePolaris } from "@/lib/store";

/**
 * "Your data": where Polaris keeps things, what it sends to the AI, and the owner's controls:
 * download a backup, restore one, or delete everything.
 */
export function YourDataDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const businessName = usePolaris((s) => s.profile.businessName);
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<ReadBackup | null>(null);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [done, setDone] = useState("");

  async function pick(file: File) {
    setError("");
    setDone("");
    if (file.size > 20 * 1024 * 1024) return setError("That file is too big to be a Polaris backup.");
    try {
      setPending(readBackup(await file.text()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that file.");
    }
  }

  return (
    <Modal title="Your data" onClose={onClose}>
      <div className="mt-4 space-y-5 text-sm leading-relaxed">
        <section className="flex gap-3">
          <HardDrive className="mt-0.5 size-5 shrink-0 text-star-300" aria-hidden />
          <div>
            <h3 className="font-semibold">Kept on this device</h3>
            <p className="mt-0.5 text-muted">
              Your business details, money records, missions and ideas are saved in this browser only. Polaris has no
              account or database, so nobody else can see them, but clearing this browser&apos;s data deletes them. Keep a
              backup.
            </p>
          </div>
        </section>

        <section className="flex gap-3">
          <Send className="mt-0.5 size-5 shrink-0 text-star-300" aria-hidden />
          <div>
            <h3 className="font-semibold">Sent to the AI when you use it</h3>
            <p className="mt-0.5 text-muted">
              When you chat, plan missions, use the studio or ask for a check-up, the details that answer needs (your
              business name and a summary of your numbers) go to NVIDIA Nemotron on Nebius, then come straight back.
              Card and account numbers in statement files are blanked out first. Polaris&apos;s own server keeps nothing.
            </p>
            <Link href="/privacy" onClick={onClose} className="mt-1 inline-block font-medium text-star-300 underline-offset-4 hover:underline">
              Read the privacy notice
            </Link>
          </div>
        </section>

        <div className="space-y-3 border-t border-line pt-5">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => (downloadBackup(), setDone("Backup saved to your downloads."))}>
              <Download className="size-4" aria-hidden /> Download a backup
            </Button>
            <Button variant="secondary" size="sm" onClick={() => fileInput.current?.click()}>
              <Upload className="size-4" aria-hidden /> Restore a backup
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void pick(f);
              }}
            />
          </div>
          {done && (
            <p role="status" className="text-growth">
              {done}
            </p>
          )}
          {error && (
            <p role="alert" className="text-alert">
              {error}
            </p>
          )}

          {pending && (
            <div className="rounded-2xl bg-fg/[0.04] p-4 ring-1 ring-line">
              <p className="font-semibold">Replace what&apos;s here with this backup?</p>
              <p className="mt-1 text-muted">
                {pending.businessName}
                {pending.exportedAt && `, saved ${new Date(pending.exportedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`}:{" "}
                {pending.counts.entries} money records, {pending.counts.missions} missions, {pending.counts.ideas} saved ideas.
                Everything for {businessName || "this business"} on this device will be replaced.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    restoreBackup(pending);
                    setPending(null);
                    setDone("Backup restored.");
                  }}
                >
                  Replace with backup
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPending(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-line pt-5">
          {confirmDelete ? (
            <div className="rounded-2xl bg-alert/10 p-4 ring-1 ring-alert/40">
              <p className="font-semibold">Delete everything on this device?</p>
              <p className="mt-1 text-muted">
                Your business, money records, missions, ideas and chats are removed for good. Download a backup first if you
                might want them back.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-2 rounded-full bg-alert px-3.5 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-alert"
                  onClick={() => {
                    deleteEverything();
                    onClose();
                    router.replace("/welcome");
                  }}
                >
                  <Trash2 className="size-4" aria-hidden /> Yes, delete everything
                </button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                  Keep my data
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-2 text-sm font-medium text-alert hover:underline"
            >
              <Trash2 className="size-4" aria-hidden /> Delete all my data
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
