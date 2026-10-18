import { Suspense } from "react";
import type { Metadata } from "next";
import { AdvisorChat, ChatSkeleton } from "@/components/advisor/AdvisorChat";
import { NookRoom } from "@/components/world/Rooms";

export const metadata: Metadata = { title: "Advisor" };

export default function AdvisorPage() {
  return (
    <NookRoom>
      {/* useSearchParams (for questions sent from other pages) needs a Suspense boundary. */}
      <Suspense fallback={<ChatSkeleton />}>
        <AdvisorChat />
      </Suspense>
    </NookRoom>
  );
}