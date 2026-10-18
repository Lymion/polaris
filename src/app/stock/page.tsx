import type { Metadata } from "next";
import { Stock } from "@/components/stock/Stock";
import { StockRoom } from "@/components/world/Rooms";

export const metadata: Metadata = { title: "Stock" };

export default function StockPage() {
  return (
    <StockRoom>
      <Stock />
    </StockRoom>
  );
}
