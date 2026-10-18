"use client";

import { AiError, streamChat } from "./ai/client";
import { parseAdvisorReply } from "./ai/shared";
import { newId, usePolaris } from "./store";
import type { AdvisorMessage } from "./types";

// One conversation shared by the Advisor page and the mascot panel, so a reply keeps
// streaming (and the mascot keeps talking) when the user switches between them.
let controller: AbortController | null = null;

/** Sends a message to the advisor and streams the reply into the shared thread. */
export async function sendAdvisorMessage(text: string, page?: string) {
  const state = usePolaris.getState();
  const content = text.trim();
  if (!content || state.chatStreaming !== null) return;

  const userMsg: AdvisorMessage = { id: newId(), role: "user", content };
  const history = [...state.advisorThread, userMsg]
    .filter((m) => !m.error)
    .map((m) => ({ role: m.role, content: m.content }));
  state.addAdvisorMessage(userMsg);

  controller = new AbortController();
  const signal = controller.signal;
  state.setChatStreaming("");
  let latest = "";

  try {
    latest = await streamChat({
      messages: history,
      page,
      signal,
      onText: (t) => {
        latest = t;
        usePolaris.getState().setChatStreaming(t);
      },
    });
    const { area, body } = parseAdvisorReply(latest);
    usePolaris.getState().addAdvisorMessage({ id: newId(), role: "assistant", content: body || latest, area });
  } catch (err) {
    const { area, body } = parseAdvisorReply(latest);
    if (signal.aborted) {
      if (body) usePolaris.getState().addAdvisorMessage({ id: newId(), role: "assistant", content: body, area });
    } else {
      usePolaris.getState().addAdvisorMessage({
        id: newId(),
        role: "assistant",
        content: err instanceof AiError ? err.message : "I couldn't connect just now. Check your connection and try again.",
        error: true,
      });
    }
  } finally {
    controller = null;
    usePolaris.getState().setChatStreaming(null);
  }
}

export function stopAdvisor() {
  controller?.abort();
}

export function newAdvisorChat() {
  controller?.abort();
  usePolaris.getState().clearAdvisorThread();
}
