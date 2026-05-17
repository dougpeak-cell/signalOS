  
  "use client";

  import { useEffect, useMemo, useState } from "react";
import { useLiveMarket } from "@/components/market/LiveMarketProvider";
  import SigiResponseCards from "@/components/sigi/SigiResponseCards";
  import { useSelectedTicker } from "@/components/sigi/SelectedTickerContext";
import SigiAskCard from "@/components/shell/SigiAskCard";
import SigiLiveCard from "@/components/shell/SigiLiveCard";
import SigiNewsCard from "@/components/shell/SigiNewsCard";
import { detectMarketRegime } from "@/lib/engines/marketRegimeEngine";

type SigiTone = "bullish" | "bearish" | "neutral";

type SigiResponse = {
  structured: string;
  narrative: string;
  bullets: string[];
};

type RailNewsItem = {
  id: string;
  headline: string;
  takeaway: string;
  tone?: SigiTone;
  source?: string;
  href?: string;
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

function formatBiasLabel(bias: SigiTone): string {
  if (bias === "bullish") return "Bullish";
  if (bias === "bearish") return "Bearish";
  return "Neutral";
}

function buildStructuredResponse(args: {
  ticker: string;
  mode: SigiMode;
  question: string;
  bias: SigiTone;
}): string {
  const { ticker, mode, question, bias } = args;
  const hasQuestion = question.trim().length > 0;
  const isDefaultMode = !hasQuestion && mode === "default";
  const biasLabel = formatBiasLabel(bias);
  const momentum =
    isDefaultMode
      ? "Building"
      : mode === "bull"
      ? "Strong"
      : mode === "bear" || mode === "risk"
        ? "Weakening"
        : "Building";
  const setup =
    hasQuestion
      ? `${ticker} is being evaluated against your active question with structure and liquidity in focus.`
      : isDefaultMode
        ? `${ticker} reacting to current structure and liquidity.`
      : mode === "levels"
        ? `${ticker} is approaching a key decision zone around support, resistance, and VWAP.`
        : mode === "changed"
          ? `${ticker} is being judged on whether the tape improved or deteriorated versus earlier structure.`
          : mode === "risk"
            ? `${ticker} is vulnerable if price loses reclaim zones and fades into nearby supply.`
            : mode === "bull"
              ? `${ticker} has a bullish continuation setup if buyers keep defending support.`
              : mode === "bear"
                ? `${ticker} has a bearish rejection setup if rallies keep failing into supply.`
                : mode === "news"
                  ? `${ticker} is trading on headline reaction, but price confirmation still matters most.`
                  : `${ticker} is in a live decision setup where structure and momentum need to confirm.`;
  const entry =
    isDefaultMode
      ? "Watch pullback into support."
      : bias === "bullish"
      ? "Favor pullbacks into support or a clean reclaim through VWAP."
      : bias === "bearish"
        ? "Favor failed pops into resistance or breakdown continuation."
        : "Wait for a confirmed break or reclaim before forcing entry.";
  const stop =
    isDefaultMode
      ? "Loss of key intraday level."
      : bias === "bullish"
      ? "Exit if support fails and reclaim attempts lose momentum."
      : bias === "bearish"
        ? "Exit if resistance breaks and sellers lose control."
        : "Exit if price action stays indecisive and confirmation never arrives.";
  const target =
    isDefaultMode
      ? "Continuation into next resistance."
      : bias === "bullish"
      ? "Target the next supply zone or prior intraday expansion high."
      : bias === "bearish"
        ? "Target the next demand zone or prior intraday breakdown area."
        : "Target the first clean expansion once direction confirms.";
  const risk =
    isDefaultMode
      ? "Medium"
      : mode === "risk" || bias === "bearish"
        ? "High"
        : bias === "neutral"
          ? "Medium"
          : "Low";
  const invalidation =
    isDefaultMode
      ? "Failed reclaim and rejection."
      : bias === "bullish"
      ? "Bullish read breaks if support fails and price cannot reclaim control."
      : bias === "bearish"
        ? "Bearish read breaks if price reclaims resistance and holds above it."
        : "The read breaks if price remains choppy with no directional confirmation.";
  const action =
    hasQuestion
      ? `Use your question on ${ticker} to judge whether price is confirming or weakening here.`
      : isDefaultMode
        ? "Wait for confirmation before committing size."
      : bias === "bullish"
        ? `Stay constructive on ${ticker} only if buyers keep confirming through pullbacks and reclaims.`
        : bias === "bearish"
          ? `Stay defensive on ${ticker} unless price proves it can reclaim lost ground.`
          : `Wait for cleaner confirmation in ${ticker} before increasing conviction.`;

  return [
    `BIAS: ${biasLabel}`,
    `MOMENTUM: ${momentum}`,
    `SETUP: ${setup}`,
    `ENTRY: ${entry}`,
    `STOP: ${stop}`,
    `TARGET: ${target}`,
    `RISK: ${risk}`,
    `INVALIDATION: ${invalidation}`,
    `ACTION: ${action}`,
  ].join("\n");
}

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

  const structured = buildStructuredResponse({
    ticker,
    mode,
    question,
    bias: activeBias,
  });

  if (question.trim()) {
    return {
      structured,
      narrative: `Here’s how Sigi reads ${ticker} for "${question}". The main job is to compare live structure, momentum, and nearby liquidity to see whether price is confirming the current tape or fighting it. If ${ticker} keeps holding important levels and reactions stay constructive, the move becomes more trustworthy. If reclaim attempts fail or price gets rejected into supply, then the setup becomes weaker and risk rises.`,
      bullets: [
        "Watch how price reacts at nearby liquidity rather than on random candles.",
        "A strong move should hold gains after reclaim, not immediately fade.",
        "The best confirmation comes when momentum and structure agree.",
      ],
    };
  }

  switch (mode) {
    case "explain":
      return {
        structured,
        narrative: `${ticker} is being judged by whether the current setup is aligned across structure, momentum, and liquidity. Sigi wants to see that the stock is not only printing a signal, but that price action is supporting that signal with follow-through instead of hesitation.`,
        bullets: [
          "Structure should confirm the setup direction.",
          "Momentum should support continuation, not fade immediately.",
          "Liquidity reactions should look intentional, not random.",
        ],
      };

    case "levels":
      return {
        structured,
        narrative: `${ticker} should be read through its nearest upside, nearest downside, and VWAP behavior. The strongest trades usually happen when price reacts cleanly around those areas instead of chopping through them without commitment.`,
        bullets: [
          "Upside levels show where supply may appear.",
          "Downside levels show where demand may defend.",
          "VWAP helps judge whether intraday control is improving or weakening.",
        ],
      };

    case "changed":
      return {
        structured,
        narrative: `Sigi is comparing the current tape in ${ticker} against the earlier session to see whether buyers or sellers have gained control. A meaningful change is not just a move in price — it is a change in how price behaves at important zones.`,
        bullets: [
          "Failed bounces often signal weaker structure.",
          "Strong reclaims can signal improving control.",
          "Compression after momentum can warn of transition.",
        ],
      };

    case "risk":
      return {
        structured,
        narrative: `Risk in ${ticker} increases when price loses key intraday levels, reclaim attempts fail, or momentum weakens into nearby supply. Sigi is watching for signs that the setup is no longer being confirmed by tape behavior.`,
        bullets: [
          "Failed follow-through raises caution.",
          "Sharp rejection into supply increases downside risk.",
          "Loss of reclaim zones reduces setup quality.",
        ],
      };

    case "bull":
      return {
        structured,
        narrative: `The bullish case for ${ticker} improves if price can hold support, reclaim important intraday levels, and show stronger follow-through after pulls. Sigi wants the stock to prove buyers are in control, not just bounce briefly.`,
        bullets: [
          "Support holds should lead to constructive continuation.",
          "VWAP reclaim improves bullish structure.",
          "Momentum should expand, not stall immediately.",
        ],
      };

    case "bear":
      return {
        structured,
        narrative: `The bearish case for ${ticker} strengthens if rallies fail, momentum fades into supply, and price cannot recover important intraday levels. Sigi treats weak reclaim attempts as a warning that sellers still own the tape.`,
        bullets: [
          "Failed pops can stay sellable.",
          "Rejection near supply keeps pressure on price.",
          "Weak structure usually shows up before larger downside opens.",
        ],
      };

    case "news":
      return {
        structured,
        narrative: `Sigi reads news through price reaction first. For ${ticker}, the key question is whether headlines are actually changing conviction and tape behavior, or whether the market is simply absorbing them and moving on.`,
        bullets: [
          "Headline importance rises when it changes structure.",
          "Price response matters more than headline tone alone.",
          "News can amplify a setup, but weak tape can still override it.",
        ],
      };

    default:
      return {
        structured,
        narrative: `${ticker} is being monitored for live structure, confluence, and context. Sigi is watching whether price can hold important intraday levels and whether momentum confirms the current bias before treating the setup as high quality.`,
        bullets: [
          "Structure matters more than random noise.",
          "Momentum needs to support the move.",
          "Context decides whether follow-through is trustworthy.",
        ],
      };
  }
}

export default function SigiRightRail({
  ticker,
  bias = "neutral",
  confidence = null,
  sigiGapRead = null,
  gapIntelLabel = null,
}: SigiRightRailProps) {
  const { quoteMap } = useLiveMarket();
  const { activeTicker } = useSelectedTicker();
  const [mode, setMode] = useState<SigiMode>("default");
  const [customQuestion, setCustomQuestion] = useState("");
  const [showResponse, setShowResponse] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [news, setNews] = useState<RailNewsItem[]>([]);
  const newsTicker = activeTicker?.trim().toUpperCase() || ticker;

  const regime = useMemo(() => {
    const spx = quoteMap["^GSPC"];
    const ndx = quoteMap["^NDX"] ?? quoteMap["^IXIC"];
    const dji = quoteMap["^DJI"];
    const rut = quoteMap["^RUT"];
    const vix = quoteMap["^VIX"] ?? quoteMap["VIX"];

    const spyPct =
      spx?.price != null && spx?.changePct != null
        ? spx.changePct
        : null;

    const qqqPct =
      ndx?.price != null && ndx?.changePct != null
        ? ndx.changePct
        : null;

    const diaPct =
      dji?.price != null && dji?.changePct != null
        ? dji.changePct
        : null;

    const iwmPct =
      rut?.price != null && rut?.changePct != null
        ? rut.changePct
        : null;

    const vixPct =
      vix?.price != null && vix?.changePct != null
        ? vix.changePct
        : null;

    return detectMarketRegime({
      spyChangePct: spyPct,
      qqqChangePct: qqqPct,
      diaChangePct: diaPct,
      iwmChangePct: iwmPct,
      vixChangePct: vixPct,
    });
  }, [quoteMap]);

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

  const askCardResponse = useMemo(() => {
    if (!showResponse) return null;

    return response.structured;
  }, [showResponse, response.structured]);


  useEffect(() => {
    if (!showResponse) {
      setIsStreaming(false);
      return;
    }

    setIsStreaming(true);

    const duration = Math.min(
      1600,
      Math.max(450, response.narrative.length * 8 + response.bullets.length * 160)
    );

    const timeoutId = window.setTimeout(() => {
      setIsStreaming(false);
    }, duration);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [response.narrative, response.bullets, showResponse]);

  useEffect(() => {
    let cancelled = false;

    const loadNews = async () => {
      try {
        const symbol = activeTicker?.trim().toUpperCase() || "";
        const [focusedData, marketData] = await Promise.all([
          symbol
            ? fetch(`/api/news?ticker=${encodeURIComponent(symbol)}`, {
                cache: "no-store",
              }).then((response) => response.json())
            : Promise.resolve(null),
          fetch("/api/news", { cache: "no-store" }).then((response) => response.json()),
        ]);

        if (cancelled) return;

        const focusedItems = Array.isArray(focusedData?.items)
          ? focusedData.items.slice(0, 3)
          : [];
        const marketItems = Array.isArray(marketData?.liveStream)
          ? marketData.liveStream
          : Array.isArray(marketData?.items)
            ? marketData.items
            : [];

        const mergedItems = symbol ? [...focusedItems, ...marketItems] : marketItems;
        const seen = new Set<string>();
        const items = mergedItems.filter((item: any) => {
          const key = `${String(item?.headline ?? "")}|${String(item?.source ?? "")}`;
          if (!key.trim() || seen.has(key)) return false;
          seen.add(key);
          return true;
        }).slice(0, 6);

        setNews(
          items.map((item: any, index: number) => ({
            id: String(item?.id ?? `${item?.headline ?? (symbol || ticker)}-${index}`),
            headline: String(item?.headline ?? "Market update"),
            takeaway: String(
              item?.whyItMatters ?? item?.summary ?? "Price reaction matters more than the headline alone."
            ),
            tone:
              item?.tone === "bullish" || item?.tone === "bearish" || item?.tone === "neutral"
                ? item.tone
                : "neutral",
            source: String(item?.source ?? "SigiOS Feed"),
            href:
              typeof item?.url === "string"
                ? item.url
                : typeof item?.link === "string"
                  ? item.link
                  : undefined,
          }))
        );
      } catch {
        if (!cancelled) {
          setNews([]);
        }
      }
    };

    void loadNews();

    return () => {
      cancelled = true;
    };
  }, [activeTicker]);

  const openMode = (nextMode: SigiMode) => {
    setCustomQuestion("");
    setMode(nextMode);
    setShowResponse(true);
  };

  const handleAsk = (question: string) => {
    const q = question.trim();
    const normalized = q.toLowerCase();

    setCustomQuestion(q);
    setShowResponse(true);

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

      <SigiNewsCard items={news} activeTicker={activeTicker ?? ticker} />

      {askCardResponse ? (
        <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
          <SigiResponseCards response={askCardResponse} />
        </div>
      ) : null}

      <SigiAskCard
        response={askCardResponse}
        showResponseCards={false}
        narrative={isStreaming ? null : response.narrative}
        bullets={isStreaming ? [] : response.bullets}
        streaming={isStreaming}
        loading={isStreaming}
        error={null}
        onAsk={handleAsk}
        onExplain={() => openMode("explain")}
        onKeyLevels={() => openMode("levels")}
        onWhatChanged={() => openMode("changed")}
        onRiskView={() => openMode("risk")}
      />
    </div>
  );
}