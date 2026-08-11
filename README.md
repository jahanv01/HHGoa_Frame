# HH Goa 2026 — PFP Frame Generator

**Team HackWave** — Jahanvi Panchal, Mansi Kotkar, Mayank Garasiya

Submission for the HH Goa 2026 Shortlisting Task: Frame / ID Card
Generator — **Format A (PFP Frame/Overlay)** only.

Upload a photo, get back a branded circular "tuner/signal" frame,
download it, or share a link whose X/Twitter link preview shows the
actual generated image — not a generic placeholder.

## What it does

1. Upload a photo (JPG, PNG, HEIC/HEIF from iPhone — converted to JPEG
   client-side before anything else touches it).
2. Drag to reposition and zoom inside the frame's circular window —
   works for portrait, landscape, and off-center photos; the crop
   always fills the circle, never stretches.
3. The frame renders instantly in the browser (Canvas API) — no
   server round trip, no loading screen.
4. Download the real PNG file, or hit **Broadcast to X** for a
   pre-filled tweet with the `#FrameInGoa` caption and a link whose
   preview card shows the actual generated frame.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router), React 18 |
| Image rendering | Client-side Canvas API — composited instantly in the browser, no server round trip |
| Storage / sharing | Vercel Blob — stores the finished PNG so the `/s/[id]` page can serve a dynamic `og:image` for X link previews |
| Photo conversion | heic2any (client-side HEIC/HEIF → JPEG, for iPhone photos) |
| Background animation | Plain CSS/SVG (transform/opacity only — no canvas, no animation-frame loop) |
| Testing | Node's built-in test runner (`node --test`) |
| Linting | ESLint (`eslint-config-next`) |
| CI | GitHub Actions — lint, tests, and a production build on every push |

## Local setup

```bash
npm install
```

Create a Vercel Blob store (Vercel dashboard → Storage → Blob →
Create), then pull the token locally:

```bash
vercel env pull .env.local
```

This gives you `BLOB_READ_WRITE_TOKEN` in `.env.local`, which
`@vercel/blob`'s calls use automatically — no extra config needed.
Without this token, the app still runs and the frame still generates
(that part is entirely client-side) — only the **Share to X** step
needs it, since that's what uploads the result to Blob storage.

```bash
npm run dev
```

Before pushing any change:

```bash
npm run check   # lint + tests + production build
```

## Deploy

```bash
vercel deploy
```

Vercel auto-detects Next.js. Make sure the Blob store is attached to
the project (Project → Storage → connect your Blob store) so
`BLOB_READ_WRITE_TOKEN` is set in production too.
