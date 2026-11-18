# SkateSpotter

Social app for logging skate spots, sharing photos, and finding the fastest way there.

## What it does

- **Add Location** uses GPS (or a map pin) to lock a spot, then reverse-geocodes the street or building name.
- **Add Photos** and a **Description** box live on the same screen. The first photo becomes the default cover until the original logger approves a change.
- **Find Location** searches every logged spot and plots the quickest GPS route (bike, walk, or drive).
- The spot name stays the street address or building name until someone else logs a common name.
- Opening a spot shows everything people have shared: description, photos, trick photos, likes, comments, and share links.
- Trick photos have Instagram-style **Like**, **Comment**, and **Share**. The most liked trick photo of the current week is pinned as **Trick Of The Week**.

## Local

```bash
npm install
env -u DATABASE_URL npm run dev
```

Open http://127.0.0.1:3000. Local data lives in PGlite (in memory). A published app uses its own Postgres database.
