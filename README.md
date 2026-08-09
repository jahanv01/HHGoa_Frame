
# HH Goa 2026 — Signal Frame

Format A submission: upload a photo, get back a branded circular
"tuner/signal" frame, download it, or share a link whose OG preview
shows the actual generated image.

## Why this stack

X reads the `og:image` meta tag server-side before any JS runs, so a
pure client-side (canvas-only) tool cannot satisfy the "link preview
shows the real graphic" requirement. This app renders the image on the
server (`/api/generate`), stores it in Vercel Blob, and serves a
per-user share page (`/s/[id]`) with dynamic OG metadata pointing at
that stored image — the same pattern the reference sites you linked
use.

## Local setup

```bash
npm install
```

Create a Vercel Blob store (Vercel dashboard → Storage → Blob → Create),
then pull the token locally:

```bash
vercel env pull .env.local
```

This gives you `BLOB_READ_WRITE_TOKEN` in `.env.local`, which
`@vercel/blob`'s `put`/`head` calls use automatically — no extra config
needed.

```bash
npm run dev
```

## Deploy

```bash
vercel deploy
```

Vercel auto-detects Next.js. Make sure the Blob store is attached to
the project (Project → Storage → connect your Blob store) so
`BLOB_READ_WRITE_TOKEN` is set in production too.

## What's implemented vs. what's a stub

- Photo upload, HEIC→JPEG client-side conversion, circular cover-fit
  crop (handles portrait/landscape/off-center — the crop always fills
  the circle, never stretches).
- Server-side render via `@napi-rs/canvas` (no native build step
  headaches on Vercel).
- Download button (real PNG file).
- Share-to-X button: opens a pre-filled tweet with the caption and
  `#FrameInGoa`, linking to the `/s/[id]` page whose OG image is the
  generated PNG.

Known gaps to close before submitting:
- No rate limiting / abuse protection on `/api/generate` — fine for a
  hackathon demo, not for real traffic.
- The "Name" field for Format B isn't here since this is Format A
  only, per your ask.
- Test the HEIC path on an actual iPhone — the conversion library
  behaves inconsistently across iOS Safari versions; have a JPG
  fallback ready.
- `test-render.png` in `/scripts` was the local proof-of-concept
  render used to validate the design before wiring it into the API
  route — not part of the deployed app.
=======
# HHGoa_Frame

