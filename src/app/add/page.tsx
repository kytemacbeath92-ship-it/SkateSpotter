"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, LocateFixed, MapPin } from "lucide-react";
import MapView from "@/components/MapView";
import { api } from "@/lib/client/api";
import { getGps, type Coord } from "@/lib/client/geo";
import { formatCoordAddress } from "@/lib/geo";
import { fileToDataUrl } from "@/lib/client/image";
import { PHOTO_CAP } from "@/lib/limits";
import type { Spot } from "@/lib/types";

type DraftPhoto = { dataUrl: string; caption: string };

export default function AddPage() {
  const router = useRouter();
  const [pin, setPin] = useState<Coord | null>(null);
  const [here, setHere] = useState<Coord | null>(null);
  const [address, setAddress] = useState("");
  const [building, setBuilding] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Use GPS or tap the map to lock the spot.");
  const [error, setError] = useState("");

  function lookup(coord: Coord) {
    setPin(coord);
    setAddress(formatCoordAddress(coord.lat, coord.lng));
    setBuilding(null);
    setStatus("Location locked. Type a street or building name if you know it, then log it.");
  }

  async function addLocation() {
    setError("");
    setBusy(true);
    try {
      const coord = await getGps();
      setHere(coord);
      lookup(coord);
    } catch (err) {
      setStatus("GPS is off or blocked. Tap the map to drop a pin, then drag it if you need to.");
      setError(
        err instanceof Error
          ? `${err.message}. Tap the map to drop a pin instead.`
          : "Could not read GPS. Tap the map to drop a pin.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onPhotos(files: FileList | null) {
    if (!files) return;
    const next: DraftPhoto[] = [];
    for (const file of Array.from(files).slice(0, PHOTO_CAP - photos.length)) {
      next.push({ dataUrl: await fileToDataUrl(file), caption: "" });
    }
    setPhotos((list) => [...list, ...next].slice(0, PHOTO_CAP));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!pin) {
      setError("Add a location with GPS or tap the map first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await api<{ spot: Spot }>("/api/spots", {
        method: "POST",
        body: JSON.stringify({
          lat: pin.lat,
          lng: pin.lng,
          description,
          streetAddress: address,
          buildingName: building,
          photos,
        }),
      });
      router.push(`/spots/${data.spot.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log this spot");
      setBusy(false);
    }
  }

  const name = building || address || "Waiting for a pin";

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 p-3 sm:p-4 lg:grid lg:grid-cols-[1.15fr_0.85fr] lg:gap-4">
      <section className="space-y-3 lg:order-2">
        <div>
          <h1 className="font-display text-4xl leading-none sm:text-5xl">Add a spot</h1>
          <p className="mt-1 text-sm text-mute">{status}</p>
        </div>
        <button
          type="button"
          onClick={addLocation}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-blaze px-4 text-base font-medium text-ink"
        >
          <LocateFixed size={18} />
          {busy ? "Pinpointing…" : "Add Location"}
        </button>
        {error ? <p className="text-sm text-blaze">{error}</p> : null}
      </section>
      <section className="overflow-hidden rounded-2xl border border-line bg-elev sm:rounded-3xl lg:order-1 lg:row-span-2">
        <div className="h-[34vh] min-h-[200px] max-h-[280px] lg:h-[calc(100dvh-10rem)] lg:max-h-none">
          <MapView
            spots={[]}
            center={pin || here || { lat: 40.73061, lng: -73.935242 }}
            zoom={pin ? 17 : 12}
            userLocation={here}
            pin={pin}
            pickable
            onPick={lookup}
          />
        </div>
      </section>
      <section className="space-y-3 lg:order-3 lg:col-start-2">
        <div className="rounded-2xl border border-line bg-panel p-4 sm:rounded-3xl">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-mute">
            <MapPin size={14} /> Pin
          </div>
          <div className="mt-2 break-words font-display text-3xl leading-none">{name}</div>
          <label className="mt-3 block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-mute">Street or building</span>
            <input
              value={building ?? address}
              onChange={(e) => {
                const value = e.target.value;
                if (!pin) return;
                if (!value.trim() || value === formatCoordAddress(pin.lat, pin.lng)) {
                  setBuilding(null);
                  setAddress(formatCoordAddress(pin.lat, pin.lng));
                  return;
                }
                setBuilding(value);
              }}
              placeholder="Love Park, south ledges…"
              className="min-h-12 w-full rounded-full border border-line bg-ink px-4 text-base outline-none"
            />
          </label>
          <p className="mt-2 text-xs text-mute">
            This name stays until someone else logs a common name for the spot. Location stays on-device until you
            post it.
          </p>
        </div>
        <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-line bg-elev px-4 text-base">
          <Camera size={18} />
          {photos.length >= PHOTO_CAP ? "Spot photo limit reached" : "Add Photos"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={photos.length >= PHOTO_CAP}
            onChange={(e) => onPhotos(e.target.files)}
          />
        </label>
        <p className="text-xs text-mute">
          Up to {PHOTO_CAP} photos when you log the spot. Trick photos have a separate {PHOTO_CAP}-photo cap after
          it is posted.
        </p>
        {photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, index) => (
              <div key={index} className="overflow-hidden rounded-2xl border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.dataUrl} alt="" className="aspect-square w-full object-cover" />
                {index === 0 ? (
                  <div className="bg-gold px-2 py-1 text-center text-[10px] uppercase tracking-widest text-ink">
                    Default cover
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-mute">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Ledgers, cops, best time of day, how to get in…"
            className="w-full rounded-2xl border border-line bg-elev px-4 py-3 text-base outline-none placeholder:text-mute"
          />
        </label>
        <div className="sticky bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-20 bg-gradient-to-t from-ink via-ink to-transparent pt-3">
          <button
            type="submit"
            disabled={busy}
            className="min-h-12 w-full rounded-full bg-paper text-base font-medium text-ink disabled:opacity-60"
          >
            {busy ? "Logging…" : "Log this spot"}
          </button>
        </div>
      </section>
    </form>
  );
}
