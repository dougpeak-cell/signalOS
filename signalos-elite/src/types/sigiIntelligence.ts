export type SigiIntelligenceCard = {
  ticker: string;
  companyName: string;
  signalOSScore: number;
  trendDirection: "Bullish" | "Bearish" | "Neutral";
  momentumStatus: "Strong" | "Improving" | "Weakening" | "Mixed";
  sectorStrength: "Strong" | "Moderate" | "Weak";
  riskMeter: "Low" | "Medium" | "High";
  analystConfidence: "High" | "Strong" | "Moderate" | "Speculative";
  suggestedAction: "Watch" | "Research" | "Avoid" | "Hold" | "Consider Entry";
  keyLevels: {
    support: string;
    resistance: string;
    breakout: string;
  };
  bullCase: string[];
  bearCase: string[];
  summary: string;
  disclaimer: string;
};