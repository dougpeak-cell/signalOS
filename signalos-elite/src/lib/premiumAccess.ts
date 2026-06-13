export type UserTier = "free" | "smart" | "pro";

export const SMART_PREVIEW_STARTED_EVENT = "signalos:smart-preview-started";
export const SMART_PREVIEW_COOKIE_KEY = "sigi_smart_preview_started";
export const SMART_PREVIEW_WINDOW_MINUTES = 10;
const SMART_PREVIEW_STORAGE_KEY = "sigi_smart_preview_started";
const SMART_PREVIEW_WINDOW_MS = SMART_PREVIEW_WINDOW_MINUTES * 60 * 1000;
const FEATURED_PREVIEW_TICKER = "MSFT";

function syncSmartPreviewCookie(startedAt: number | null) {
  if (typeof document === "undefined") return;

  if (startedAt == null) {
    document.cookie = `${SMART_PREVIEW_COOKIE_KEY}=; Max-Age=0; Path=/; SameSite=Lax`;
    return;
  }

  const remainingSeconds = Math.max(0, Math.ceil((SMART_PREVIEW_WINDOW_MS - (Date.now() - startedAt)) / 1000));

  if (remainingSeconds <= 0) {
    document.cookie = `${SMART_PREVIEW_COOKIE_KEY}=; Max-Age=0; Path=/; SameSite=Lax`;
    return;
  }

  document.cookie = `${SMART_PREVIEW_COOKIE_KEY}=${startedAt}; Max-Age=${remainingSeconds}; Path=/; SameSite=Lax`;
}

export function isSmartPreviewTimestampActive(value: string | number | null | undefined) {
  const startedAt = typeof value === "number" ? value : Number(value);
  return Number.isFinite(startedAt) && Date.now() - startedAt < SMART_PREVIEW_WINDOW_MS;
}

export function getTodayFeaturedStock() {
  return FEATURED_PREVIEW_TICKER;
}

export function getFeaturedPreviewTicker() {
  return FEATURED_PREVIEW_TICKER;
}

export function canUseTradingWorkspaceAccess({
  tier,
  ticker,
}: {
  tier: UserTier;
  ticker?: string;
}) {
  const normalizedTicker = ticker?.toUpperCase();

  if (tier === "pro") return true;

  return normalizedTicker === FEATURED_PREVIEW_TICKER;
}

export function isWeekendCryptoOpen() {
  const day = new Date().getDay();
  return day === 5 || day === 6 || day === 0;
}

export function startSmartPreview() {
  if (typeof window === "undefined") return;

  const startedAt = Date.now();
  localStorage.setItem(SMART_PREVIEW_STORAGE_KEY, startedAt.toString());
  syncSmartPreviewCookie(startedAt);
  window.dispatchEvent(new Event(SMART_PREVIEW_STARTED_EVENT));
}

export function isSmartPreviewActive() {
  if (typeof window === "undefined") return false;

  const started = localStorage.getItem(SMART_PREVIEW_STORAGE_KEY);
  if (!started) return false;

  const startedAt = Number(started);
  if (!Number.isFinite(startedAt)) {
    localStorage.removeItem(SMART_PREVIEW_STORAGE_KEY);
    syncSmartPreviewCookie(null);
    return false;
  }

  const active = isSmartPreviewTimestampActive(startedAt);

  if (!active) {
    localStorage.removeItem(SMART_PREVIEW_STORAGE_KEY);
    syncSmartPreviewCookie(null);
  } else {
    syncSmartPreviewCookie(startedAt);
  }

  return active;
}

export function getPremiumAccess({
  tier,
  ticker,
  feature,
  previewActive = false,
}: {
  tier: UserTier;
  ticker?: string;
  feature: "smart" | "pro" | "crypto" | "expert" | "stock";
  previewActive?: boolean;
}) {
  const featuredStock = getTodayFeaturedStock();
  const normalizedTicker = ticker?.toUpperCase();
  const hasSmartAccess = tier === "smart" || (previewActive && tier === "free");

  if (tier === "pro") return true;

  if (feature === "expert") return false;

  if (feature === "crypto" && isWeekendCryptoOpen()) return true;

  if (feature === "stock" && normalizedTicker === featuredStock) return true;

  if (hasSmartAccess) {
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
    syncSmartPreviewCookie(null);
    return 0;
  }

  const remaining = SMART_PREVIEW_WINDOW_MS - (Date.now() - startedAt);

  if (remaining <= 0) {
    localStorage.removeItem(SMART_PREVIEW_STORAGE_KEY);
    syncSmartPreviewCookie(null);
    return 0;
  }

  syncSmartPreviewCookie(startedAt);

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