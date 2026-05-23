import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Laptop2,
  LayoutPanelLeft,
  Monitor,
  Sparkles,
} from "lucide-react";

import tradingWorkspaceScreenshot from "../../public/Images/Chart/Screenshot 2026-05-20 175534.png";
import chartContextScreenshot from "../../public/Images/Chart/Chart context.png";
import cryptoBoardScreenshot from "../../public/Images/Chart/Crypto board.png";
import cryptoCommandCenterScreenshot from "../../public/Images/Chart/Crypto Command Center.png";
import cryptoWatchlistScreenshot from "../../public/Images/Chart/Cypto Watchlist.png";
import defiBoardScreenshot from "../../public/Images/Chart/Defi board.png";
import memeBoardScreenshot from "../../public/Images/Chart/Meme Board.png";
import rwaBoardScreenshot from "../../public/Images/Chart/RWA Board.png";
import tradingWorkspaceScreenshot2 from "../../public/Images/Chart/Screenshot 2026-05-23 094419.png";
import tradingWorkspaceScreenshot3 from "../../public/Images/Chart/Screenshot 2026-05-23 094727.png";
import tradingWorkspaceScreenshot4 from "../../public/Images/Chart/Screenshot 2026-05-23 095603.png";
import tradingWorkspaceScreenshot5 from "../../public/Images/Chart/Screenshot 2026-05-23 095912.png";
import tradingWorkspaceScreenshot6 from "../../public/Images/Chart/Screenshot 2026-05-23 100234.png";

const desktopSteps = [
  "Go to Sigios.com",
  "Select Login",
  "Use the same email connected to your SigiOS membership",
  "Access your complete desktop workspace",
];

const desktopGallery = [
  {
    title: "Trading workspace overview",
    caption: "A full command center layout with live chart context and workspace actions.",
    image: chartContextScreenshot,
  },
  {
    title: "Live chart focus",
    caption: "Keep the tactical chart front and center with levels and overlays pinned in view.",
    image: tradingWorkspaceScreenshot2,
  },
  {
    title: "Split workspace layout",
    caption: "Balance the chart with a persistent intelligence rail and saved workspace controls.",
    image: tradingWorkspaceScreenshot3,
  },
  {
    title: "Watchlist desktop rail",
    caption: "Monitor scored names, context rails, and breakout candidates in one screen.",
    image: tradingWorkspaceScreenshot4,
  },
  {
    title: "Experts desktop board",
    caption: "Open expert flow, ranked picks, and side context panels together on desktop.",
    image: tradingWorkspaceScreenshot5,
    secondaryImage: tradingWorkspaceScreenshot6,
  },
];

const cryptoGallery = [
  {
    title: "Crypto command center",
    caption: "Scan the broader crypto market with boards, tabs, and quick-actions in one desktop surface.",
    image: cryptoCommandCenterScreenshot,
  },
  {
    title: "Crypto board",
    caption: "Work through core crypto assets with ranked rows, board filters, and live action buttons.",
    image: cryptoBoardScreenshot,
  },
  {
    title: "DeFi board",
    caption: "Review DeFi protocols with sector-specific screens and the same desktop workflow controls.",
    image: defiBoardScreenshot,
  },
  {
    title: "Meme coin board",
    caption: "Track community-driven names with a separate desktop board for faster rotation monitoring.",
    image: memeBoardScreenshot,
  },
  {
    title: "RWA board",
    caption: "Open real-world-asset names in a dedicated desktop board with category filtering and quick actions.",
    image: rwaBoardScreenshot,
  },
  {
    title: "Crypto watchlist",
    caption: "Monitor tracked coins in a smaller desktop watchlist view without opening the full board.",
    image: cryptoWatchlistScreenshot,
  },
];

export const metadata: Metadata = {
  title: "Desktop Directions | SigiOS Elite",
  description:
    "Directions for opening the full SigiOS desktop command center using your existing membership and desktop workflow.",
};

function getReturnHref(returnTo?: string | string[]) {
  const value = Array.isArray(returnTo) ? returnTo[0] : returnTo;

  if (!value || !value.startsWith("/")) {
    return "/today";
  }

  return value;
}

function ScreenshotCard({
  title,
  caption,
  image,
  secondaryImage,
}: {
  title: string;
  caption: string;
  image: typeof tradingWorkspaceScreenshot;
  secondaryImage?: typeof tradingWorkspaceScreenshot;
}) {
  return (
    <article className="overflow-hidden rounded-[28px] border border-cyan-400/14 bg-slate-950/85 shadow-[0_20px_70px_rgba(2,8,20,0.42)]">
      <div className="border-b border-white/8 px-4 py-4 sm:px-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
          Desktop Screen
        </p>
        <h3 className="mt-2 text-lg font-black text-white">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">{caption}</p>
      </div>
      <div className="bg-black p-2 sm:p-3">
        <div className="overflow-hidden rounded-[22px] border border-cyan-400/10 bg-black">
          <Image src={image} alt={title} className="h-auto w-full" />
        </div>
        {secondaryImage ? (
          <div className="mt-3 overflow-hidden rounded-[22px] border border-cyan-400/10 bg-black">
            <Image
              src={secondaryImage}
              alt={`${title} secondary view`}
              className="h-auto w-full"
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default async function DesktopDirectionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ returnTo?: string | string[] }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const returnHref = getReturnHref(resolvedSearchParams?.returnTo);

  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_38%),linear-gradient(180deg,rgba(3,7,18,0.96),rgba(2,6,23,1))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-105 bg-[linear-gradient(90deg,rgba(34,211,238,0.05)_0,rgba(34,211,238,0.02)_18%,transparent_18%,transparent_40%,rgba(34,211,238,0.03)_40%,rgba(34,211,238,0.01)_58%,transparent_58%,transparent_100%)] opacity-70" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-14 pt-6 sm:px-6 lg:px-8 lg:pt-10">
        <div className="flex items-center gap-3">
          <Link
            href={returnHref}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85 transition hover:border-cyan-300/40 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Mobile SigiOS
          </Link>
        </div>

        <section className="rounded-4xl border border-cyan-400/20 bg-slate-950/80 p-5 shadow-[0_24px_80px_rgba(2,8,20,0.48)] backdrop-blur-xl sm:p-7 lg:p-8">
          <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-cyan-200">
              <Monitor className="h-3.5 w-3.5" />
              Desktop Access
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/70">
              <Sparkles className="h-3.5 w-3.5" />
              Membership Included
            </span>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
            <div>
              <h1 className="max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
                Access the Full SigiOS Desktop Command Center
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Your SigiOS membership includes full desktop access with expanded charts,
                multi-panel workflows, analyst intelligence, sector monitoring, and advanced trading tools.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {desktopSteps.map((step, index) => (
                  <div
                    key={step}
                    className="rounded-2xl border border-white/10 bg-black/40 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-400/10 text-sm font-black text-cyan-200">
                        {index + 1}
                      </span>
                      <p className="text-sm font-semibold leading-6 text-white sm:text-base">
                        {step}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

            </div>

            <div className="rounded-[28px] border border-cyan-400/15 bg-[linear-gradient(180deg,rgba(8,15,31,0.96),rgba(2,6,23,0.92))] p-5">
              <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
                <Laptop2 className="h-4 w-4" />
                Continue on your personal computer
              </div>
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/8 p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <CheckCircle2 className="h-4 w-4 text-cyan-300" />
                    Use the same membership email
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Your mobile and desktop access stay connected when you sign in with the same SigiOS account.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <LayoutPanelLeft className="h-4 w-4 text-emerald-300" />
                    Desktop unlocks the full workflow
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Mobile is ideal for monitoring and quick reads. Desktop is where the full command center, layouts, and multi-panel tools open up.
                  </p>
                </div>
              </div>

              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.26em] text-cyan-200/80">
                Built for mobile. Engineered for desktop.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
          <article className="rounded-[30px] border border-cyan-400/18 bg-slate-950/85 p-4 shadow-[0_24px_80px_rgba(2,8,20,0.48)] sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
                  Desktop Preview
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  Full workspace view
                </h2>
              </div>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
                Live chart context
              </span>
            </div>

            <div className="mt-4 overflow-hidden rounded-3xl border border-cyan-400/12 bg-black">
              <Image
                src={tradingWorkspaceScreenshot}
                alt="SigiOS desktop trading workspace preview"
                className="h-auto w-full"
                priority
              />
            </div>
          </article>

          <article className="rounded-[30px] border border-white/10 bg-slate-950/80 p-5 shadow-[0_24px_80px_rgba(2,8,20,0.42)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
              What opens on desktop
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              Command center advantages
            </h2>
            <div className="mt-5 space-y-3">
              {[
                "Expanded chart controls and trade levels",
                "Persistent side rails for Sigi intelligence",
                "Sector and analyst dashboards in one workflow",
                "Multi-panel monitoring across watchlist and portfolio",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/35 px-4 py-3"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                  <p className="text-sm leading-6 text-slate-300">{item}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section>
          <div className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
              Crypto Desktop Views
            </p>
            <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
              Crypto examples on desktop
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
              Below the stock information, these desktop examples show how crypto boards, watchlists, and category views expand on a larger screen.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {cryptoGallery.map((screen) => (
              <ScreenshotCard key={screen.title} {...screen} />
            ))}
          </div>
        </section>

        <section>
          <div className="grid gap-5 lg:grid-cols-2">
            {desktopGallery.map((screen) => (
              <ScreenshotCard key={screen.title} {...screen} />
            ))}
          </div>
        </section>

        <div className="flex justify-center pt-2">
          <a
            href="https://sigios.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-400/10 px-5 py-3 text-sm font-black text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-300/15"
          >
            Go to Sigios.com
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </main>
  );
}