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

## Pullback Watch (local review; not deployed)

- Review: `http://127.0.0.1:3100/watchlist/pullback?previewPlan=pro`
  after `npm run dev -- --hostname 127.0.0.1 --port 3100`.
  The existing development-only plan preview does not create an authenticated
  account or grant permission to save notifications.
- Real-data, read-only evidence:
  `http://127.0.0.1:3100/vision?symbol=AAPL&pullbackWatch=1&previewPlan=pro`.
  No example stocks, ratings, or alerts are injected into the app.
- Phone Today: immediately below Market Thesis and above Ask Sigi.
  Desktop Today: inside Emerging Setups. The existing five-button navigation is
  unchanged. Watchlist includes pending counts, trusted-firm selection, and
  **Notify me**. Fresh Price & Volume events (within 24 hours) open that tab first.
- A red **Alerts** action sits at the top right of the shared phone/desktop
  header, including News and Workspace, and the standalone Pulse header. It
  opens the newest saved Pullback Watch update directly in Vision (the follow-up
  wins when both stages share a timestamp). Its badge counts saved events, not
  unread or newly qualifying stocks. With no saved events it opens Pullback Watch;
  an unavailable inbox shows `!` and an explanatory accessible label, never a
  fabricated count. It checks the existing inbox every 30 seconds while visible
  and on return to the app; it does not run extra market-data evaluations.
- Access follows the existing **Pro research** rules in Experts. Mutations also
  require an authenticated account and same-origin request.

### Local persistence and monitoring

Point the app at a **local/development Supabase instance**, then apply
[`20261119220000_add_pullback_watch.sql`](supabase/migrations/20261119220000_add_pullback_watch.sql)
there. The migration adds RLS-protected watches and an immutable in-app event inbox.
Use that instance's normal Supabase URL, anon key and service-role key. Sign in
with a local Pro account. No remote migration or production write is required.
The existing configured remote instance did not have these tables during review;
it was inspected read-only and deliberately left unchanged. Until a development
database is configured, saving/processing watches reports a setup error.

For a hosted development database, use a project in a **Free organization**.
Supabase's Free plan is $0/month, includes a 500 MB database, allows up to two
active free projects across eligible organizations, and may pause after one
inactive week. Check available slots before creating a project. A project in a
paid organization is not a free alternative; do not enable paid branching or
upgrade the organization for this test. See the current
[pricing](https://supabase.com/pricing) and
[billing rules](https://supabase.com/docs/guides/platform/billing-on-supabase).
Existing FMP subscription limits still apply.

Keep development credentials in the ignored `.env.pullback-dev.local`, never
in Git or chat, and verify its Supabase URL differs from `.env.local` before
any writes. This custom file is **not automatically loaded** by Next.js or
`npm run pullback:monitor`; that monitor command loads `.env.local`. Do not
start monitoring until both processes explicitly use the same isolated
development configuration. A fresh Supabase project also needs the app's
profile/settings schema and an authenticated development Pro account; the
Pullback Watch migration alone does not provision those prerequisites.

Opening watched stocks checks their current evidence. **Notify me** opts into
background monitoring; pausing stops new events, not saved event history.
With the same `CRON_SECRET` configured for the local server and monitor, run
`npm run pullback:monitor` in another terminal. It calls
`/api/cron/pullback-watch` at minute boundaries and refuses non-loopback origins.
No production scheduler was added. A future scheduler must invoke that protected
endpoint every minute; size its worker capacity and FMP quota for the watch
universe. A time-budget failure is explicit, not successful delivery.

The database serializes evaluations per watch and enforces a unique key on
**user + symbol + pullback ID + stage**. Refreshes/retries cannot insert another
event. The event stores the original evidence; opening it in Vision does not
silently replace it with newer research.

### Evidence rules and configuration

The existing technical definition is reused: a close within 1% of the trailing
20-session low, excluding the existing breakout case. An episode lasts until a
completed-session close recovers its pre-pullback high. Its ID is retained in the
watch snapshot, including across splits.

Only exact, recognized original firm identities count. FMP's `gradingCompany`
is used; an explicit original-research-firm field takes precedence over a
distributor. Syndicated copies cannot add votes. Ambiguous composite identities
and conflicting same-day actions are excluded. The latest known action must
reaffirm the same favorable rating, be within the freshness window, and be
demonstrably after onset. Date-only publications on the onset day are excluded.
Two-firm observation time is saved; a later fresh quote can qualify the follow-up
on the **same day**, without inventing a publication time.

Price & Volume requires the configured number of completed stabilization
sessions, lows within the support tolerance, intraday support still holding, and
price advancing above both the last close and today's open. Cumulative minute
volume is compared with the same completed session minute in the previous
10 trading sessions, not with average full-day volume. Missing minutes, missing
baselines, stale/future quotes, invalid split history, and stale daily history
suppress qualification. Extended-hours bars are excluded. Early-close sessions
cannot supply a baseline after their close. Price and volume are adjusted to
today's share basis using verified FMP splits; raw intraday data is explicitly
requested with `nonadjusted=true`.

Optional server environment settings (defaults):

| Variable | Default |
| --- | --- |
| `PULLBACK_STABILIZATION_SESSIONS` | `2` |
| `PULLBACK_VOLUME_MULTIPLE` | `1.5` |
| `PULLBACK_SUPPORT_TOLERANCE` | `0.01` |
| `PULLBACK_ADVANCE_FRACTION` | `0.001` |
| `PULLBACK_RATING_MAX_DAYS` | `14` |
| `PULLBACK_QUOTE_MAX_SECONDS` | `120` |
| `PULLBACK_VOLUME_SESSIONS` | `10` |

### Verified provider coverage and gaps

Live access was checked on 2026-11-19 using the existing FMP account:

- AAPL grades, split-adjusted daily OHLC, one-minute raw OHLCV, and split history
  returned successfully. The full evaluation correctly returned **no active
  pullback**, not an illustrative alert.
- AAPL's newest returned Argus record was **2026-11-03**; CFRA's was
  **2024-10-21**. Neither is a fresh reaffirmation under the default 14-day rule.
  Schwab and Morningstar were absent from the returned records. Recent coverage
  badges use a 135-day window, not all-time appearances. These checks do not prove
  firm-wide coverage for other stocks.
- FMP Grades supplies the original rating, previous rating, action, grading firm,
  and publication **date**, but no publication time, report URL, target changes,
  or general syndication-lineage metadata in the verified response. These fields
  are not fabricated, and consensus targets are not attached to individual
  research reports. Unattributable distribution records must remain excluded;
  verified additional coverage requires an existing-provider entitlement or
  attributable original research, not scraping Schwab.
- The existing institutional dates endpoint was accessible. A sampled Pershing
  Square Q3 2026 extraction returned no rows. Missing filings/baselines are never
  interpreted as new purchases. The existing split-aware institutional service
  is reused in Vision: newly reported positions first, increases second, with
  reporting period and filing date. Filings do **not** establish purchase dates.
- Senate disclosures were accessible. The optional note reuses the existing
  seven-day disclosure sample and shows purchase and disclosure dates separately;
  it is not complete coverage or a qualification requirement.
- Feed availability/latency and complete minute history remain prerequisites.
  Notifications occur on the first processing pass after qualifying evidence is
  available; this is not a tick-feed or guaranteed zero-latency service.

### What phone delivery still needs

The app had no push subscription or service-worker delivery implementation.
This feature implements persistent **in-app** delivery only. Phone push still
requires: a registered service worker with push/notification-click handlers,
per-device consent and subscription UI, authenticated subscription registration
and removal endpoints, RLS-protected device subscriptions, VAPID keys/HTTPS
configuration, and a retryable delivery worker/outbox tied to the existing unique
event ID (including expired-subscription cleanup). iOS web push also requires an
installed Home Screen PWA on a supported iOS version. None was claimed deployed.

### Validation

`npm run test:pullback` covers research identity, freshness, ordering,
split/reverse-split handling, same-minute volume, stale/missing evidence,
subscription/write guards, and the actual PostgreSQL migration, RLS and retry
deduplication using local PGlite. `npm run test:pullback:mobile` uses WebKit with
an iPhone viewport against the running local dev server; all illustrative data
and network fixtures live only under tests. Install its browser with
`npx playwright install webkit` if needed. Run `npm run build` for production
compilation. No deployment command is part of this workflow.

Local validation completed: **22 focused/shared regression checks, 6 phone/desktop
WebKit flows, feature ESLint, and the production build passed**. A separate
repository-wide `tsc --noEmit --incremental false` still reports pre-existing
test typing errors in
[`overview/route.test.ts`](src/app/api/vision/overview/route.test.ts),
[`analystNewsSummary.test.ts`](src/lib/news/analystNewsSummary.test.ts), and
[`expertsFeedBuckets.test.ts`](tests/smoke/expertsFeedBuckets.test.ts); these were
left unchanged. Persistence was verified against the real migration in local
PGlite, not by modifying the configured remote Supabase database. Mobile
interactions use test-only fixtures; live FMP checks are reported separately
above and do not claim a qualifying real alert.

## Membership Signup Availability

New paid memberships and trials are open. The `MEMBERSHIP_SIGNUPS_PAUSED` flag in
`src/lib/billing/membershipAvailability.ts` is `false` and controls the site-wide notice,
landing purchase buttons, upgrade page, and server guards. The construction
banner is hidden, purchase buttons are enabled, and checkout requests follow
the normal authentication and Stripe flow.

Free account access, existing memberships, renewals, webhooks, billing-portal
access and cancellation remain unchanged. Deploy this change to reopen the
live site. To pause new signups again, set the shared flag to `true` and redeploy;
existing subscriptions and externally issued Stripe links are not paused.

Run the signup access regression checks with
`npx vitest run src/lib/billing/checkout.test.ts`.

## Sigi AI Provider

The shell Sigi assistant always works with the built-in today-context engine.

## FMP-only Market Data

The app's paid market-data dependency is now the server-only `FMP_API_KEY`.
Massive/Polygon and Finnhub keys are no longer used by active app feeds.
Supabase, Stripe and optional AI services remain separate.

- Stock/index quotes, OHLC history, fundamentals, company profiles, search,
  movers, stock news and crypto news use FMP stable endpoints.
- Existing `/api/massive/*` and `/api/polygon/*` URLs are compatibility routes
  backed by FMP, not requests to the cancelled provider.
- Live charts default to **1D / 1m** (saved workspace interval choices remain
  respected). One-minute candles refresh every 30 seconds; they are not a
  tick-by-tick trade or order-book feed. Other intervals remain selectable.
  Candle-chart panels display "Opens 9:30 AM Eastern" for the regular-session
  opening time; locked chart previews show the same notice.
- Live charts, locked chart previews and both workspace chart views show the
  next earnings report date from FMP's `earnings` endpoint. Dates are compared
  against the New York calendar day; past dates and reports with actual results
  are excluded. This is the scheduled release date, not the fiscal quarter end,
  and is subject to change. Missing dates and provider errors show unavailable.
  Provider data caches for one hour, and open charts recheck hourly.
- Chart stats include previous trading-day volume, today's cumulative FMP quote
  volume (refreshed every 60 seconds), and the arithmetic average of the previous
  10 completed trading days. These totals do not depend on the selected candle
  interval or visible chart range. Today's partial session is excluded from the
  average; fewer than 10 valid daily volumes show unavailable rather than a
  shorter-period average. Prior-session quotes are never shown as today's
  volume. Quote timestamps are displayed in Eastern time; no extended-hours
  volume is inferred. Missing/provider-failed data shows unavailable.
- Intraday timestamps are interpreted in New York time, including DST.
  History is requested per calendar day to avoid FMP range truncation and
  empty pre-open responses hiding previous sessions.
- Options contracts/Greeks/bid-ask feeds, crypto tick trades, and market-wide
  pre-market volume/setup rankings explicitly show unavailable. Regular-session
  movers are never relabeled as pre-market activity.
- `npm run ingest` always uses FMP, including when an old `PRICES_PROVIDER`
  setting remains. Stable daily-history arrays are supported.

Provider permissions, exchange agreements and redistribution rights still
apply; an Ultimate plan does not itself establish permission to redistribute
real-time data. Provider errors do not enable a fallback to Massive.
News is a bounded latest-provider sample, not exhaustive historical coverage.

Keep the FMP key out of `NEXT_PUBLIC_*` variables. Remove obsolete public
provider keys from hosting settings and redeploy to retire old browser bundles.
Production compilation is checked with `npm run build`.

## Mobile Pulse

- Phone visitors start with public Pulse search at `/`; `/pulse?symbol=NVDA` opens a specific stock without signup. Desktop landing content stays separate.
- Current Pulse uses completed-session AMSA data. Heartbeat, movement, and DNA comparisons require source-distinct verified daily snapshots. Missing history never produces example scores or a synthetic waveform.
- Save and install actions appear after a successful reading. The web manifest starts installed apps at `/pulse` and provides 192px and 512px PNG icons. Installation depends on browser support; this is not an offline mode.
- Pulse Change Alerts are opt-in, on-device in-app alerts while SigiOS is visible, not background push notifications. Watched stocks are checked every five minutes for verified changes of at least five points, with a 24-hour per-stock cooldown and no alert on the initial baseline.
- Today, Markets, Pulse, Watchlist, and Portfolio are the five mobile tabs. Ask Sigi and deeper analysis retain existing access gates; real holdings remain separate from simulated Talents.
- Validate the Pulse guards with `npm run test:amsa`.

## Crypto Market Quotes

Selected-coin pages (`/crypto/BTC`, `/crypto/ETH`, and other supported symbols)
show an FMP USD quote in desktop, phone, and phone-preview layouts. The server
endpoint `/api/crypto/quote?symbol=BTC` uses the existing server-only `FMP_API_KEY`
with FMP's stable `quote` endpoint and caches provider responses for 30 seconds.

The quote includes price, absolute/percentage change, volume, daily and 52-week
ranges, market cap, 50/200-day averages, open, previous close, exchange, name,
pair symbol, and the original Unix timestamp. The panel refreshes every 30 seconds
and supports manual retry. Missing fields remain unavailable; unsupported pairs
do not receive substitute quotes. Provider timestamps more than 10 minutes old
are labeled delayed; retrieval time is shown separately.

Crypto boards/watchlists/portfolios now use FMP snapshots, candles use FMP
history, and browser prices poll the server quote route. There is no browser
provider key or Polygon websocket. Unsupported trades and tick-derived analytics
show unavailable rather than deriving trades from snapshots. Existing Crypto
membership gates remain unchanged.

Run focused quote tests with `npx vitest run src/lib/crypto/fmpQuote.test.ts`.

## Options Workspace

Options is temporarily hidden from the desktop navigation and Markets tools.
The workspace and API remain intact for later use; direct
`/options?symbol=AAPL` links still work with existing access checks.
FMP supplies underlying-stock quotes, upcoming reported
earnings dates, analyst consensus and price targets using `FMP_API_KEY`.
The FMP-only configuration does not request options contracts from Massive,
even if an obsolete key remains in the environment. The workspace preserves
underlying-stock research and shows a clear unavailable state for the chain,
Greeks, contract quotes, positioning and payoff estimates. It never substitutes
stock quotes or sample contracts for missing options data.

Run focused checks with `npx vitest run src/lib/options`.

## Senate Stock and ETF Purchases

The shared desktop/phone Experts Pro dashboard includes Senate stock and ETF purchases
from FMP's `senate-latest` endpoint, using the existing server-only `FMP_API_KEY`.
`GET /api/experts/senate` requires Pro access before making provider calls.

Filters include Today, Past 7 days, Past 30 days, Past 90 days, and Past year
(365 days). Calendar windows include today in America/New_York. Disclosure date
is the default date basis; users can switch to purchase date. The initial window
is the past seven days. The API accepts `period=today|week|month|quarter|year`
and `basis=disclosure|purchase`.

Only explicit `Stock` or `ETF` records with type `Purchase` and usable tickers are included.
Equity and bond ETFs are eligible, including ETFs FMP classifies as `Stock`.
Individual bonds, stock options, non-public stock, mutual funds, other assets, and sales are excluded even
when FMP supplies a ticker. Cards preserve disclosed dollar ranges without
inventing exact values; show senator, reported owner (including spouses/joint
holdings), both dates, and a Senate source link when available. The shared UI
labels the scope as stocks and ETFs; asset classifications are supplied by FMP.

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
Phone Vision uses a compact **Expert Snapshot** with expandable analyst/Pulse
evidence and directly visible quarterly hedge-fund activity.
The Experts and desktop Vision panels accept a ticker; phone Vision follows the
stock being evaluated, and Stock Detail follows its route ticker. Cards stack on
phones; analyst/Pulse evidence uses two columns on wide screens. The phone Vision tree does not
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
- **Legacy institutional snapshot API:** The same named fund reports as the existing investment panel
  (Pershing Square, Third Point, Greenlight). Retains quarter-end shares, reported USD
  value, reporting/filing dates, and SEC links. Reports older than 135 calendar days
  are flagged. These are a sample, not industry-wide coverage; absence is not a
  sell signal. Holdings are not recast as trades, flows, or current holdings.
  Manager history compares the latest report with the immediately preceding
  quarter only when both reports can be verified. Split-adjusted share comparisons
  identify new, increased, reduced, unchanged, and closed positions. Missing split
  history, missing consecutive reports, or invalid shares leave changes unavailable.
  Split history caches for 24 hours. Historical changes never modify AMSA scores.
  The older Institutional disclosures UI and compact snapshot summary have been
  removed; the existing API remains compatible.
- **Quarterly hedge-fund activity:** A standalone section visible on desktop and
  phone (outside the compact evidence toggle) shows eight
  completed calendar quarters show estimated additions, reductions, and net
  activity for an expanded eight-manager sample: the three snapshot funds plus
  Bridgewater, Appaloosa, Coatue, Tiger Global, and Viking. Expand each quarter
  for fund-level net share changes, estimated dollar changes, full reported
  quarter-end holding values, filing dates, and SEC links. The separate
  `/api/experts/institutional-activity` endpoint enforces the same Pro access
  check before provider calls; hidden desktop panels do not fetch it.
  Estimates multiply split-adjusted consecutive-quarter share changes by the
  quarter's last available close (within seven days), with FMP's split-adjusted
  historical prices restored to that quarter's share basis. They are **not**
  actual cash flows, transaction costs, gross purchases/sales, or changes in
  holding value caused solely by price moves. Options are excluded. A closed
  position requires a verified complete current filing, not an empty response.
  Missing/ambiguous filings, missing baselines, invalid splits, and missing prices
  are explicit unavailable states. Partial totals show the number of valued
  managers; missing activity is never silently counted as zero. Recent quarters
  may be unfiled or missing from FMP. Reports/prices cache six hours, splits one
  day; requests use bounded concurrency and a loading deadline, marking any
  unfinished snapshots incomplete. This does not broaden the separate top-20
  investment rankings' three-fund sample or change AMSA/alignment scores.
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
