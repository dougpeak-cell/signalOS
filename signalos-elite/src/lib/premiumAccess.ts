export type UserTier = "free" | "smart" | "pro";

const FEATURED_STOCKS = ["NVDA", "TSLA", "PLTR", "AAPL", "MSFT", "AMD", "META"];

export function getTodayFeaturedStock() {
  const today = new Date();
  const dayIndex = today.getDay();
  return FEATURED_STOCKS[dayIndex] ?? "NVDA";
}

export function isWeekendCryptoOpen() {
  const day = new Date().getDay();
  return day === 5 || day === 6 || day === 0;
}

export function startSmartPreview() {
  if (typeof window === "undefined") return;

  const existing = localStorage.getItem("sigi_smart_preview_started");
  if (!existing) {
    localStorage.setItem("sigi_smart_preview_started", Date.now().toString());
  }
}

export function isSmartPreviewActive() {
  if (typeof window === "undefined") return false;

  const started = localStorage.getItem("sigi_smart_preview_started");
  if (!started) return false;

  const startedAt = Number(started);
  const oneHour = 60 * 60 * 1000;

  return Date.now() - startedAt < oneHour;
}

export function getPremiumAccess({
  tier,
  ticker,
  feature,
}: {
  tier: UserTier;
  ticker?: string;
  feature: "smart" | "pro" | "crypto" | "expert" | "stock";
}) {
  const featuredStock = getTodayFeaturedStock();
  const normalizedTicker = ticker?.toUpperCase();

  if (tier === "pro") return true;

  if (isSmartPreviewActive()) return true;

  if (feature === "crypto" && isWeekendCryptoOpen()) return true;

  if (feature === "stock" && normalizedTicker === featuredStock) return true;

  if (feature === "expert") return false;

  if (tier === "smart") {
    if (feature === "pro") return false;
    return true;
  }

  return false;
}