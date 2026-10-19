"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  Clock,
  Coins,
  Landmark,
  MessageSquareWarning,
  RotateCcw,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";
import { Mascot } from "@/components/mascot/Mascot";
import { sendAdvisorMessage } from "@/lib/advisorChat";
import { mascotName, useHydrated, usePolaris } from "@/lib/store";
import { ChatComposer, ChatThread, startNewChat } from "./ChatParts";

const STARTERS: { icon: LucideIcon; label: string; prompt: string }[] = [
  {
    icon: TrendingDown,
    label: "Sales dropped this month",
    prompt: "My sales dropped this month and I'm not sure why. Help me figure out what's wrong.",
  },
  {
    icon: Landmark,
    label: "Help me register my business",
    prompt: "Walk me through registering my business step by step, for my country and type of business.",
  },
  {
    icon: Coins,
    label: "My costs went up",
    prompt: "My supplier just raised their prices. How do I protect my profit?",
  },
  {
    icon: MessageSquareWarning,
    label: "A customer left a bad review",
    prompt: "A customer left a bad review online. How should I respond, and what should I fix?",
  },
  {
    icon: Clock,
    label: "No time for marketing",
    prompt: "I'm too busy running the business to do marketing. What's the minimum I should do each week?",
  },
  {
    icon: Activity,
    label: "Business health check",
    prompt:
      "Give my business a quick health check. Ask me the few things you need to know, then tell me which area needs the most attention.",
  },
];

const PAGE = "Advisor page (full chat)";

export function AdvisorChat() {
  const hydrated = useHydrated();
  const router = useRouter();
  const searchParams = useSearchParams();
  const profile = usePolaris((s) => s.profile);
  const threadLength = usePolaris((s) => s.advisorThread.length);
  const streaming = usePolaris((s) => s.chatStreaming);
  const handledQuery = useRef(false);
  const name = mascotName(profile);

  // Questions sent from the dashboard or a mission arrive as ?q=
  useEffect(() => {
    const q = searchParams.get("q");
    if (!hydrated || !q || handledQuery.current) return;
    handledQuery.current = true;
    router.replace("/advisor", { scroll: false });
    void sendAdvisorMessage(q, PAGE);
  }, [hydrated, searchParams, router]);

  // Open saved conversations at the latest message (an empty one stays at the top, title in view).
  useEffect(() => {
    if (hydrated && usePolaris.getState().advisorThread.length) window.scrollTo({ top: document.body.scrollHeight });
  }, [hydrated]);

  // Follow the conversation while the user is near the bottom (nothing to follow before it starts).
  useEffect(() => {
    if (threadLength === 0 && streaming === null) return;
    const nearBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 240;
    if (nearBottom) window.scrollTo({ top: document.body.scrollHeight });
  }, [threadLength, streaming]);

  if (!hydrated) return <ChatSkeleton />;

  const empty = threadLength === 0 && streaming === null;
  const mood = streaming === null ? "idle" : streaming === "" ? "thinking" : "talking";

  return (
    <div className="flex min-h-[calc(100dvh-11rem)] flex-col lg:min-h-[calc(100dvh-6rem)]">
      <header className="mb-6 flex items-center gap-3">
        <Mascot size={56} mood={mood} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Ask {name}</h1>
          <p className="text-xs text-muted sm:text-sm">Your business guide, powered by NVIDIA Nemotron</p>
        </div>
        {!empty && (
          <button
            type="button"
            onClick={() => {
              startNewChat();
              window.scrollTo({ top: 0 });
            }}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium text-muted ring-1 ring-line transition-[transform,background-color,color] duration-150 ease-out hover:bg-fg/[0.06] hover:text-ink active:scale-[0.97]"
          >
            <RotateCcw className="size-3.5" aria-hidden /> New chat
          </button>
        )}
      </header>

      <div className="flex-1" aria-live="polite">
        {empty ? (
          <div className="flex flex-col items-center pt-2 text-center sm:pt-6">
            <Mascot size={150} greet />
            <h2 className="mt-2 text-2xl font-bold tracking-tight">What&apos;s on your mind, {profile.ownerName}?</h2>
            <p className="mt-2 max-w-md text-sm text-muted">
              Tell me what went wrong or what you want to sort out. I&apos;ll find the weak spot and give you a plan you
              can turn into missions.
            </p>
            <div className="mt-8 grid w-full gap-2.5 text-left sm:grid-cols-2">
              {STARTERS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => void sendAdvisorMessage(s.prompt, PAGE)}
                  className="group flex items-center gap-3 rounded-2xl bg-fg/[0.03] px-4 py-3.5 ring-1 ring-line transition-[transform,background-color,box-shadow] duration-150 ease-out hover:bg-fg/[0.07] hover:ring-orbit-400/40 active:scale-[0.99]"
                >
                  <s.icon className="size-5 shrink-0 text-orbit-400 group-hover:text-star-300" aria-hidden />
                  <span className="text-sm font-medium">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ChatThread />
        )}
      </div>

      <ChatComposer page={PAGE} className="sticky bottom-20 mt-6 lg:bottom-6" />
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      <div className="h-14 w-56 animate-pulse rounded-2xl bg-fg/[0.04]" />
      <div className="mx-auto mt-10 size-32 animate-pulse rounded-full bg-fg/[0.04]" />
      <div className="grid gap-2.5 sm:grid-cols-2">
        {[0, 1, 2, 3].map((n) => (
          <div key={n} className="h-14 animate-pulse rounded-2xl bg-fg/[0.04]" />
        ))}
      </div>
    </div>
  );
}
