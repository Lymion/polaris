import type { Metadata, Viewport } from "next";
import { Berkshire_Swash, Fredoka, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import { AppShell } from "@/components/shell/AppShell";
import { PREFS_BOOT_SCRIPT } from "@/lib/appearance";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const berkshire = Berkshire_Swash({
  variable: "--font-berkshire",
  weight: "400",
  subsets: ["latin"],
});

// The rounder face used by the Candy theme.
const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Polaris: your North Star for business growth",
    template: "%s · Polaris",
  },
  description:
    "Polaris helps entrepreneurs and small businesses grow with missions, a creative studio, an AI business advisor and cashflow coaching.",
};

export const viewport: Viewport = {
  themeColor: "#050b1c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The prefs script sets data-theme before React hydrates, hence suppressHydrationWarning.
    <html lang="en" className={`${jakarta.variable} ${berkshire.variable} ${fredoka.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full font-sans">
        <AppShell>{children}</AppShell>
        {/* Applies the saved theme before the page paints (injected into <head>). */}
        <Script id="polaris-prefs" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: PREFS_BOOT_SCRIPT }} />
      </body>
    </html>
  );
}
