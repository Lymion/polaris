import { Compass, MessagesSquare, Package, Palette, Target, Wallet, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  short: string;
  icon: LucideIcon;
}

export const NAV: NavItem[] = [
  { href: "/", label: "Home", short: "Home", icon: Compass },
  { href: "/missions", label: "Missions", short: "Missions", icon: Target },
  { href: "/studio", label: "Creative Studio", short: "Studio", icon: Palette },
  { href: "/advisor", label: "Advisor", short: "Advisor", icon: MessagesSquare },
  { href: "/treasury", label: "Treasury", short: "Treasury", icon: Wallet },
  { href: "/stock", label: "Stock", short: "Stock", icon: Package },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
