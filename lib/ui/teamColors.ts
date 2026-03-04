export type TeamKey = string | null | undefined;

const TEAM_COLORS: Record<string, { a: string; b: string }> = {
  // NCAA examples — add/adjust as you like
  duke: { a: "#0A2D7A", b: "#1E6EEB" },
  kansas: { a: "#0051BA", b: "#E8000D" },
  unc: { a: "#7BAFD4", b: "#0A2D7A" },
  gonzaga: { a: "#041E42", b: "#C8102E" },
  kentucky: { a: "#0033A0", b: "#4F8EF7" },

  // fallback-ish
  default: { a: "#0b1220", b: "#111827" },
};

function normalizeTeamKey(team: TeamKey) {
  const t = (team ?? "").toString().trim().toLowerCase();
  return t.replace(/[^a-z0-9]+/g, " ").trim();
}

// Heuristic: try exact, then try first token
export function getTeamGradient(teamName: TeamKey) {
  const key = normalizeTeamKey(teamName);
  if (!key) return TEAM_COLORS.default;

  if (TEAM_COLORS[key]) return TEAM_COLORS[key];

  const first = key.split(" ")[0];
  if (TEAM_COLORS[first]) return TEAM_COLORS[first];

  return TEAM_COLORS.default;
}

// Use this for inline style background
export function gradientStyle(teamName: TeamKey) {
  const { a, b } = getTeamGradient(teamName);
  return {
    backgroundImage: `radial-gradient(1200px circle at 10% 10%, ${a}55 0%, transparent 40%),
                      radial-gradient(900px circle at 90% 30%, ${b}55 0%, transparent 45%),
                      linear-gradient(135deg, #0b1220 0%, #0f172a 55%, #0b1220 100%)`,
  } as const;
}