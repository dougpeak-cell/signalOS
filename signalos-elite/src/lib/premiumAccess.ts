export type UserTier = "free" | "smart" | "pro";

export const SMART_PREVIEW_STARTED_EVENT = "signalos:smart-preview-started";
const SMART_PREVIEW_STORAGE_KEY = "sigi_smart_preview_started";
const SMART_PREVIEW_WINDOW_MS = 30 * 60 * 1000;

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

  localStorage.setItem(SMART_PREVIEW_STORAGE_KEY, Date.now().toString());
  window.dispatchEvent(new Event(SMART_PREVIEW_STARTED_EVENT));
}

export function isSmartPreviewActive() {
  if (typeof window === "undefined") return false;

  const started = localStorage.getItem(SMART_PREVIEW_STORAGE_KEY);
  if (!started) return false;

  const startedAt = Number(started);
  if (!Number.isFinite(startedAt)) {
    localStorage.removeItem(SMART_PREVIEW_STORAGE_KEY);
    return false;
  }

  const active = Date.now() - startedAt < SMART_PREVIEW_WINDOW_MS;

  if (!active) {
    localStorage.removeItem(SMART_PREVIEW_STORAGE_KEY);
  }

  return active;
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

  const started = localStorage.getItem(SMART_PREVIEW_STORAGE_KEY);
  if (!started) return 0;

  const startedAt = Number(started);
  if (!Number.isFinite(startedAt)) {
    localStorage.removeItem(SMART_PREVIEW_STORAGE_KEY);
    return 0;
  }

  const remaining = SMART_PREVIEW_WINDOW_MS - (Date.now() - startedAt);

  if (remaining <= 0) {
    localStorage.removeItem(SMART_PREVIEW_STORAGE_KEY);
    return 0;
  }

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