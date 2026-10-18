import type { Metadata } from "next";
import { Treasury } from "@/components/treasury/Treasury";
import { ComputerRoom } from "@/components/world/Rooms";

export const metadata: Metadata = { title: "Treasury" };

export default function TreasuryPage() {
  return (
    <ComputerRoom>
      <Treasury />
    </ComputerRoom>
  );
}