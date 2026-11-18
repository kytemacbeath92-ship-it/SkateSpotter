"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, MapPin, Plus } from "lucide-react";

const tabs = [
  { href: "/", label: "Spots", icon: MapPin },
  { href: "/add", label: "Add", icon: Plus },
  { href: "/find", label: "Find", icon: Compass },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="min-h-dvh">
      <div className="grain" />
      <header className="sticky top-0 z-30 border-b border-line bg-ink/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="leading-none">
            <div className="font-display text-3xl tracking-wide text-paper">SKATESPOTTER</div>
            <div className="mt-0.5 text-[11px] uppercase tracking-[0.28em] text-mute">
              log it · skate it · share it
            </div>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl pb-28">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-ink/92 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-3 px-2 py-2">
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
                className={`flex flex-col items-center gap-1 rounded-2xl py-1.5 text-[11px] uppercase tracking-[0.16em] ${
                  add
                    ? "text-blaze"
                    : active
                      ? "text-paper"
                      : "text-mute"
                }`}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    add ? "bg-blaze text-ink" : active ? "bg-elev text-paper" : "bg-transparent"
                  }`}
                >
                  <Icon size={18} strokeWidth={2.2} />
                </span>
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
