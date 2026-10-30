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

## Mobile Pulse

- Phone visitors start with public Pulse search at `/`; `/pulse?symbol=NVDA` opens a specific stock without signup. Desktop landing content stays separate.
- Current Pulse uses completed-session AMSA data. Heartbeat, movement, and DNA comparisons require source-distinct verified daily snapshots. Missing history never produces example scores or a synthetic waveform.
- Save and install actions appear after a successful reading. The web manifest starts installed apps at `/pulse` and provides 192px and 512px PNG icons. Installation depends on browser support; this is not an offline mode.
- Pulse Change Alerts are opt-in, on-device in-app alerts while SigiOS is visible, not background push notifications. Watched stocks are checked every five minutes for verified changes of at least five points, with a 24-hour per-stock cooldown and no alert on the initial baseline.
- Today, Markets, Pulse, Watchlist, and Portfolio are the five mobile tabs. Ask Sigi and deeper analysis retain existing access gates; real holdings remain separate from simulated Talents.
- Validate the Pulse guards with `npm run test:amsa`.

## Senate Stock Purchases

The shared desktop/phone Experts Pro dashboard includes Senate stock purchases
from FMP's `senate-latest` endpoint, using the existing server-only `FMP_API_KEY`.
`GET /api/experts/senate` requires Pro access before making provider calls.

Filters include Today, Past 7 days, Past 30 days, Past 90 days, and Past year
(365 days). Calendar windows include today in America/New_York. Disclosure date
is the default date basis; users can switch to purchase date. The initial window
is the past seven days. The API accepts `period=today|week|month|quarter|year`
and `basis=disclosure|purchase`.

Only explicit `Stock` / `Purchase` records with usable tickers are included.
Bonds, stock options, non-public stock, other assets, and sales are excluded even
when FMP supplies a ticker. Cards preserve disclosed dollar ranges without
inventing exact values; show senator, reported owner (including spouses/joint
holdings), both dates, and a Senate source link when available.

Each request scans up to ten pages of 100 latest filing rows, removes exact
duplicate provider records, and shows the newest 50 matching rows. The panel
discloses scanned/matched counts, oldest disclosure, and scan/display limits.
This is bounded filing-sample coverage, not guaranteed complete period coverage.
Missing selected dates are excluded with a warning. A period with no matches is
an explicit empty state, not evidence that no senator traded. Late disclosures
are not live trading signals or recommendations. FMP responses cache for 15
minutes; manual refresh respects that cache. Provider errors never generate
sample transactions.

Run `npx tsx --test tests/smoke/senatePurchases.test.ts` and
`npx vitest run src/app/api/experts/senate/route.test.ts`.

## Sigi Research Alignment

Experts, Vision, and Stock Detail share a responsive research panel, labeled
**Institutional Desk**, **Sigi Conviction**, and **Smart Money**, respectively.
Phone Vision uses a compact **Expert Snapshot** with expandable source evidence.
The Experts and desktop Vision panels accept a ticker; phone Vision follows the
stock being evaluated, and Stock Detail follows its route ticker. Cards stack on
phones and use three columns on wide screens. The phone Vision tree does not
activate the hidden desktop research fetch.

Research remains a Sigi Pro feature: `/api/experts/research?symbol=AAPL` checks Pro
access on the server before loading providers. Smart/free users retain existing
Vision and Stock Detail access and see a Pro research upgrade prompt rather than
premium evidence. Each source can fail independently without masking the others;
if all sources fail the API returns HTTP 503 and explicit unavailable reasons.

- **Analysts:** FMP `grades-consensus`, `price-target-consensus`, and the latest
  dated `grades` action. Buy/sell totals include strong ratings. FMP does not date
  its consensus/target snapshots; retrieval time is not represented as publication
  time. Deduplicated upgrades/downgrades in returned actions are counted over the
  last 90 days; this does not imply a consensus change or complete market coverage.
  Estimate and price-target revision histories are not connected and are explicitly
  unavailable. Missing targets or action history produce notes, not invented data.
- **Institutions:** The same named fund reports as the existing investment panel
  (Pershing Square, Third Point, Greenlight). Show quarter-end shares, reported USD
  value, reporting/filing dates, and SEC links. Reports older than 135 calendar days
  are flagged. These are a sample, not industry-wide coverage; absence is not a
  sell signal. Holdings are not recast as trades, flows, or current holdings.
  Manager history compares the latest report with the immediately preceding
  quarter only when both reports can be verified. Split-adjusted share comparisons
  identify new, increased, reduced, unchanged, and closed positions. Missing split
  history, missing consecutive reports, or invalid shares leave changes unavailable.
  Split history caches for 24 hours. Historical changes never modify AMSA scores.
- **AMSA:** Reuse `resolveCurrentStockPulse`, requiring ready/partial engine status,
  a verified completed-session reading, a finite score, and an as-of timestamp no
  older than seven days. This is standalone stock AMSA with no external market or
  sector context injected; source notes disclose that limitation.

There is **no new numerical research score**. A recognized Buy/Strong Buy or
Sell/Strong Sell consensus is compared with existing AMSA states:
Elite/Strong/Constructive are positive, Weak/Critical negative, Balanced neutral.
Matching directional evidence supports the analyst view; opposite directions
contradict it. Neutral evidence is Mixed / neutral; missing/unrecognized evidence
is Insufficient evidence. Institutional disclosures are historical context and
never votes in this comparison. Alignment is not an investment recommendation.

Analyst snapshots cache for 15 minutes and fund reports for six hours. Manual
refresh respects provider caches. No AI-generated facts fill missing sources.

Run the research smoke tests with
`npx tsx --test tests/smoke/researchAlignment.test.ts` and API access tests with
`npx vitest run src/app/api/experts/research/route.test.ts src/lib/experts/researchAlignment.test.ts`.

## Insider Purchases (FMP)

The shared desktop/mobile Experts dashboard uses `/api/experts/insiders` and the
server-only `FMP_API_KEY` for FMP's `insider-trading/latest` and `profile` endpoints.
It scans up to three pages of 100 filing rows, removes duplicate transaction rows,
and shows up to 20 matching purchases by trade date. Analyst-basket matches are
prioritized when a leader is selected. This is a bounded sample, not a complete
market-wide insider feed; the panel reports scanned and matched counts.

Only transaction code P (open-market or private purchases) with positive shares
is included. Sales, grants, gifts, and option exercises are not treated as buys.
Cards include reported purchase value (shares times reported transaction price, rounded to cents),
price per share, shares owned after the transaction, ownership type, security,
buyer/title, trade date, filing date, and an SEC source link when available.
Missing or zero prices show unavailable dollar amounts, never inferred prices.
Company-profile failures produce visible coverage warnings; sector filtering
excludes rows with no sector. Provider/auth/subscription errors are displayed
explicitly, without synthetic transactions or AI-generated amounts.

Filing dates can be much newer than the underlying trades. FMP responses cache
for 15 minutes; the panel refreshes every 15 minutes and has a manual Refresh
button. A refresh does not bypass the server cache. The Sigi summary is derived
from disclosed data; purchase size does not imply trading confidence.

Run focused checks with `npx tsx --test tests/smoke/fmpInsiders.test.ts`.

## Hedge-Fund Investment Estimates

Sigi Pro's Experts dashboard includes a top-20 stock and sector panel backed by
`GET /api/experts/hedge-funds` (Pro access required). Configure the server-only
`FMP_API_KEY` with access to FMP's institutional ownership/Form 13F endpoints.
An unconfigured key, restricted subscription, or provider failure produces an
explicit unavailable message, never sample holdings or AI-generated dollar amounts.

Coverage is a named sample of Pershing Square Capital Management, Third Point,
and Greenlight Capital, not an industry-wide ranking. The latest available
reporting date is selected independently for each fund. Long, USD stock positions
are valued using split-adjusted reported share counts and completed-session prices.
Options, ETFs, funds, and non-USD securities are excluded. Missing company profiles
or current-session prices produce visible coverage warnings; sectors without a
complete, aligned comparison history show Unavailable.

Daily, weekly, and monthly controls change the estimated dollar change, not the
ranking (which is by estimated current exposure). Daily uses the prior trading
close, weekly uses the close on or before seven calendar days earlier, and monthly
uses the close on or before the same day of the prior month, clamped at month-end.
Comparisons do not use prices more than seven days before the requested baseline.
Sector rankings aggregate every priced stock, not only the top 20. Share counts
are held constant: changes are hypothetical price effects, **not actual trades,
fund flows, or verified present-day holdings**. Dividends, shorts, and cash are not
included. Prices are eligible after 4:15 p.m. New York time; prior sessions are used
earlier in the day. Holdings cache for six hours, profiles/splits for one day, and
prices for 15 minutes. Retry reloads the panel; provider cache TTLs still apply.

Run focused checks with `npx tsx --test tests/smoke/hedgeFundInvestments.test.ts`.

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
