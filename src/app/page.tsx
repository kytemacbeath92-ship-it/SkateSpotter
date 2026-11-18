"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MapView from "@/components/MapView";
import { api } from "@/lib/client/api";
import { formatDistance, getGps, type Coord } from "@/lib/client/geo";
import type { Spot } from "@/lib/types";

export default function HomePage() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [here, setHere] = useState<Coord | null>(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    api<{ spots: Spot[] }>("/api/spots")
      .then((data) => setSpots(data.spots))
      .catch((err) => setError(err.message));
    getGps().then(setHere).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!here) return;
    api<{ spots: Spot[] }>(`/api/spots?lat=${here.lat}&lng=${here.lng}`)
      .then((data) => setSpots(data.spots))
      .catch(() => undefined);
  }, [here]);

  const center = useMemo(() => {
    const selected = spots.find((s) => s.id === selectedId);
    if (selected) return { lat: selected.lat, lng: selected.lng };
    if (here) return here;
    if (spots[0]) return { lat: spots[0].lat, lng: spots[0].lng };
    return { lat: 40.73061, lng: -73.935242 };
  }, [here, selectedId, spots]);

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="overflow-hidden rounded-3xl border border-line bg-elev">
        <div className="h-[52vh] min-h-[280px] lg:h-[calc(100dvh-10rem)]">
          <MapView
            spots={spots}
            center={center}
            userLocation={here}
            selectedId={selectedId}
            onSelect={setSelectedId}
            fitToSpots={spots.length > 1 && !selectedId && !here}
          />
        </div>
      </section>
      <section className="space-y-3">
        <div>
          <h1 className="font-display text-5xl leading-none text-paper">Nearby spots</h1>
          <p className="mt-1 text-sm text-mute">
            First photo logged at a spot stays the cover until the original logger approves a change.
          </p>
        </div>
        {error ? <p className="text-sm text-blaze">{error}</p> : null}
        {spots.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line p-6">
            <p className="font-display text-3xl">No spots yet</p>
            <p className="mt-2 text-sm text-mute">
              Drop the first pin. Add photos and a description so the next session can find it.
            </p>
            <Link
              href="/add"
              className="mt-4 inline-flex rounded-full bg-blaze px-4 py-2 text-sm font-medium text-ink"
            >
              Add Location
            </Link>
          </div>
        ) : (
          spots.map((spot) => (
            <Link
              key={spot.id}
              href={`/spots/${spot.id}`}
              onMouseEnter={() => setSelectedId(spot.id)}
              className={`flex gap-3 overflow-hidden rounded-3xl border bg-panel ${
                selectedId === spot.id ? "border-blaze" : "border-line"
              }`}
            >
              <div className="h-28 w-28 shrink-0 bg-ink">
                {spot.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={spot.coverUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-widest text-mute">
                    no photo
                  </div>
                )}
              </div>
              <div className="min-w-0 py-3 pr-3">
                <div className="truncate font-display text-2xl leading-none">{spot.name}</div>
                <p className="mt-1 truncate text-xs text-mute">
                  {spot.nameIsCommon ? spot.streetAddress : "Named from the street until someone logs a common name"}
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-mute">{spot.description || "No description yet."}</p>
                {spot.distanceMeters != null ? (
                  <p className="mt-2 text-xs uppercase tracking-widest text-gold">
                    {formatDistance(spot.distanceMeters)} away
                  </p>
                ) : null}
              </div>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
