"use client";

import { FormEvent, useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { api } from "@/lib/client/api";
import type { Viewer } from "@/lib/types";

export default function ScreenName() {
  const [name, setName] = useState("Skater");
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Viewer>("/api/me")
      .then((me) => {
        setName(me.name);
        setDraft(me.name);
      })
      .catch(() => undefined);
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const next = await api<Viewer>("/api/me", {
        method: "POST",
        body: JSON.stringify({ name: draft }),
      });
      setName(next.name);
      setDraft(next.name);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save name");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative ml-auto shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-[9.5rem] items-center gap-1.5 rounded-full border border-line bg-elev px-3 py-1.5 text-left"
      >
        <UserRound size={14} className="shrink-0 text-gold" />
        <span className="truncate text-xs uppercase tracking-[0.12em]">{name}</span>
      </button>
      {open ? (
        <form
          onSubmit={save}
          className="absolute right-0 top-full z-40 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-line bg-panel p-3 shadow-lg"
        >
          <p className="text-[11px] uppercase tracking-[0.16em] text-mute">Screen name</p>
          <p className="mt-1 text-xs text-mute">Shown on spots, photos, and comments. Your account ID stays private.</p>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={40}
            className="mt-2 min-h-11 w-full rounded-full border border-line bg-ink px-4 text-sm outline-none"
          />
          {error ? <p className="mt-2 text-xs text-blaze">{error}</p> : null}
          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="min-h-10 flex-1 rounded-full bg-paper text-sm text-ink disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="min-h-10 rounded-full border border-line px-3 text-sm"
            >
              Close
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
