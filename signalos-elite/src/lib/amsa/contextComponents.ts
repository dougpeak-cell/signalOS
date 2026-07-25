import { clamp, isFiniteNumber, scoreToDirection } from "./math";
import type {
  AMSAComponentName,
  AMSAComponentResult,
  AMSAContextComponentInput,
  AMSAContextInput,
  AMSAMetrics,
} from "./types";

type AMSAContextComponentName =
  | "market"
  | "sector"
  | "industry"
  | "alignment"
  | "portfolio";

export function calculateContextComponents(
  context?: AMSAContextInput,
): AMSAComponentResult[] {
  if (!context) {
    return [
      createContextComponent("sector", undefined),
      createContextComponent("market", undefined),
    ];
  }

  const components = [
    createContextComponent("sector", context),
    createContextComponent("market", context),
  ];

  const optionalComponents = [
    createOptionalContextComponent("industry", context),
    createOptionalContextComponent("alignment", context),
    createOptionalContextComponent("portfolio", context),
  ].filter((component): component is AMSAComponentResult => component !== null);

  return [...components, ...optionalComponents];
}

export function buildContextComponent({
  component,
  label,
  score,
  confidence,
  reasons,
  warnings,
  metrics,
}: {
  component: AMSAComponentName;
  label: string;
  score: number | null | undefined;
  confidence: number | null | undefined;
  reasons?: string[];
  warnings?: string[];
  metrics?: AMSAMetrics;
}): AMSAComponentResult {
  if (!isFiniteNumber(score)) {
    return {
      component,
      label,
      score: null,
      status: "insufficient-data",
      direction: "unavailable",
      confidence: 0,
      reasons: reasons ?? [],
      warnings:
        warnings ?? [`${label} has not been connected to the AMSA engine.`],
      metrics: metrics ?? {},
    };
  }

  const normalizedScore = clamp(score);
  const normalizedConfidence = isFiniteNumber(confidence)
    ? clamp(confidence)
    : 70;

  return {
    component,
    label,
    score: normalizedScore,
    status: "ready",
    direction: scoreToDirection(normalizedScore),
    confidence: normalizedConfidence,
    reasons:
      reasons && reasons.length
        ? reasons
        : [defaultReason(label, normalizedScore)],
    warnings: warnings ?? [],
    metrics: {
      externalScore: normalizedScore,
      ...(metrics ?? {}),
    },
  };
}

export function resolveContextComponentInput(
  context: AMSAContextInput | undefined,
  component: AMSAContextComponentName,
): AMSAContextComponentInput | undefined {
  if (!context) {
    return undefined;
  }

  const nested = context[component];

  if (nested) {
    return nested;
  }

  switch (component) {
    case "sector":
      return {
        score: context.sectorScore,
        confidence: context.sectorConfidence,
        label: context.sectorName
          ? `${context.sectorName} Sector Pulse`
          : "Sector Alignment",
      };
    case "market":
      return {
        score: context.marketScore,
        confidence: context.marketConfidence,
        label: "Market Alignment",
      };
    case "industry":
      return {
        score: context.industryScore,
        confidence: context.industryConfidence,
        label: context.industryName
          ? `${context.industryName} Industry Pulse`
          : "Industry Leadership",
      };
    case "alignment":
      return {
        score: context.alignmentScore,
        confidence: context.alignmentConfidence,
        label: "Context Alignment",
      };
    case "portfolio":
      return {
        score: context.portfolioScore,
        confidence: context.portfolioConfidence,
        label: context.portfolioName ?? "Portfolio Alignment",
      };
    default:
      return undefined;
  }
}

export function shouldIncludeOptionalContext(
  input: AMSAContextComponentInput | undefined,
): boolean {
  if (!input) {
    return false;
  }

  return (
    isFiniteNumber(input.score) ||
    isFiniteNumber(input.confidence) ||
    Boolean(input.label) ||
    Boolean(input.reasons?.length) ||
    Boolean(input.warnings?.length) ||
    Boolean(input.metrics && Object.keys(input.metrics).length)
  );
}

function createContextComponent(
  component: "market" | "sector",
  context?: AMSAContextInput,
): AMSAComponentResult {
  const input = resolveContextComponentInput(context, component);

  return buildContextComponent({
    component,
    label:
      input?.label ??
      (component === "market" ? "Market Alignment" : "Sector Alignment"),
    score: input?.score,
    confidence: input?.confidence,
    reasons: input?.reasons,
    warnings: input?.warnings,
    metrics: input?.metrics,
  });
}

function createOptionalContextComponent(
  component: "industry" | "alignment" | "portfolio",
  context?: AMSAContextInput,
): AMSAComponentResult | null {
  const input = resolveContextComponentInput(context, component);

  if (!shouldIncludeOptionalContext(input)) {
    return null;
  }

  return buildContextComponent({
    component,
    label:
      input?.label ??
      (component === "industry"
        ? "Industry Leadership"
        : component === "alignment"
          ? "Context Alignment"
          : "Portfolio Alignment"),
    score: input?.score,
    confidence: input?.confidence,
    reasons: input?.reasons,
    warnings: input?.warnings,
    metrics: input?.metrics,
  });
}

function defaultReason(label: string, score: number): string {
  if (score >= 70) {
    return `${label} supports the stock's current state.`;
  }

  if (score <= 40) {
    return `${label} conflicts with the stock's current state.`;
  }

  return `${label} is neutral or mixed.`;
}