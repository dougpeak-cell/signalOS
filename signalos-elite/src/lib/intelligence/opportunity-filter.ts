type Candidate = {
  symbol: string;
  name?: string;
  securityType?: string;
  price?: number;
  volume?: number;
  averageVolume?: number;
  changePercent?: number;
  opportunityScore?: number;
  riskScore?: number;
  confidence?: number;
};

const blockedTerms = [
  "warrant",
  "right",
  "unit",
  "preferred",
  "depositary",
];

export function qualifiesForVision(candidate: Candidate) {
  const securityType = candidate.securityType?.toLowerCase() ?? "";
  const name = candidate.name?.toLowerCase() ?? "";

  if (!candidate.symbol) return false;
  if (!Number.isFinite(candidate.price) || Number(candidate.price) < 2) {
    return false;
  }

  if (!Number.isFinite(candidate.volume) || Number(candidate.volume) <= 0) {
    return false;
  }

  if (
    blockedTerms.some(
      (term) => securityType.includes(term) || name.includes(term),
    )
  ) {
    return false;
  }

  if (Math.abs(Number(candidate.changePercent ?? 0)) > 30) {
    return false;
  }

  if (Number(candidate.opportunityScore ?? 0) < 70) {
    return false;
  }

  if (Number(candidate.confidence ?? 0) < 65) {
    return false;
  }

  if (Number(candidate.riskScore ?? 100) > 75) {
    return false;
  }

  return true;
}