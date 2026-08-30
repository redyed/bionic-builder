# Bionic Builder

Static site for [thebionicbuilder.com](https://thebionicbuilder.com) — built with Astro and Tailwind.

## Stack

- Astro (static output)
- Tailwind CSS v4
- Fontsource: Archivo + Source Serif 4

## Pages

- `/` — homepage
- `/setups` — Setup №1 article
- `/now` — weekly value ledger

## Development

```bash
npm install
npm run dev
```

## Before deploy

1. Set `FORM_ACTION_URL` in `src/components/EmailBlock.astro` to your email provider endpoint.
2. Drop generated images into `public/images/` (see build directive for filenames).
3. Add founder-supplied screenshots: `receipt-real.webp`, `tv-desktop.webp`.

## Deploy

Push to GitHub → Vercel.
