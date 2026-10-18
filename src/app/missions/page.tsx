import type { Metadata } from "next";
import { MissionsBoard } from "@/components/missions/MissionsBoard";
import { BoardRoom } from "@/components/world/Rooms";

export const metadata: Metadata = { title: "Missions" };

export default function MissionsPage() {
  return (
    <BoardRoom>
      <MissionsBoard />
    </BoardRoom>
  );
}