export type SigiProfile = {
  name: string;
  interests: string[];
};

export type SigiInterestDefinition = {
  label: string;
  aliases?: string[];
  primarySectors?: string[];
  themeTags?: string[];
  tickers?: string[];
};

export const SIGI_INTEREST_DEFINITIONS: SigiInterestDefinition[] = [
  { label: "Technology" },
  { label: "AI" },
  { label: "Semiconductors" },
  { label: "Energy" },
  { label: "Healthcare" },
  { label: "Financials" },
  { label: "Consumer Discretionary" },
  { label: "Consumer Staples" },
  { label: "Industrials" },
  { label: "Materials" },
  { label: "Utilities" },
  { label: "Real Estate" },
  { label: "Communication Services" },
  { label: "Small Caps" },
  { label: "Dividends" },
  { label: "Crypto" },
  { label: "ETFs" },
  { label: "Options" },
  {
    label: "Space & Satellite",
    aliases: ["New Space"],
    primarySectors: ["Industrials", "Technology"],
    themeTags: ["SPACE", "SATELLITE", "LAUNCH"],
    tickers: ["RKLB", "ASTS", "LUNR", "PL", "SPCE"],
  },
  { label: "Long-term Investing" },
  { label: "Short-term Trading" },
];

export const SIGI_INTEREST_OPTIONS = SIGI_INTEREST_DEFINITIONS.map(
  (definition) => definition.label
);

export const SIGI_PROFILE_CHANGED_EVENT = "signalos:sigi-profile-changed";

const SIGI_PROFILE_KEY = "sigiProfile";
const LEGACY_SIGI_PROFILE_KEYS = ["signalos-sigi-profile", "sigiUserName", "sigiInterests"] as const;

export function getSigiInterestDefinition(interest: string) {
  const normalizedInterest = interest.trim().toLowerCase();

  return SIGI_INTEREST_DEFINITIONS.find((definition) => {
    if (definition.label.trim().toLowerCase() === normalizedInterest) return true;

    return (definition.aliases ?? []).some(
      (alias) => alias.trim().toLowerCase() === normalizedInterest
    );
  }) ?? null;
}

function canonicalizeSigiInterests(interests: string[]) {
  return Array.from(
    new Set(
      interests
        .map((interest) => getSigiInterestDefinition(interest)?.label ?? interest.trim())
        .filter(Boolean)
    )
  );
}

function dispatchSigiProfileChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SIGI_PROFILE_CHANGED_EVENT));
}

function normalizeSigiProfile(value: unknown): SigiProfile | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as {
    name?: unknown;
    interests?: unknown;
  };

  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  const interests = Array.isArray(candidate.interests)
    ? canonicalizeSigiInterests(
        candidate.interests
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
      )
    : [];

  if (!name && interests.length === 0) return null;

  return {
    name,
    interests,
  };
}

export function getSigiProfile(): SigiProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(SIGI_PROFILE_KEY);
    const parsed = raw ? normalizeSigiProfile(JSON.parse(raw)) : null;
    if (parsed) return parsed;

    for (const key of LEGACY_SIGI_PROFILE_KEYS) {
      const legacyRaw = window.localStorage.getItem(key);
      if (!legacyRaw) continue;

      const legacyParsed = normalizeSigiProfile(JSON.parse(legacyRaw));
      if (legacyParsed) {
        saveSigiProfile(legacyParsed);
        return legacyParsed;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function saveSigiProfile(profile: SigiProfile) {
  if (typeof window === "undefined") return;

  const normalized = normalizeSigiProfile(profile);
  if (!normalized) return;

  window.localStorage.setItem(SIGI_PROFILE_KEY, JSON.stringify(normalized));
  window.localStorage.removeItem("signalos-sigi-profile");
  dispatchSigiProfileChanged();
}

export function updateSigiInterests(interests: string[]): SigiProfile | null {
  if (typeof window === "undefined") return null;

  const current = getSigiProfile();
  const next: SigiProfile = {
    name: current?.name ?? "",
    interests,
  };

  saveSigiProfile(next);
  return getSigiProfile();
}

export function clearSigiProfile() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SIGI_PROFILE_KEY);

  for (const key of LEGACY_SIGI_PROFILE_KEYS) {
    window.localStorage.removeItem(key);
  }

  dispatchSigiProfileChanged();
}

export function buildSigiProfilePrompt(profile: SigiProfile | null) {
  if (!profile) return "";

  const interestSummary = profile.interests.length
    ? profile.interests
        .map((interest) => {
          const definition = getSigiInterestDefinition(interest);
          if (!definition) return interest;

          const details = [
            definition.primarySectors?.length
              ? `Primary sectors: ${definition.primarySectors.join(", ")}`
              : null,
            definition.themeTags?.length
              ? `Theme tags: ${definition.themeTags.join(", ")}`
              : null,
          ].filter(Boolean);

          return details.length
            ? `${definition.label} (${details.join(" | ")})`
            : definition.label;
        })
        .join(", ")
    : "not selected";

  return `
User profile:
- Name: ${profile.name || "friend"}
- Interests: ${interestSummary}

SIGI behavior:
- Use the user's name naturally, but not every sentence.
- Connect answers to the user's interests when useful.
`;
}