type SigiResponseInput = {
  name: string;
  ticker?: string | null;
  intent: string;
  data?: {
    bias?: string;
    trend?: string;
    risk?: string;
    catalyst?: string;
  };
};

export function buildSigiResponse({
  name,
  ticker,
  intent,
  data,
}: SigiResponseInput) {
  if (ticker) {
    return `
${name}, here’s what matters for ${ticker}:

• Setup: ${data?.trend ?? "Analyzing structure"}
• Bias: ${data?.bias ?? "Neutral until confirmation"}
• Catalyst: ${data?.catalyst ?? "Monitoring drivers"}
• Risk: ${data?.risk ?? "Loss of structure"}

Next step:
Do you want entry levels, targets, or a trade setup?
`;
  }

  if (intent === "sector") {
    return `
${name}, here’s the sector view:

• Trend: ${data?.trend ?? "Mixed"}
• Leadership: Developing
• Risk: Rotation or fade

Next step:
Give me a stock in this sector and I’ll break it down.
`;
  }

  if (intent === "market") {
    return `
${name}, here’s the current market read:

• Structure: ${data?.trend ?? "Balanced"}
• Risk Mode: ${data?.bias ?? "Neutral"}
• Focus: Leadership + confirmation

Next step:
Let’s find the best stock to act on.
`;
  }

  return `
${name}, I can break down stocks, sectors, or the market.

What would you like to focus on?
`;
}
