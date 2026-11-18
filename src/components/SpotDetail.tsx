"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Camera, Navigation } from "lucide-react";
import MapView from "@/components/MapView";
import PhotoCard from "@/components/PhotoCard";
import { api } from "@/lib/client/api";
import { fileToDataUrl } from "@/lib/client/image";
import { isoWeekStartUtc } from "@/lib/week";
import type { Photo, Spot, Viewer } from "@/lib/types";

type Detail = {
  spot: Spot;
  photos: Photo[];
  tricks: Photo[];
  trickOfTheWeek: Photo | null;
  isOwner: boolean;
};

function pickTrickOfTheWeek(tricks: Photo[]) {
  const start = isoWeekStartUtc().getTime();
  return (
    tricks
      .filter((photo) => new Date(photo.createdAt).getTime() >= start && photo.likeCount >= 1)
      .sort((a, b) => b.likeCount - a.likeCount || +new Date(b.createdAt) - +new Date(a.createdAt))[0] ?? null
  );
}

export default function SpotDetail({
  spotId,
  focusPhotoId,
}: {
  spotId: string;
  focusPhotoId?: string;
}) {
  const [data, setData] = useState<Detail | null>(null);
  const [me, setMe] = useState<Viewer | null>(null);
  const [tab, setTab] = useState<"spot" | "trick">(focusPhotoId ? "trick" : "spot");
  const [commonName, setCommonName] = useState("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    const next = await api<Detail>(`/api/spots/${spotId}`);
    setData(next);
    return next;
  }

  useEffect(() => {
    reload().catch((err) => setError(err.message));
    api<Viewer>("/api/me").then(setMe).catch(() => undefined);
  }, [spotId]);

  useEffect(() => {
    if (!focusPhotoId || !data) return;
    const inTricks = data.tricks.some((p) => p.id === focusPhotoId);
    setTab(inTricks ? "trick" : "spot");
  }, [focusPhotoId, data]);

  const album = useMemo(() => {
    if (!data) return [];
    if (tab === "spot") return data.photos;
    if (data.trickOfTheWeek) {
      return [data.trickOfTheWeek, ...data.tricks.filter((p) => p.id !== data.trickOfTheWeek?.id)];
    }
    return data.tricks;
  }, [data, tab]);

  function patchPhoto(next: Photo) {
    setData((cur) => {
      if (!cur) return cur;
      const map = (list: Photo[]) => list.map((p) => (p.id === next.id ? next : p));
      const tricks = map(cur.tricks);
      return {
        ...cur,
        photos: map(cur.photos),
        tricks,
        trickOfTheWeek: pickTrickOfTheWeek(tricks),
      };
    });
  }

  async function upload(kind: "spot" | "trick", file: File) {
    setBusy(true);
    setError("");
    try {
      const dataUrl = await fileToDataUrl(file);
      await api(`/api/spots/${spotId}/photos`, {
        method: "POST",
        body: JSON.stringify({ kind, dataUrl, caption }),
      });
      setCaption("");
      await reload();
      setTab(kind);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function logCommonName(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<{ spot: Spot }>(`/api/spots/${spotId}/common-name`, {
        method: "POST",
        body: JSON.stringify({ name: commonName }),
      });
      setData((cur) => (cur ? { ...cur, spot: result.spot } : cur));
      setCommonName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log name");
    } finally {
      setBusy(false);
    }
  }

  async function coverAction(action: "request" | "approve" | "reject", photoId?: string) {
    setBusy(true);
    try {
      const result = await api<{ spot: Spot }>(`/api/spots/${spotId}/cover`, {
        method: "POST",
        body: JSON.stringify({ action, photoId }),
      });
      setData((cur) => (cur ? { ...cur, spot: result.spot } : cur));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cover update failed");
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return <div className="p-6 text-mute">{error || "Loading spot…"}</div>;
  }

  const { spot } = data;
  const pendingCover = data.photos.find((p) => p.id === spot.pendingCoverPhotoId);

  return (
    <div className="space-y-4 p-4 pb-8">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="overflow-hidden rounded-3xl border border-line bg-elev">
          <div className="h-64 lg:h-[420px]">
            <MapView
              spots={[{ id: spot.id, lat: spot.lat, lng: spot.lng, name: spot.name }]}
              center={{ lat: spot.lat, lng: spot.lng }}
              zoom={16}
              selectedId={spot.id}
            />
          </div>
        </div>
        <div className="rounded-3xl border border-line bg-panel p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-gold">
            {spot.nameIsCommon ? "Common name" : "Street / building name"}
          </p>
          <h1 className="mt-1 font-display text-5xl leading-none">{spot.name}</h1>
          {spot.nameIsCommon ? (
            <p className="mt-2 text-sm text-mute">{spot.streetAddress}</p>
          ) : (
            <p className="mt-2 text-sm text-mute">
              Waiting for someone else to log a common name. Until then this is the street or building.
            </p>
          )}
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6">
            {spot.description || "No description has been shared yet."}
          </p>
          <p className="mt-3 text-xs text-mute">Logged by {spot.createdByName}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/find?spot=${spot.id}`}
              className="inline-flex items-center gap-2 rounded-full bg-blaze px-4 py-2 text-sm text-ink"
            >
              <Navigation size={16} />
              Find Location
            </Link>
          </div>
          <form onSubmit={logCommonName} className="mt-5 space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-mute">Log a common name</label>
            <div className="flex gap-2">
              <input
                value={commonName}
                onChange={(e) => setCommonName(e.target.value)}
                placeholder="Love Park, The Banks…"
                className="flex-1 rounded-full border border-line bg-ink px-4 py-2 text-sm outline-none"
              />
              <button className="rounded-full bg-paper px-4 py-2 text-sm text-ink">Log</button>
            </div>
            {me?.id === spot.createdBy ? (
              <p className="text-xs text-mute">
                You logged this spot, so a common name sticks only after someone else logs it.
              </p>
            ) : (
              <p className="text-xs text-mute">If this spot has no common name yet, yours becomes the name.</p>
            )}
          </form>
        </div>
      </div>

      {data.isOwner && pendingCover ? (
        <div className="flex items-center gap-3 rounded-3xl border border-gold/40 bg-elev p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pendingCover.url} alt="" className="h-16 w-16 rounded-2xl object-cover" />
          <div className="flex-1 text-sm">
            Someone requested this as the new default photo. The first uploaded photo stays until you approve.
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => coverAction("approve")}
            className="rounded-full bg-gold px-3 py-2 text-sm text-ink"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => coverAction("reject")}
            className="rounded-full border border-line px-3 py-2 text-sm"
          >
            Keep original
          </button>
        </div>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("spot")}
          className={`rounded-full px-4 py-2 text-sm ${tab === "spot" ? "bg-paper text-ink" : "border border-line"}`}
        >
          Spot photos
        </button>
        <button
          type="button"
          onClick={() => setTab("trick")}
          className={`rounded-full px-4 py-2 text-sm ${tab === "trick" ? "bg-paper text-ink" : "border border-line"}`}
        >
          Trick photos
        </button>
      </div>

      <div className="rounded-3xl border border-line bg-elev p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-blaze px-4 py-2 text-sm text-ink">
            <Camera size={16} />
            {tab === "trick" ? "Upload Trick Photo" : "Add Photos"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(tab, file);
              }}
            />
          </label>
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={tab === "trick" ? "What trick was this?" : "Optional caption"}
            className="min-w-56 flex-1 rounded-full border border-line bg-ink px-4 py-2 text-sm outline-none"
          />
        </div>
        {tab === "trick" ? (
          <p className="mt-2 text-xs text-mute">
            The most liked trick photo uploaded this week sits at the top as Trick Of The Week.
          </p>
        ) : (
          <p className="mt-2 text-xs text-mute">
            The first photo becomes the default cover. Later cover changes wait for the original logger’s approval.
          </p>
        )}
      </div>

      {error ? <p className="text-sm text-blaze">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {album.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            badge={
              tab === "trick" && data.trickOfTheWeek?.id === photo.id ? "Trick Of The Week" : undefined
            }
            onChanged={patchPhoto}
            extra={
              tab === "spot" && photo.id !== spot.coverPhotoId ? (
                <button
                  type="button"
                  onClick={() => coverAction("request", photo.id)}
                  className="rounded-full px-3 py-1 text-xs uppercase tracking-widest text-mute"
                >
                  {data.isOwner ? "Make cover" : "Request cover"}
                </button>
              ) : tab === "spot" && photo.id === spot.coverPhotoId ? (
                <span className="px-3 text-xs uppercase tracking-widest text-gold">Default</span>
              ) : null
            }
          />
        ))}
      </div>
      {album.length === 0 ? (
        <p className="text-sm text-mute">
          {tab === "trick" ? "No trick photos yet. Film a clip of the trick and upload it." : "No photos yet."}
        </p>
      ) : null}
    </div>
  );
}
