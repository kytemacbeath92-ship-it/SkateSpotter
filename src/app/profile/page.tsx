"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { RIDE_LABELS, type Ride } from "@/lib/limits";
import type { Viewer } from "@/lib/types";

export default function ProfilePage() {
  const [me, setMe] = useState<Viewer | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Viewer>("/api/me")
      .then(setMe)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load profile"));
  }, []);

  if (!me) {
    return <div className="p-4 text-mute">{error || "Loading profile…"}</div>;
  }

  const ride = me.ride && me.ride in RIDE_LABELS ? RIDE_LABELS[me.ride as Ride] : "—";

  return (
    <div className="space-y-4 p-4">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-gold">Your profile</p>
        <h1 className="mt-1 font-display text-4xl leading-none sm:text-5xl">{me.name}</h1>
        <p className="mt-2 text-sm text-mute">This screen name is what other riders see on spots and comments.</p>
      </div>
      <dl className="space-y-3 rounded-2xl border border-line bg-panel p-4 sm:rounded-3xl">
        <Row label="Name" value={me.fullName || "—"} />
        <Row label="Age" value={me.age != null ? String(me.age) : "—"} />
        <Row label="City" value={me.city || "—"} />
        <Row label="Country" value={me.country || "—"} />
        <Row label="Email or phone" value={me.contact || "—"} />
        <Row label="Riding" value={ride} />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.2em] text-mute">{label}</dt>
      <dd className="mt-1 text-base">{value}</dd>
    </div>
  );
}
