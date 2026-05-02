import type { SigiTodayContext } from "@/hooks/useSigi";

export const MOBILE_SIGI_OPEN_EVENT = "signalos:mobile-sigi-open";

let cachedMobileSigiContext: SigiTodayContext | null = null;

export type MobileSigiOpenDetail = {
  prompt?: string;
  context?: SigiTodayContext | null;
  autoSubmit?: boolean;
};

export function setMobileSigiSheetDefaultContext(context: SigiTodayContext | null) {
  cachedMobileSigiContext = context;
}

export function getMobileSigiSheetDefaultContext() {
  return cachedMobileSigiContext;
}

export function openMobileSigiSheet(detail?: MobileSigiOpenDetail) {
  if (typeof window === "undefined") return;

  const resolvedContext = detail?.context ?? cachedMobileSigiContext;

  window.dispatchEvent(
    new CustomEvent<MobileSigiOpenDetail>(MOBILE_SIGI_OPEN_EVENT, {
      detail: {
        ...detail,
        context: resolvedContext,
      },
    })
  );
}