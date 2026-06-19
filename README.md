# Digital Painting Kiosk

A museum kiosk for making digital paintings. A visitor paints on a full-screen
canvas, saves the result to a shared gallery, and emails the finished piece to
themselves as a take-home keepsake.

Built with Next.js (App Router), p5.js (instance mode) for the canvas, Prisma +
Postgres for metadata, Vercel Blob for the PNGs, and Resend for email.

## Visitor loop

1. **Paint** — full-screen p5 canvas with brush, eraser, colour, size and
   spacing controls (`/`).
2. **Save** — the canvas is captured as a PNG, uploaded to Blob, and a row is
   written to Postgres (`POST /api/artworks`). Re-opening a saved piece and
   saving again updates it in place (`PATCH /api/artworks/[id]`).
3. **Browse** — every saved piece appears in the gallery (`/gallery`) and on its
   own detail page (`/artwork/[id]`).
4. **Take home** — export the PNG, or email it to yourself (the painting is
   attached and linked).

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values
npx prisma generate
npx prisma db push           # create the Artwork table
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

See `.env.example`. Summary:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string (Neon recommended). |
| `BLOB_READ_WRITE_TOKEN` | yes | Vercel Blob token for storing PNGs. |
| `NEXT_PUBLIC_APP_URL` | recommended | Base URL used for the link inside emails. |
| `RESEND_API_KEY` | for email | Resend API key. If unset, the email endpoint returns 503 and everything else still works. |
| `EMAIL_FROM` | for email | From address. Must be a verified Resend domain in production. |

## Architecture notes

- **Canvas** — `sketches/paintingSketch.ts` runs p5 in instance mode at
  `pixelDensity(1)` so the on-screen canvas, the exported PNG, and the reloaded
  image stay 1:1. `components/PaintingCanvas.tsx` mounts it and guards against
  React Strict Mode double-mounts.
- **Image proxy** — `GET /api/artworks/[id]/image` serves Blob images from the
  same origin so the canvas can reload a saved piece without CORS tainting, and
  so `download` works for the gallery export buttons.
- **Design tokens** — all colours, radius and font live in `@theme` in
  `app/globals.css` and are used via Tailwind utilities (`bg-surface`,
  `text-ink`, `rounded-control`, …). Change a token to restyle the whole app.
- **Determinism** — dates are formatted with `formatArtworkDate` (fixed locale +
  UTC) to avoid hydration mismatches; titles are normalised server-side with
  `sanitizeArtworkTitle`.

## Deploy

1. Provision Postgres (Neon), Vercel Blob, and a Resend account.
2. Set the environment variables above in the hosting provider.
3. Run `npx prisma db push` against the production database once.
4. Build with `npm run build` / deploy (Vercel: import the repo and add the env
   vars). Set `NEXT_PUBLIC_APP_URL` to the deployed URL.
