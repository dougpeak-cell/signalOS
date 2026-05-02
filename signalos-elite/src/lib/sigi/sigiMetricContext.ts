import {
  buildEducationAnswer,
  findEducationEntry,
} from "@/lib/sigi/sigiEducationLookup";

type MetricContextInput = {
  term: string;
  ticker?: string | null;
  value?: string | number | null;
  name?: string | null;
  userName?: string | null;
};

export function buildMetricContextAnswer({
  term,
  ticker,
  value,
  name,
  userName,
}: MetricContextInput) {
  const entry = findEducationEntry(term);

  if (!entry) {
    return `${userName || "friend"}, I can explain ${term}, but I do not have that term in the education library yet.`;
  }

  const cleanTicker = ticker?.trim().toUpperCase();
  const displayName = name || cleanTicker || "this company";
  const displayValue =
    value !== null && value !== undefined && value !== "" ? String(value) : null;

  const valueLine = displayValue
    ? `${cleanTicker ? `${cleanTicker}'s` : "This company's"} ${entry.term} is ${displayValue}.`
    : `${cleanTicker ? `${cleanTicker}'s` : "This company's"} ${entry.term} is not loaded yet.`;

  return `${userName || "friend"}, here’s what ${entry.term} means for ${displayName}:

${valueLine}

Meaning:
${entry.definition}

Why it matters:
${entry.explanation ?? "This helps you judge company quality, valuation, or financial strength."}

SIGI Context:
For ${displayName}, this metric should be used with trend, growth, margins, debt, and price action. A strong number is better when it is improving over time and supported by market leadership.

${entry.formula ? `Formula:\n${entry.formula}\n` : ""}
${entry.example ? `Example:\n${entry.example}` : ""}`;
}