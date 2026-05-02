import { fundamentalsPack } from "@/lib/education/fundamentalsPack";

type EducationEntry = {
  id: string;
  term: string;
  category: string;
  definition: string;
  explanation?: string;
  formula?: string;
  sigiInsight?: string;
  example?: string;
};

const EDUCATION_ALIASES: Record<string, string> = {
  roe: "ROE",
  "return on equity": "ROE",
  pe: "P/E Ratio",
  "p/e": "P/E Ratio",
  "pe ratio": "P/E Ratio",
  "p/e ratio": "P/E Ratio",
  eps: "EPS",
  revenue: "Revenue",
  "revenue growth": "Revenue Growth",
  "free cash flow": "Free Cash Flow",
  fcf: "Free Cash Flow",
  "gross margin": "Gross Margin",
  "operating margin": "Operating Margin",
  "debt to equity": "Debt-to-Equity",
  "debt-to-equity": "Debt-to-Equity",
  "market cap": "Market Cap",
  beta: "Beta",
  "52w high": "52-Week High",
  "52 week high": "52-Week High",
  "52-week high": "52-Week High",
  "52w low": "52-Week Low",
  "52 week low": "52-Week Low",
  "52-week low": "52-Week Low",
  ebitda: "EBITDA",
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9/ ]/g, "").trim();
}

export function findEducationEntry(message: string): EducationEntry | null {
  const clean = normalize(message);

  for (const [alias, term] of Object.entries(EDUCATION_ALIASES)) {
    if (clean.includes(alias)) {
      return (
        fundamentalsPack.find(
          (entry) => entry.term.toLowerCase() === term.toLowerCase()
        ) ?? null
      );
    }
  }

  return (
    fundamentalsPack.find((entry) =>
      clean.includes(entry.term.toLowerCase())
    ) ?? null
  );
}

export function buildEducationAnswer(entry: EducationEntry, name = "friend") {
  return `${name}, here's the simple explanation:

${entry.term}: ${entry.definition}

Why it matters:
${entry.explanation ?? "This helps investors understand company quality."}

${entry.formula ? `Formula:\n${entry.formula}\n` : ""}
${entry.example ? `Example:\n${entry.example}\n` : ""}
SIGI Read:
${entry.sigiInsight ?? "Use this as one piece of the full stock picture."}`;
}