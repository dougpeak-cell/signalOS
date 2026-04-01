  
  "use client";
  
import { useEffect, useMemo, useRef, useState } from "react";
import SigiAskCard from "@/components/shell/SigiAskCard";
import SigiLiveCard from "@/components/shell/SigiLiveCard";
import SigiNewsCard from "@/components/shell/SigiNewsCard";
import { detectMarketRegime } from "@/lib/engines/marketRegimeEngine";
import { getQuoteState } from "@/lib/market/quotes";

type SigiTone = "bullish" | "bearish" | "neutral";

type SigiResponse = {
  title: string;
  body: string;
  bullets: string[];
  tone: SigiTone;
};

type SigiRightRailProps = {
  ticker: string;
  bias?: SigiTone;
  confidence?: number | null;
  sigiGapRead?: string | null;
  gapIntelLabel?: string | null;
};

type SigiMode =
  | "default"
  | "explain"
  | "levels"
  | "changed"
  | "risk"
  | "bull"
  | "bear"
  | "news";

function buildResponse({
  ticker,
  mode,
  question,
  bias,
}: {
  ticker: string;
  mode: SigiMode;
  question: string;
  bias: SigiTone;
}): SigiResponse {
  const activeBias: SigiTone =
    bias === "bullish" ? "bullish" : bias === "bearish" ? "bearish" : "neutral";

  if (question.trim()) {
    return {
      title: "Sigi Response",
      body: `Here’s how Sigi reads ${ticker} for "${question}". The main job is to compare live structure, momentum, and nearby liquidity to see whether price is confirming the current tape or fighting it. If ${ticker} keeps holding important levels and reactions stay constructive, the move becomes more trustworthy. If reclaim attempts fail or price gets rejected into supply, then the setup becomes weaker and risk rises.`,
      bullets: [
        "Watch how price reacts at nearby liquidity rather than on random candles.",
        "A strong move should hold gains after reclaim, not immediately fade.",
        "The best confirmation comes when momentum and structure agree.",
      ],
      tone: activeBias,
    };
  }

  switch (mode) {
    case "explain":
      return {
        title: "Setup Breakdown",
        body: `${ticker} is being judged by whether the current setup is aligned across structure, momentum, and liquidity. Sigi wants to see that the stock is not only printing a signal, but that price action is supporting that signal with follow-through instead of hesitation.`,
        bullets: [
          "Structure should confirm the setup direction.",
          "Momentum should support continuation, not fade immediately.",
          "Liquidity reactions should look intentional, not random.",
        ],
        tone: activeBias,
      };

    case "levels":
      return {
        title: "Key Levels Read",
        body: `${ticker} should be read through its nearest upside, nearest downside, and VWAP behavior. The strongest trades usually happen when price reacts cleanly around those areas instead of chopping through them without commitment.`,
        bullets: [
          "Upside levels show where supply may appear.",
          "Downside levels show where demand may defend.",
          "VWAP helps judge whether intraday control is improving or weakening.",
        ],
        tone: "neutral",
      };

    case "changed":
      return {
        title: "What Changed Today",
        body: `Sigi is comparing the current tape in ${ticker} against the earlier session to see whether buyers or sellers have gained control. A meaningful change is not just a move in price — it is a change in how price behaves at important zones.`,
        bullets: [
          "Failed bounces often signal weaker structure.",
          "Strong reclaims can signal improving control.",
          "Compression after momentum can warn of transition.",
        ],
        tone: activeBias,
      };

    case "risk":
      return {
        title: "Risk View",
        body: `Risk in ${ticker} increases when price loses key intraday levels, reclaim attempts fail, or momentum weakens into nearby supply. Sigi is watching for signs that the setup is no longer being confirmed by tape behavior.`,
        bullets: [
          "Failed follow-through raises caution.",
          "Sharp rejection into supply increases downside risk.",
          "Loss of reclaim zones reduces setup quality.",
        ],
        tone: "bearish",
      };

    case "bull":
      return {
        title: "Bull Case",
        body: `The bullish case for ${ticker} improves if price can hold support, reclaim important intraday levels, and show stronger follow-through after pulls. Sigi wants the stock to prove buyers are in control, not just bounce briefly.`,
        bullets: [
          "Support holds should lead to constructive continuation.",
          "VWAP reclaim improves bullish structure.",
          "Momentum should expand, not stall immediately.",
        ],
        tone: "bullish",
      };

    case "bear":
      return {
        title: "Bear Case",
        body: `The bearish case for ${ticker} strengthens if rallies fail, momentum fades into supply, and price cannot recover important intraday levels. Sigi treats weak reclaim attempts as a warning that sellers still own the tape.`,
        bullets: [
          "Failed pops can stay sellable.",
          "Rejection near supply keeps pressure on price.",
          "Weak structure usually shows up before larger downside opens.",
        ],
        tone: "bearish",
      };

    case "news":
      return {
        title: "News Impact",
        body: `Sigi reads news through price reaction first. For ${ticker}, the key question is whether headlines are actually changing conviction and tape behavior, or whether the market is simply absorbing them and moving on.`,
        bullets: [
          "Headline importance rises when it changes structure.",
          "Price response matters more than headline tone alone.",
          "News can amplify a setup, but weak tape can still override it.",
        ],
        tone: "neutral",
      };

    default:
      return {
        title: "Live Read",
        body: `${ticker} is being monitored for live structure, confluence, and context. Sigi is watching whether price can hold important intraday levels and whether momentum confirms the current bias before treating the setup as high quality.`,
        bullets: [
          "Structure matters more than random noise.",
          "Momentum needs to support the move.",
          "Context decides whether follow-through is trustworthy.",
        ],
        tone: activeBias,
      };
  }
}

function responseToneClasses(tone: SigiTone) {
  if (tone === "bullish") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (tone === "bearish") {
    return "border-rose-500/20 bg-rose-500/10 text-rose-300";
  }

  return "border-cyan-500/20 bg-cyan-500/10 text-cyan-300";
}

export default function SigiRightRail({
  ticker,
  bias = "neutral",
  confidence = null,
  sigiGapRead = null,
  gapIntelLabel = null,
}: SigiRightRailProps) {
  const [mode, setMode] = useState<SigiMode>("default");
  const [showFullResponse, setShowFullResponse] = useState(false);
  const [customQuestion, setCustomQuestion] = useState("");
  const [showResponse, setShowResponse] = useState(false);
  const [typedBody, setTypedBody] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [visibleBulletCount, setVisibleBulletCount] = useState(0);
  const responseRef = useRef<HTMLElement | null>(null);
  const [flash, setFlash] = useState(false);

  const regime = useMemo(() => {
    const spy = getQuoteState("SPY");
    const qqq = getQuoteState("QQQ");
    const dia = getQuoteState("DIA");
    const iwm = getQuoteState("IWM");

    const spyPct =
      spy.price && spy.prevClose
        ? ((spy.price - spy.prevClose) / spy.prevClose) * 100
        : null;

    const qqqPct =
      qqq.price && qqq.prevClose
        ? ((qqq.price - qqq.prevClose) / qqq.prevClose) * 100
        : null;

    const diaPct =
      dia.price && dia.prevClose
        ? ((dia.price - dia.prevClose) / dia.prevClose) * 100
        : null;

    const iwmPct =
      iwm.price && iwm.prevClose
        ? ((iwm.price - iwm.prevClose) / iwm.prevClose) * 100
        : null;

    return detectMarketRegime({
      spyChangePct: spyPct,
      qqqChangePct: qqqPct,
      diaChangePct: diaPct,
      iwmChangePct: iwmPct,
      vixChangePct: null,
    });
  }, []);

  const regimeContext = `${regime.label}. ${regime.summary}`;

  const summary = useMemo(() => {
    if (sigiGapRead) {
      return sigiGapRead;
    }

    if (customQuestion.trim()) {
      return `Sigi is actively reading ${ticker} through the lens of your question and comparing live structure, momentum, and liquidity behavior for confirmation.`;
    }

    switch (mode) {
      case "explain":
        return `${ticker} is being evaluated through live structure, liquidity behavior, and confluence alignment. ${regimeContext}`;
      case "levels":
        return `${ticker} should be judged around its nearest liquidity, VWAP behavior, and reaction zones. ${regimeContext}`;
      case "changed":
        return `${ticker} is being compared against earlier session structure to detect whether momentum is strengthening or fading. ${regimeContext}`;
      case "risk":
        return `${ticker} risk rises when follow-through fails or reclaim attempts break down. ${regimeContext}`;
      case "bull":
        return `${ticker} bullish case improves when support holds and reclaim attempts confirm. ${regimeContext}`;
      case "bear":
        return `${ticker} bearish case strengthens if rallies fail and sellers keep control. ${regimeContext}`;
      case "news":
        return `${ticker} news should be read through price reaction, not headlines alone. ${regimeContext}`;
      default:
        return `${ticker} is being monitored for live structure, confluence, and context. ${regimeContext}`;
    }
  }, [customQuestion, mode, regimeContext, ticker]);

  const response = useMemo(
    () =>
      buildResponse({
        ticker,
        mode,
        question: customQuestion,
        bias,
      }),
    [ticker, mode, customQuestion, bias]
  );


  useEffect(() => {
    setTypedBody("");
    setVisibleBulletCount(0);

    if (!showResponse) {
      setIsStreaming(false);
      return;
    }

    setIsStreaming(true);

    let charIndex = 0;
    let bulletInterval: number | undefined;

    const bodyText = response.body;

    const textInterval = window.setInterval(() => {
      charIndex += 1;
      setTypedBody(bodyText.slice(0, charIndex));

      if (charIndex >= bodyText.length) {
        window.clearInterval(textInterval);

        let bulletIndex = 0;
        bulletInterval = window.setInterval(() => {
          bulletIndex += 1;
          setVisibleBulletCount(bulletIndex);

          if (bulletIndex >= response.bullets.length) {
            if (bulletInterval) window.clearInterval(bulletInterval);
            setIsStreaming(false);
          }
        }, 160);
      }
    }, 8);

    return () => {
      window.clearInterval(textInterval);
      if (bulletInterval) window.clearInterval(bulletInterval);
    };
  }, [response.body, response.bullets, showResponse]);
    useEffect(() => {
      if (!showResponse) return;

      setFlash(true);

      const frame = window.requestAnimationFrame(() => {
        responseRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });

      const timeout = setTimeout(() => setFlash(false), 900);

      return () => {
        window.cancelAnimationFrame(frame);
        clearTimeout(timeout);
      };
    }, [showResponse, mode, customQuestion]);
  
  const newsItems = useMemo(
    () => [
      {
        id: `${ticker}-1`,
        headline: `${ticker} remains in focus as traders reassess momentum and sector leadership`,
        takeaway:
          "Sigi sees this as a context headline. Price reaction matters more than the headline alone.",
        tone: bias,
        source: "SignalOS Feed",
      },
      {
        id: `${ticker}-2`,
        headline: `Analysts continue watching earnings quality, guidance, and AI-related narrative around ${ticker}`,
        takeaway:
          "This matters most when it changes conviction or causes a break of key intraday structure.",
        tone: "neutral" as const,
        source: "SignalOS Feed",
      },
      {
        id: `${ticker}-3`,
        headline: `${ticker} may trade with broader index sentiment if macro pressure stays elevated`,
        takeaway:
          "Sigi treats this as a correlation risk. Strong stock-specific setups can still fail in weak tape.",
        tone: "bearish" as const,
        source: "SignalOS Feed",
      },
    ],
    [ticker, bias]
  );

  const openMode = (nextMode: SigiMode) => {
    setCustomQuestion("");
    setMode(nextMode);
    setShowResponse(true);
    setShowFullResponse(false);
  };

  const handleAsk = (question: string) => {
    const q = question.trim();
    const normalized = q.toLowerCase();

    setCustomQuestion(q);
    setShowResponse(true);
    setShowFullResponse(false);

    if (normalized.includes("bull")) {
      setMode("bull");
      return;
    }

    if (normalized.includes("bear")) {
      setMode("bear");
      return;
    }

    if (normalized.includes("level")) {
      setMode("levels");
      return;
    }

    if (normalized.includes("changed")) {
      setMode("changed");
      return;
    }

    if (normalized.includes("risk")) {
      setMode("risk");
      return;
    }

    if (normalized.includes("news")) {
      setMode("news");
      return;
    }

    if (normalized.includes("explain") || normalized.includes("setup")) {
      setMode("explain");
      return;
    }

    setMode("default");
  };

  const clearQuestion = () => {
    setCustomQuestion("");
    setMode("default");
    setShowResponse(false);
    setShowFullResponse(false);
  };

  return (
    <div className="space-y-5">
      <SigiLiveCard
        ticker={ticker}
        bias={bias}
        confidence={confidence}
        summary={summary}
        onExplainSetup={() => openMode("explain")}
        onKeyLevels={() => openMode("levels")}
        onWhatChanged={() => openMode("changed")}
        onRiskView={() => openMode("risk")}
      />

      <SigiNewsCard items={newsItems} />

      <SigiAskCard
        onAsk={handleAsk}
        onExplain={() => openMode("explain")}
        onKeyLevels={() => openMode("levels")}
        onWhatChanged={() => openMode("changed")}
        onRiskView={() => openMode("risk")}
      />

      {showResponse ? (
        <section
          ref={responseRef}
          className={`glow-panel rounded-3xl p-5 transition-all duration-700 ${
            flash ? "ring-1 ring-cyan-400/40 shadow-[0_0_25px_rgba(0,255,255,0.15)]" : ""
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/85">
                {response.title}
              </div>
              <div className="mt-1 text-xs text-white/45">
                Expanded AI response
              </div>
            </div>

            <div
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${responseToneClasses(
                response.tone
              )}`}
            >
              {response.tone}
            </div>
          </div>

          {customQuestion ? (
            <div className="mt-4 rounded-2xl border border-cyan-400/15 bg-cyan-400/5 px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/70">
                Active Prompt
              </div>
              <div className="mt-1 text-sm text-white/80">{customQuestion}</div>
            </div>
          ) : null}

          <div className="mt-4 sig-card-soft rounded-2xl p-4">

            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400 sig-pulse" />
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/70">
                {isStreaming ? "Sigi is typing" : "Sigi response ready"}
              </div>
            </div>
            <p className="text-sm leading-6 text-white/78">
              {typedBody}
              {isStreaming ? (
                <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-cyan-300 align-middle" />
              ) : null}
            </p>

            <div className="mt-3 md:hidden">
              <button
                type="button"
                onClick={() => setShowFullResponse((v) => !v)}
                className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-100 transition hover:bg-cyan-400/15"
              >
                {showFullResponse ? "Hide full read" : "Show full read"}
              </button>
            </div>

            <div className={`${showFullResponse ? "mt-3 space-y-1.5" : "mt-3 hidden md:block md:space-y-1.5"}`}>
              {response.bullets.slice(0, visibleBulletCount).map((bullet) => (
                <div
                  key={bullet}
                  className="rounded-xl border border-white/8 bg-white/3 px-3 py-1.5 text-sm text-white/68"
                >
                  {bullet}
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={clearQuestion}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/75 transition hover:border-white/20 hover:bg-white/8 hover:text-white"
              >
                Reset Sigi
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}