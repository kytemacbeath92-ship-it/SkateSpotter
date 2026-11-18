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
import type { RouteInfo, Spot } from "@/lib/types";

export default function FindPage() {
  return (
    <Suspense fallback={<div className="p-6 text-mute">Loading spots…</div>}>
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

  async function loadRoute(spot: Spot, from = here, mode = profile) {
    setSelected(spot);
    setError("");
    if (!from) {
      setRoute(null);
      setError("Turn on GPS or tap the map to set your start point, then pick a spot.");
      return;
    }
    setBusy(true);
    try {
      const data = await api<RouteInfo>(
        `/api/geo/route?fromLat=${from.lat}&fromLng=${from.lng}&toLat=${spot.lat}&toLng=${spot.lng}&profile=${mode}`,
      );
      setRoute(data);
    } catch (err) {
      setRoute(null);
      setError(err instanceof Error ? err.message : "Could not build a route");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!selected) return;
    const delay = tracking ? 2000 : 200;
    const timer = setTimeout(() => {
      void loadRoute(selected, here, profile);
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
    <div className="grid gap-4 p-4 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="overflow-hidden rounded-3xl border border-line bg-elev">
        <div className="h-[46vh] min-h-[260px] lg:h-[calc(100dvh-10rem)]">
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
      <section className="space-y-4">
        <div>
          <h1 className="font-display text-5xl leading-none">Find Location</h1>
          <p className="mt-1 text-sm text-mute">
            Search logged spots, then use GPS for the quickest route.
          </p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a spot, street, or building…"
          className="w-full rounded-full border border-line bg-elev px-5 py-3 outline-none placeholder:text-mute"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={pinpoint}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-line bg-panel px-3 py-2 text-sm"
          >
            <LocateFixed size={16} />
            Use GPS
          </button>
          {(["cycling", "walking", "driving"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setProfile(mode)}
              className={`rounded-full px-3 py-2 text-xs uppercase tracking-widest ${
                profile === mode ? "bg-blaze text-ink" : "border border-line text-mute"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        {selected && route ? (
          <div className="rounded-3xl border border-blaze/40 bg-panel p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-gold">Quickest route</div>
            <div className="mt-1 font-display text-3xl leading-none">{selected.name}</div>
            <p className="mt-2 text-sm">
              {formatDistance(route.distanceMeters)} · {formatDuration(route.durationSeconds)}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setTracking(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-blaze px-3 py-2 text-sm text-ink"
              >
                <Navigation size={16} />
                {tracking ? "Tracking GPS" : "Track this spot"}
              </button>
              <a
                href={googleMapsDir(selected, here)}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-line px-3 py-2 text-sm"
              >
                Maps
              </a>
            </div>
            <ol className="mt-3 max-h-40 space-y-1 overflow-auto text-sm text-mute">
              {route.steps.slice(0, 12).map((step, index) => (
                <li key={index}>
                  {step.instruction} · {formatDistance(step.distanceMeters)}
                </li>
              ))}
            </ol>
            <Link href={`/spots/${selected.id}`} className="mt-3 inline-block text-sm text-gold">
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
              className={`flex w-full items-center gap-3 rounded-3xl border p-2 text-left ${
                selected?.id === spot.id ? "border-blaze bg-elev" : "border-line bg-panel"
              }`}
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-ink">
                {spot.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={spot.coverUrl} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0">
                <div className="truncate font-display text-2xl leading-none">{spot.name}</div>
                <p className="truncate text-xs text-mute">{spot.streetAddress}</p>
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
