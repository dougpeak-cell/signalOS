export type ParsedSigiResponse = {
  bias?: string;
  momentum?: string;
  setup?: string;
  entry?: string;
  stop?: string;
  target?: string;
  risk?: string;
  invalidation?: string;
  action?: string;
  raw: string;
};

const FIELD_MAP: Record<string, keyof ParsedSigiResponse> = {
  bias: "bias",
  momentum: "momentum",
  setup: "setup",
  entry: "entry",
  stop: "stop",
  target: "target",
  risk: "risk",
  invalidation: "invalidation",
  action: "action",
};

export function parseStructuredSigi(raw: string): ParsedSigiResponse {
  const parsed: ParsedSigiResponse = { raw };

  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const match = line.match(/^([A-Za-z ]+):\s*(.+)$/);
    if (!match) continue;

    const key = match[1].trim().toLowerCase();
    const value = match[2].trim();
    const mapped = FIELD_MAP[key];

    if (mapped) {
      parsed[mapped] = value;
    }
  }

  return parsed;
}