"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";
import { ShieldCheck, SwatchBook, type LucideIcon } from "lucide-react";
import { PolarisMark, Wordmark } from "@/components/brand/PolarisMark";
import { MascotDock } from "@/components/mascot/MascotDock";
import { AppearanceDialog } from "@/components/settings/Appearance";
import { YourDataDialog } from "@/components/settings/YourData";
import { WorldShell } from "@/components/world/WorldShell";
import { applyPrefs } from "@/lib/appearance";
import { currencyForCountry } from "@/lib/currency";
import { guessCountry } from "@/lib/locale";
import { useHydrated, usePolaris, useWorld } from "@/lib/store";
import { Celebration } from "./Celebration";
import { LevelBadge } from "./LevelBadge";
import { NAV, isActive } from "./nav";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const onboarded = usePolaris((s) => s.profile.onboarded);
  const prefs = usePolaris((s) => s.prefs);
  const world = useWorld();
  const isWelcome = pathname === "/welcome";
  // The privacy notice is readable before setting up a business (onboarding links to it).
  const isPrivacy = pathname === "/privacy";
  const [panel, setPanel] = useState<"appearance" | "data" | null>(null);

  useEffect(() => {
    if (hydrated && !onboarded && !isWelcome && !isPrivacy) router.replace("/welcome");
  }, [hydrated, onboarded, isWelcome, isPrivacy, router]);

  // Keep <html data-theme> in step with the saved look (the boot script sets it before paint).
  useEffect(() => {
    if (hydrated) applyPrefs(prefs);
  }, [hydrated, prefs]);

  // Currency follows the country. Fill in a missing country from the browser, and replace the
  // "USD" placeholder once the country is known (an explicit choice in Treasury is left alone).
  useEffect(() => {
    if (!hydrated || !onboarded) return;
    const { profile, updateProfile } = usePolaris.getState();
    const country = profile.country || guessCountry();
    const currency = currencyForCountry(country);
    const patch: Partial<typeof profile> = {};
    if (!profile.country && country) patch.country = country;
    if (currency && profile.currency === "USD" && currency !== "USD") patch.currency = currency;
    if (Object.keys(patch).length) updateProfile(patch);
  }, [hydrated, onboarded]);

  if (isWelcome || (isPrivacy && !(hydrated && onboarded))) return <>{children}</>;
  const open = { onAppearance: () => setPanel("appearance"), onData: () => setPanel("data") };
  return (
    <>
      {/* First stop for keyboard users: jumps past the navigation to the page. Hidden until focused. */}
      <a
        href="#main"
        className="fixed left-4 top-3 z-[90] -translate-y-20 rounded-full bg-star-400 px-4 py-2 text-sm font-semibold text-on-accent shadow-lg focus:translate-y-0"
      >
        Skip to content
      </a>
      {world ? (
        <WorldShell {...open}>{children}</WorldShell>
      ) : (
        <ClassicShell pathname={pathname} {...open}>
          {children}
        </ClassicShell>
      )}
      {/* Out here so they stay open when a choice swaps the classic layout for the world, or back. */}
      {panel === "appearance" && <AppearanceDialog onClose={() => setPanel(null)} />}
      {panel === "data" && <YourDataDialog onClose={() => setPanel(null)} />}
    </>
  );
}

interface ShellProps {
  pathname: string;
  onAppearance: () => void;
  onData: () => void;
  children: ReactNode;
}

function ClassicShell({ pathname, onAppearance, onData, children }: ShellProps) {
  return (
    <div className="min-h-dvh lg:pl-64">
      <Sidebar pathname={pathname} onAppearance={onAppearance} onData={onData} />

      <header className="sticky top-0 z-30 flex items-center gap-2.5 border-b border-line bg-surface-950/80 px-4 py-3 backdrop-blur-lg lg:hidden">
        <PolarisMark size={30} />
        <Wordmark className="text-2xl" />
        {/* gap-3 so the buttons' enlarged touch areas don't overlap */}
        <div className="ml-auto flex items-center gap-3">
          <LevelBadge compact />
          <HeaderButton label="Your data" onClick={onData} icon={ShieldCheck} />
          <HeaderButton label="Appearance" onClick={onAppearance} icon={SwatchBook} />
        </div>
      </header>

      {/* Bottom padding leaves room to scroll content clear of the mascot and the mobile tab bar. */}
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 pb-40 pt-6 outline-none sm:px-6 lg:px-10 lg:pb-32 lg:pt-10">
        {children}
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-6">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
                    active ? "text-star-300" : "text-faint hover:text-muted",
                  )}
                >
                  <item.icon className="size-5" aria-hidden />
                  {item.short}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Celebration />
      <MascotDock />
    </div>
  );
}

function HeaderButton({ label, onClick, icon: Icon }: { label: string; onClick: () => void; icon: LucideIcon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="tap-target relative grid size-8 place-items-center rounded-full bg-fg/[0.06] text-muted ring-1 ring-line transition-colors hover:text-ink"
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}

function Sidebar({ pathname, onAppearance, onData }: Omit<ShellProps, "children">) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface-950/60 px-4 py-6 backdrop-blur-xl lg:flex">
      <Link href="/" className="flex items-center gap-3 px-2">
        <PolarisMark size={40} />
        <Wordmark className="text-[2rem]" />
      </Link>

      <nav aria-label="Main" className="mt-10">
        <ul className="space-y-1">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-linear-to-r from-orbit-600/40 to-transparent text-ink ring-1 ring-orbit-500/30"
                      : "text-muted hover:bg-fg/[0.04] hover:text-ink",
                  )}
                >
                  <item.icon
                    className={clsx("size-[18px]", active ? "text-star-300" : "text-faint group-hover:text-muted")}
                    aria-hidden
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto space-y-3">
        <div>
          {[
            { label: "Your data", onClick: onData, icon: ShieldCheck },
            { label: "Appearance", onClick: onAppearance, icon: SwatchBook },
          ].map((b) => (
            <button
              key={b.label}
              type="button"
              onClick={b.onClick}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-fg/[0.04] hover:text-ink"
            >
              <b.icon className="size-[18px] text-faint" aria-hidden /> {b.label}
            </button>
          ))}
        </div>
        <LevelBadge />
      </div>
    </aside>
  );
}
