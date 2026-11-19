"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import type { Viewer } from "@/lib/types";

export default function ProfileGate({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<Viewer>("/api/me")
      .then((me) => {
        if (cancelled) return;
        if (!me.complete && path !== "/create-profile") {
          router.replace("/create-profile");
          return;
        }
        if (me.complete && path === "/create-profile") {
          router.replace("/");
          return;
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [path, router]);

  if (!ready) {
    return <div className="p-4 text-mute">Loading…</div>;
  }
  return <>{children}</>;
}
