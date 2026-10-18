import type { Metadata } from "next";
import { Studio } from "@/components/studio/Studio";
import { StudioDoorway } from "@/components/world/Rooms";

export const metadata: Metadata = { title: "Creative Studio" };

export default function StudioPage() {
  return (
    <StudioDoorway>
      <Studio />
    </StudioDoorway>
  );
}