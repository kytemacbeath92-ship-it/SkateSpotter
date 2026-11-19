"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { RIDE_LABELS, RIDES, type Ride } from "@/lib/limits";
import type { Viewer } from "@/lib/types";

export default function CreateProfilePage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [contact, setContact] = useState("");
  const [username, setUsername] = useState("");
  const [ride, setRide] = useState<Ride | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ride) {
      setError("Pick what you ride");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api<Viewer>("/api/me/profile", {
        method: "POST",
        body: JSON.stringify({
          fullName,
          age: Number(age),
          city,
          country,
          contact,
          username,
          ride,
        }),
      });
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create profile");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 p-4">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-gold">First open</p>
        <h1 className="mt-1 font-display text-4xl leading-none sm:text-5xl">Create Profile</h1>
        <p className="mt-2 text-sm text-mute">
          One time. Your screen name is what other riders see. Your account ID stays private.
        </p>
      </div>
      <label className="block">
        <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-mute">Name</span>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoComplete="name"
          required
          className="min-h-12 w-full rounded-full border border-line bg-elev px-4 text-base outline-none"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-mute">Age</span>
        <input
          value={age}
          onChange={(e) => setAge(e.target.value)}
          inputMode="numeric"
          required
          className="min-h-12 w-full rounded-full border border-line bg-elev px-4 text-base outline-none"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-mute">City</span>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            autoComplete="address-level2"
            required
            className="min-h-12 w-full rounded-full border border-line bg-elev px-4 text-base outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-mute">Country</span>
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            autoComplete="country-name"
            required
            className="min-h-12 w-full rounded-full border border-line bg-elev px-4 text-base outline-none"
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-mute">Email or phone</span>
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          autoComplete="email"
          required
          className="min-h-12 w-full rounded-full border border-line bg-elev px-4 text-base outline-none"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-mute">Screen name</span>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={40}
          required
          placeholder="Shown on spots and comments"
          className="min-h-12 w-full rounded-full border border-line bg-elev px-4 text-base outline-none placeholder:text-mute"
        />
      </label>
      <fieldset>
        <legend className="mb-2 text-xs uppercase tracking-[0.2em] text-mute">What are you riding?</legend>
        <div className="grid grid-cols-2 gap-2">
          {RIDES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRide(option)}
              className={`min-h-12 rounded-full text-sm ${
                ride === option ? "bg-blaze text-ink" : "border border-line bg-elev"
              }`}
            >
              {RIDE_LABELS[option]}
            </button>
          ))}
        </div>
      </fieldset>
      {error ? <p className="text-sm text-blaze">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="min-h-12 w-full rounded-full bg-paper text-base font-medium text-ink disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
