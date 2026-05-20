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

export function getSmartPreviewRemainingMs() {
  if (typeof window === "undefined") return 0;

  const started = localStorage.getItem("sigi_smart_preview_started");
  if (!started) return 0;

  const startedAt = Number(started);
  const oneHour = 60 * 60 * 1000;
  const remaining = oneHour - (Date.now() - startedAt);

  return Math.max(0, remaining);
}

export function formatRemainingTime(ms: number) {
  const totalMinutes = Math.ceil(ms / 60000);

  if (totalMinutes <= 0) return "Expired";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) return `${hours}h ${minutes}m left`;

  return `${minutes}m left`;
}