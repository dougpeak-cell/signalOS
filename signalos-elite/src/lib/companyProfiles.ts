export type CompanyProfile = {
  ticker: string;
  name: string;
  description: string;
  sector?: string;
  industry?: string;
  logo?: string | null;
  weburl?: string | null;
};

export const COMPANY_PROFILES: Record<string, CompanyProfile> = {
  AAPL: {
    ticker: "AAPL",
    name: "Apple Inc.",
    description:
      "Apple designs consumer electronics, software, and services including iPhone, Mac, iPad, and its ecosystem.",
    sector: "Technology",
    industry: "Consumer Electronics",
  },
  AMZN: {
    ticker: "AMZN",
    name: "Amazon.com, Inc.",
    description:
      "Amazon operates e-commerce, AWS cloud computing, digital advertising, logistics, and subscription services.",
    sector: "Consumer Cyclical",
    industry: "Internet Retail",
  },
  XOM: {
    ticker: "XOM",
    name: "Exxon Mobil Corporation",
    description:
      "Exxon Mobil explores, produces, refines, and markets oil, natural gas, fuels, chemicals, and energy products worldwide.",
    sector: "Energy",
    industry: "Oil & Gas Integrated",
  },
  GOOGL: {
    ticker: "GOOGL",
    name: "Alphabet Inc.",
    description:
      "Alphabet is the parent of Google, focused on search, advertising, cloud, AI, and digital platforms.",
    sector: "Communication Services",
    industry: "Internet Content & Information",
  },
  INTC: {
    ticker: "INTC",
    name: "Intel Corporation",
    description:
      "Intel designs and manufactures semiconductors for PCs, servers, and AI infrastructure.",
    sector: "Technology",
    industry: "Semiconductors",
  },
  LIVE: {
    ticker: "LIVE",
    name: "Live Ventures Incorporated",
    description:
      "Live Ventures is a diversified holding company with exposure to retail, flooring, and manufacturing businesses.",
    sector: "Consumer Cyclical",
    industry: "Diversified Holding Company",
  },
  MSFT: {
    ticker: "MSFT",
    name: "Microsoft Corporation",
    description:
      "Microsoft develops software, cloud computing (Azure), AI, and enterprise productivity tools.",
    sector: "Technology",
    industry: "Software",
  },
  MU: {
    ticker: "MU",
    name: "Micron Technology, Inc.",
    description:
      "Micron designs and manufactures memory and storage solutions, including DRAM and NAND, used in data centers, AI systems, and consumer devices.",
    sector: "Technology",
    industry: "Semiconductors",
  },
  NVDA: {
    ticker: "NVDA",
    name: "NVIDIA Corporation",
    description:
      "NVIDIA designs GPUs and AI infrastructure powering data centers, gaming, and artificial intelligence workloads.",
    sector: "Technology",
    industry: "Semiconductors",
  },
  TSLA: {
    ticker: "TSLA",
    name: "Tesla, Inc.",
    description:
      "Tesla designs electric vehicles, energy storage, and AI-driven autonomous systems.",
    sector: "Consumer Cyclical",
    industry: "Auto Manufacturers",
  },
};
