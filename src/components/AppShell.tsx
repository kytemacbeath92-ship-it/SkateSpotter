"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, MapPin, Plus } from "lucide-react";
import ProfileGate from "@/components/ProfileGate";
import ScreenName from "@/components/ScreenName";

const tabs = [
  { href: "/", label: "Spots", icon: MapPin },
  { href: "/add", label: "Add", icon: Plus },
  { href: "/find", label: "Find", icon: Compass },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const onboarding = path === "/create-profile";
  return (
    <div className="min-h-dvh">
      <div className="grain" />
      <header className="sticky top-0 z-30 border-b border-line bg-ink/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center px-4 py-2.5 md:max-w-6xl">
          <Link href={onboarding ? "/create-profile" : "/"} className="min-w-0 leading-none">
            <div className="font-display text-[1.75rem] tracking-wide text-paper sm:text-3xl">
              SKATESPOTTER
            </div>
            <div className="mt-0.5 text-[11px] leading-tight tracking-wide text-mute">
              Skate it - Log it - Share it
            </div>
          </Link>
          {onboarding ? null : <ScreenName />}
        </div>
      </header>
      <main
        className={`mx-auto w-full max-w-lg md:max-w-6xl ${
          onboarding ? "pb-8" : "pb-[calc(7.5rem+env(safe-area-inset-bottom))]"
        }`}
      >
        <ProfileGate>{children}</ProfileGate>
      </main>
      {onboarding ? null : (
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-3 px-2 pt-1">
          {tabs.map((tab) => {
            const active =
              tab.href === "/"
                ? path === "/" || path.startsWith("/spots/")
                : path.startsWith(tab.href);
            const Icon = tab.icon;
            const add = tab.href === "/add";
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] uppercase tracking-[0.14em] ${
                  add ? "text-blaze" : active ? "text-paper" : "text-mute"
                }`}
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-full ${
                    add ? "bg-blaze text-ink" : active ? "bg-elev text-paper" : "bg-transparent"
                  }`}
                >
                  <Icon size={20} strokeWidth={2.2} />
                </span>
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
      )}
    </div>
  );
}
