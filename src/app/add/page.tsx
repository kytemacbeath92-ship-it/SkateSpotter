"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, LocateFixed, MapPin } from "lucide-react";
import MapView from "@/components/MapView";
import { api } from "@/lib/client/api";
import { getGps, type Coord } from "@/lib/client/geo";
import { fileToDataUrl } from "@/lib/client/image";
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
  const [status, setStatus] = useState("Drop a pin or use GPS to lock the spot.");
  const [error, setError] = useState("");

  async function lookup(coord: Coord) {
    setPin(coord);
    setStatus("Reading the street from this pin…");
    try {
      const geo = await api<{ streetAddress: string; buildingName: string | null }>(
        `/api/geo/reverse?lat=${coord.lat}&lng=${coord.lng}`,
      );
      setAddress(geo.streetAddress);
      setBuilding(geo.buildingName);
      setStatus("Location locked. Add photos and a description, then log it.");
    } catch {
      setAddress(`${coord.lat.toFixed(5)}, ${coord.lng.toFixed(5)}`);
      setBuilding(null);
      setStatus("GPS pin saved. Address lookup was unavailable, so coordinates will be used.");
    }
  }

  async function addLocation() {
    setError("");
    setBusy(true);
    try {
      const coord = await getGps();
      setHere(coord);
      await lookup(coord);
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
    for (const file of Array.from(files).slice(0, 6 - photos.length)) {
      next.push({ dataUrl: await fileToDataUrl(file), caption: "" });
    }
    setPhotos((list) => [...list, ...next].slice(0, 6));
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
    <form onSubmit={submit} className="grid gap-4 p-4 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="overflow-hidden rounded-3xl border border-line bg-elev">
        <div className="h-[46vh] min-h-[260px] lg:h-[calc(100dvh-10rem)]">
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
      <section className="space-y-4">
        <div>
          <h1 className="font-display text-5xl leading-none">Add a spot</h1>
          <p className="mt-1 text-sm text-mute">{status}</p>
        </div>
        <button
          type="button"
          onClick={addLocation}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-blaze px-4 py-3 font-medium text-ink"
        >
          <LocateFixed size={18} />
          {busy ? "Pinpointing…" : "Add Location"}
        </button>
        {error ? <p className="text-sm text-blaze">{error}</p> : null}
        <div className="rounded-3xl border border-line bg-panel p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-mute">
            <MapPin size={14} /> Pin
          </div>
          <div className="mt-2 font-display text-3xl leading-none">{name}</div>
          {building && address ? <p className="mt-1 text-sm text-mute">{address}</p> : null}
          <p className="mt-2 text-xs text-mute">
            This street or building name stays until someone else logs a common name for the spot.
          </p>
        </div>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-full border border-line bg-elev px-4 py-3">
          <Camera size={18} />
          Add Photos
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => onPhotos(e.target.files)}
          />
        </label>
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
            rows={5}
            placeholder="Ledgers, cops, best time of day, how to get in…"
            className="w-full rounded-3xl border border-line bg-elev px-4 py-3 outline-none placeholder:text-mute"
          />
        </label>
        {error ? <p className="text-sm text-blaze">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-paper py-3 font-medium text-ink disabled:opacity-60"
        >
          {busy ? "Logging…" : "Log this spot"}
        </button>
      </section>
    </form>
  );
}
