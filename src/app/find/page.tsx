"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LocateFixed, Navigation } from "lucide-react";
import MapView from "@/components/MapView";
import { api } from "@/lib/client/api";
import {
  formatDistance,
  formatDuration,
  getGps,
  googleMapsDir,
  watchGps,
  type Coord,
} from "@/lib/client/geo";
import { localRoute } from "@/lib/geo";
import { spotMetaLine } from "@/lib/spotMeta";
import type { RouteInfo, Spot } from "@/lib/types";

export default function FindPage() {
  return (
    <Suspense fallback={<div className="p-4 text-mute">Loading spots…</div>}>
      <FindPageInner />
    </Suspense>
  );
}

function FindPageInner() {
  const searchParams = useSearchParams();
  const presetSpot = searchParams.get("spot");
  const [query, setQuery] = useState("");
  const [spots, setSpots] = useState<Spot[]>([]);
  const [here, setHere] = useState<Coord | null>(null);
  const [selected, setSelected] = useState<Spot | null>(null);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [profile, setProfile] = useState<"cycling" | "walking" | "driving">("cycling");
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (here) {
      params.set("lat", String(here.lat));
      params.set("lng", String(here.lng));
    }
    const handle = setTimeout(() => {
      api<{ spots: Spot[] }>(`/api/spots?${params.toString()}`)
        .then((data) => setSpots(data.spots))
        .catch((err) => setError(err.message));
    }, 180);
    return () => clearTimeout(handle);
  }, [query, here]);

  useEffect(() => {
    getGps()
      .then(setHere)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!presetSpot || selected?.id === presetSpot) return;
    const match = spots.find((s) => s.id === presetSpot);
    if (match) setSelected(match);
  }, [presetSpot, spots, selected?.id]);

  useEffect(() => {
    if (!tracking) return;
    return watchGps(setHere, (err) => setError(err.message));
  }, [tracking]);

  function loadRoute(spot: Spot, from = here, mode = profile) {
    setSelected(spot);
    setError("");
    if (!from) {
      setRoute(null);
      setError("Turn on GPS or tap the map to set your start point, then pick a spot.");
      return;
    }
    setRoute(localRoute(from, { lat: spot.lat, lng: spot.lng }, mode));
  }

  useEffect(() => {
    if (!selected) return;
    const delay = tracking ? 2000 : 200;
    const timer = setTimeout(() => {
      loadRoute(selected, here, profile);
    }, delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, here, profile, tracking]);

  async function pinpoint() {
    setBusy(true);
    try {
      const coord = await getGps();
      setHere(coord);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read GPS. Tap the map to set a start point.");
    } finally {
      setBusy(false);
    }
  }

  const center = useMemo(() => {
    if (selected) return { lat: selected.lat, lng: selected.lng };
    if (here) return here;
    if (spots[0]) return { lat: spots[0].lat, lng: spots[0].lng };
    return { lat: 40.73061, lng: -73.935242 };
  }, [here, selected, spots]);

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4 lg:grid lg:grid-cols-[1.15fr_0.85fr] lg:gap-4">
      <section className="space-y-3 lg:order-2">
        <div>
          <h1 className="font-display text-4xl leading-none sm:text-5xl">Find Location</h1>
          <p className="mt-1 text-sm text-mute">Search a spot, then use GPS for the quickest route.</p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a spot, street, or building…"
          className="min-h-12 w-full rounded-full border border-line bg-elev px-4 text-base outline-none placeholder:text-mute"
        />
        <button
          type="button"
          onClick={pinpoint}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-line bg-panel px-4 text-base"
        >
          <LocateFixed size={18} />
          Use GPS
        </button>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: "cycling", label: "Skating" },
              { id: "walking", label: "Walking" },
              { id: "driving", label: "Driving" },
            ] as const
          ).map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setProfile(mode.id)}
              className={`min-h-11 rounded-full text-xs uppercase tracking-widest ${
                profile === mode.id ? "bg-blaze text-ink" : "border border-line text-mute"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-line bg-elev sm:rounded-3xl lg:order-1 lg:row-span-2">
        <div className="h-[34vh] min-h-[200px] max-h-[280px] lg:h-[calc(100dvh-10rem)] lg:max-h-none">
          <MapView
            spots={spots}
            center={center}
            userLocation={here}
            selectedId={selected?.id}
            route={route?.geometry}
            onPick={(coord) => {
              setHere(coord);
              setError("");
            }}
            onSelect={(id) => {
              const spot = spots.find((s) => s.id === id);
              if (spot) setSelected(spot);
            }}
          />
        </div>
      </section>
      <section className="space-y-3 lg:order-3 lg:col-start-2">
        {selected && route ? (
          <div className="rounded-2xl border border-blaze/40 bg-panel p-4 sm:rounded-3xl">
            <div className="text-xs uppercase tracking-[0.2em] text-gold">Quickest route</div>
            <div className="mt-1 break-words font-display text-3xl leading-none">{selected.name}</div>
            {spotMetaLine(selected) ? (
              <p className="mt-1 text-xs uppercase tracking-widest text-gold">{spotMetaLine(selected)}</p>
            ) : null}
            <p className="mt-2 text-sm">
              {formatDistance(route.distanceMeters)} · {formatDuration(route.durationSeconds)}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setTracking(true)}
                className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-blaze px-3 text-sm text-ink"
              >
                <Navigation size={16} />
                {tracking ? "Tracking GPS" : "Track this spot"}
              </button>
              <a
                href={googleMapsDir(selected, here)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 min-w-16 items-center justify-center rounded-full border border-line px-3 text-sm"
              >
                Maps
              </a>
            </div>
            <ol className="mt-3 max-h-32 space-y-1 overflow-auto text-sm text-mute">
              {route.steps.slice(0, 12).map((step, index) => (
                <li key={index}>
                  {step.instruction} · {formatDistance(step.distanceMeters)}
                </li>
              ))}
            </ol>
            <Link href={`/spots/${selected.id}`} className="mt-3 inline-flex min-h-11 items-center text-sm text-gold">
              Open spot details
            </Link>
          </div>
        ) : null}
        {error ? <p className="text-sm text-blaze">{error}</p> : null}
        <div className="space-y-2">
          {spots.map((spot) => (
            <button
              key={spot.id}
              type="button"
              onClick={() => setSelected(spot)}
              className={`flex min-h-[4.5rem] w-full items-center gap-3 rounded-2xl border p-2 text-left sm:rounded-3xl ${
                selected?.id === spot.id ? "border-blaze bg-elev" : "border-line bg-panel"
              }`}
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink">
                {spot.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={spot.coverUrl} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0">
                <div className="truncate font-display text-[1.55rem] leading-none">{spot.name}</div>
                <p className="truncate text-xs text-mute">{spot.streetAddress}</p>
                {spotMetaLine(spot) ? (
                  <p className="truncate text-xs uppercase tracking-widest text-gold">{spotMetaLine(spot)}</p>
                ) : null}
                {spot.distanceMeters != null ? (
                  <p className="text-xs text-gold">{formatDistance(spot.distanceMeters)}</p>
                ) : null}
              </div>
            </button>
          ))}
          {spots.length === 0 && !busy ? (
            <p className="text-sm text-mute">No matching spots. Log one from Add.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
