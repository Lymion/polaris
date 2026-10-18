"use client";

import { memo, useState, type ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowUp, ListPlus, LoaderCircle, Square } from "lucide-react";
import { Mascot } from "@/components/mascot/Mascot";
import { Markdown } from "@/components/ui/Markdown";
import { sendAdvisorMessage, stopAdvisor } from "@/lib/advisorChat";
import { AiError, generateMissions } from "@/lib/ai/client";
import { parseAdvisorReply } from "@/lib/ai/shared";
import { CATEGORY_LABELS, CATEGORY_STYLES } from "@/lib/categories";
import { usePolaris } from "@/lib/store";
import type { AdvisorMessage, MissionCategory } from "@/lib/types";

/** The shared conversation plus the reply streaming in. */
export function ChatThread({ compact = false }: { compact?: boolean }) {
  const thread = usePolaris((s) => s.advisorThread);
  const streaming = usePolaris((s) => s.chatStreaming);
  const live = streaming !== null ? parseAdvisorReply(streaming) : null;

  return (
    <div className={compact ? "space-y-5" : "space-y-6"}>
      {thread.map((m) =>
        m.role === "user" ? (
          <UserBubble key={m.id} text={m.content} />
        ) : (
          <AssistantMessage key={m.id} message={m} compact={compact} />
        ),
      )}
      {live && (
        <AssistantShell area={live.area}>
          {live.body ? (
            <Markdown live>{live.body}</Markdown>
          ) : (
            <span className="flex items-center gap-2 text-sm text-muted">
              <LoaderCircle className="size-4 animate-spin" aria-hidden /> Flipping through my book…
            </span>
          )}
        </AssistantShell>
      )}
    </div>
  );
}

export function ChatComposer({ page, className }: { page?: string; className?: string }) {
  const busy = usePolaris((s) => s.chatStreaming !== null);
  const [draft, setDraft] = useState("");

  function send() {
    if (!draft.trim() || busy) return;
    void sendAdvisorMessage(draft, page);
    setDraft("");
  }

  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <div className="flex items-end gap-2 rounded-3xl bg-surface-800/90 p-2 pl-5 shadow-2xl ring-1 ring-line backdrop-blur-xl focus-within:ring-focus/60">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          rows={Math.min(6, Math.max(1, draft.split("\n").length))}
          placeholder="Describe what's happening…"
          aria-label="Message your guide"
          className="max-h-40 flex-1 resize-none bg-transparent py-2.5 text-sm text-ink placeholder:text-faint focus:outline-none sm:text-[15px]"
        />
        {busy ? (
          <button
            type="button"
            onClick={stopAdvisor}
            aria-label="Stop"
            className="tap-target relative grid size-10 shrink-0 place-items-center rounded-full bg-fg/10 text-ink transition-[transform,background-color] hover:bg-fg/15 active:scale-95"
          >
            <Square className="size-3.5 fill-current" aria-hidden />
          </button>
        ) : (
          <button
            type="submit"
            aria-label="Send"
            disabled={!draft.trim()}
            className="tap-target relative grid size-10 shrink-0 place-items-center rounded-full bg-linear-to-b from-star-300 to-star-500 text-on-accent transition-[transform,opacity] active:scale-95 disabled:opacity-30"
          >
            <ArrowUp className="size-5" strokeWidth={2.5} aria-hidden />
          </button>
        )}
      </div>
    </form>
  );
}

// Messages are memoized: while a reply streams in, the thread re-renders on every chunk,
// and finished messages shouldn't re-render with it.
const UserBubble = memo(function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-lg bg-orbit-600/50 px-4 py-3 text-sm leading-relaxed ring-1 ring-orbit-400/30 sm:text-[15px]">
        {text}
      </p>
    </div>
  );
});

function AssistantShell({ area, children }: { area?: MissionCategory | null; children: ReactNode }) {
  return (
    <div className="flex gap-2.5 animate-rise-in">
      <Mascot size={36} still className="-mt-1 shrink-0" />
      <div className="min-w-0 flex-1">
        {area && (
          <p className="mb-2.5 inline-flex items-center gap-2 text-xs font-medium text-muted">
            Needs attention:
            <span className={clsx("rounded-full px-2.5 py-0.5 font-semibold", CATEGORY_STYLES[area])}>
              {CATEGORY_LABELS[area]}
            </span>
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

const AssistantMessage = memo(function AssistantMessage({
  message,
  compact,
}: {
  message: AdvisorMessage;
  compact: boolean;
}) {
  const updateMessage = usePolaris((s) => s.updateAdvisorMessage);
  const addMissions = usePolaris((s) => s.addMissions);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState("");

  if (message.error) {
    return (
      <AssistantShell>
        <p className="rounded-xl bg-alert/10 px-4 py-3 text-sm text-alert ring-1 ring-alert/30">{message.content}</p>
      </AssistantShell>
    );
  }

  // Short replies (greetings, follow-up questions) have nothing to turn into missions.
  const actionable = message.content.length > 200;

  async function toMissions() {
    setConverting(true);
    setError("");
    try {
      const created = await generateMissions({ mode: "advice", text: message.content, source: "advisor" });
      addMissions(created);
      updateMessage(message.id, { missionsAdded: created.length });
    } catch (err) {
      setError(err instanceof AiError ? err.message : "Couldn't create missions. Try again.");
    } finally {
      setConverting(false);
    }
  }

  return (
    <AssistantShell area={message.area}>
      <Markdown>{message.content}</Markdown>
      {actionable && (
        <div className={clsx("flex flex-wrap items-center gap-3", compact ? "mt-3" : "mt-4")}>
          {message.missionsAdded ? (
            <p className="inline-flex items-center gap-2 rounded-full bg-growth/10 px-3.5 py-1.5 text-xs font-semibold text-growth ring-1 ring-growth/30">
              {message.missionsAdded} {message.missionsAdded === 1 ? "mission" : "missions"} added
              <Link href="/missions" className="tap-target relative underline underline-offset-2">
                View
              </Link>
            </p>
          ) : (
            <button
              type="button"
              onClick={toMissions}
              disabled={converting}
              className="tap-target relative inline-flex h-9 items-center gap-2 rounded-full bg-star-400/10 px-4 text-sm font-semibold text-star-200 ring-1 ring-star-400/40 transition-[transform,background-color] duration-150 ease-out not-disabled:hover:bg-star-400/20 not-disabled:active:scale-[0.97] disabled:opacity-60"
            >
              {converting ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : (
                <ListPlus className="size-4" aria-hidden />
              )}
              {converting ? "Creating missions…" : "Turn this into missions"}
            </button>
          )}
          {error && (
            <p role="alert" className="text-xs text-alert">
              {error}
            </p>
          )}
        </div>
      )}
    </AssistantShell>
  );
});
