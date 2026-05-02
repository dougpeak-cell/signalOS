This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment Setup

The repo-level environment contract lives in `.env.local.example`.

Create `.env.local` from that file and fill in only the values you need for your local workflow. This keeps Supabase, Sigi provider, Stripe billing, market data, and ingest settings in one place.

## Sigi AI Provider

The shell Sigi assistant always works with the built-in today-context engine.

## Sigi Mascot Asset

The Sigi mascot asset at `public/sigi-mascot.svg` is an original SVG created specifically for SignalOS during the April 2026 Sigi assistant redesign.

Provenance and authorship:

- Created in-repository by GitHub Copilot using GPT-5.4 at the direction of the SignalOS repository owner.
- Replaces the earlier untracked mascot draft with a new original design.

License:

- Copyright (c) 2026 SignalOS.
- Permission is granted to use, copy, modify, and distribute this asset as part of the SignalOS project and its derivatives.

The adjacent file `public/sigi-mascot.LICENSE.txt` contains the same provenance and license note next to the asset itself.

To upgrade `/api/sigi` to a real model provider, use the hosted Sigi provider section in `.env.local.example` and copy the relevant values into `.env.local`.

`OPENAI_API_KEY`, `OPENAI_MODEL`, and `OPENAI_BASE_URL` are also supported as fallbacks. The route uses an OpenAI-compatible `chat/completions` request and falls back to the deterministic today tape reader if the provider is not configured or the request fails.

## Stripe Setup (Required for Sigi Smart / Pro)

### 1. Create Products in Stripe
- Sigi Smart (monthly)
- Sigi Pro (monthly)

### 2. Copy Price IDs
Set the Stripe billing values in `.env.local` using `.env.local.example` as the source of truth.

### 3. Add Keys
Add the required Stripe keys and URLs from the Stripe section in `.env.local.example`.

### 4. Configure Webhook
Endpoint:

`/api/stripe/webhook`

Events to listen for:
- checkout.session.completed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_failed

### 5. Enable Customer Portal
Set return URL:

`/settings/sigi`

### 6. Test Flow
- Upgrade -> Checkout -> Success redirect
- Verify `profiles.sigi_tier` updates
- Open billing portal
- Cancel -> confirm downgrade to free

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
