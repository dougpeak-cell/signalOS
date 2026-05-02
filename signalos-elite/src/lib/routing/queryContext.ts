export function normalizeQueryValue(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

export function normalizeLower(value: string | null | undefined): string {
  return normalizeQueryValue(value).toLowerCase();
}

export function matchesThemeOrSector(
  candidate: string | null | undefined,
  query: string | null | undefined
): boolean {
  const left = normalizeLower(candidate);
  const right = normalizeLower(query);

  if (!left || !right) return false;
  return left.includes(right) || right.includes(left);
}

export function isLeadershipView(view: string | null | undefined): boolean {
  return normalizeLower(view) === "leadership";
}

export function isOpportunitiesView(view: string | null | undefined): boolean {
  return normalizeLower(view) === "opportunities";
}

export function isRiskView(view: string | null | undefined): boolean {
  return normalizeLower(view) === "risk";
}

export function isRegimePanel(panel: string | null | undefined): boolean {
  return normalizeLower(panel) === "regime";
}

export function normalizeRegimeValue(value: string | null | undefined):
  | "bullish"
  | "neutral"
  | "riskoff"
  | "" {
  const v = normalizeLower(value);

  if (v === "bullish") return "bullish";
  if (v === "neutral") return "neutral";
  if (v === "risk off" || v === "risk-off" || v === "riskoff") return "riskoff";
  return "";
}