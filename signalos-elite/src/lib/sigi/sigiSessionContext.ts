export type SigiSessionContext = {
  lastTicker: string | null;
  lastSector: string | null;
  lastIntent: string | null;
  lastMessage: string | null;
};

const SIGI_SESSION_CONTEXT_KEY = "signalos-sigi-session-context";

const DEFAULT_CONTEXT: SigiSessionContext = {
  lastTicker: null,
  lastSector: null,
  lastIntent: null,
  lastMessage: null,
};

export function getSigiSessionContext(): SigiSessionContext {
  if (typeof window === "undefined") return DEFAULT_CONTEXT;

  try {
    const raw = window.sessionStorage.getItem(SIGI_SESSION_CONTEXT_KEY);
    return raw ? { ...DEFAULT_CONTEXT, ...JSON.parse(raw) } : DEFAULT_CONTEXT;
  } catch {
    return DEFAULT_CONTEXT;
  }
}

export function saveSigiSessionContext(patch: Partial<SigiSessionContext>) {
  if (typeof window === "undefined") return;

  const current = getSigiSessionContext();
  const next = {
    ...current,
    ...patch,
  };

  window.sessionStorage.setItem(SIGI_SESSION_CONTEXT_KEY, JSON.stringify(next));
}

export function clearSigiSessionContext() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(SIGI_SESSION_CONTEXT_KEY);
}