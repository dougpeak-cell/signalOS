export type CryptoAssetDirectoryItem = {
  symbol: string;
  name: string;
};

export type CryptoBoardConfig = {
  variant?: "general" | "meme" | "defi" | "rwa";
  eyebrow: string;
  title: string;
  description: string;
  sectionTitle: string;
  refreshLabel: string;
  initialTickers: string[];
  directory: CryptoAssetDirectoryItem[];
  moreTickers?: string[];
  searchPlaceholder?: string;
};

export const CRYPTO_DIRECTORY: CryptoAssetDirectoryItem[] = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "XRP", name: "XRP" },
  { symbol: "DOGE", name: "Dogecoin" },
  { symbol: "ADA", name: "Cardano" },
  { symbol: "AVAX", name: "Avalanche" },
  { symbol: "LINK", name: "Chainlink" },
  { symbol: "MATIC", name: "Polygon" },
  { symbol: "LTC", name: "Litecoin" },
  { symbol: "BNB", name: "BNB" },
  { symbol: "DOT", name: "Polkadot" },
  { symbol: "UNI", name: "Uniswap" },
  { symbol: "AAVE", name: "Aave" },
  { symbol: "ATOM", name: "Cosmos" },
  { symbol: "NEAR", name: "Near Protocol" },
  { symbol: "FIL", name: "Filecoin" },
  { symbol: "ARB", name: "Arbitrum" },
  { symbol: "OP", name: "Optimism" },
  { symbol: "ETC", name: "Ethereum Classic" },
  { symbol: "BCH", name: "Bitcoin Cash" },
  { symbol: "SHIB", name: "Shiba Inu" },
  { symbol: "PEPE", name: "Pepe" },
  { symbol: "BONK", name: "Bonk" },
  { symbol: "FLOKI", name: "Floki" },
  { symbol: "WIF", name: "dogwifhat" },
  { symbol: "POPCAT", name: "Popcat" },
  { symbol: "MOG", name: "Mog Coin" },
  { symbol: "TRUMP", name: "Official Trump" },
  { symbol: "SPX", name: "SPX6900" },
  { symbol: "TURBO", name: "Turbo" },
  { symbol: "NEIRO", name: "Neiro" },
  { symbol: "GOAT", name: "Goatseus Maximus" },
  { symbol: "GIGA", name: "Gigachad" },
  { symbol: "MEW", name: "cat in a dogs world" },
  { symbol: "PNUT", name: "Peanut the Squirrel" },
  { symbol: "MOODENG", name: "Moo Deng" },
  { symbol: "APU", name: "Apu Apustaja" },
  { symbol: "MELANIA", name: "Melania Meme" },
  { symbol: "PONKE", name: "Ponke" },
  { symbol: "FWOG", name: "Fwog" },
  { symbol: "MEME", name: "Memecoin" },
  { symbol: "COMP", name: "Compound" },
  { symbol: "CRV", name: "Curve DAO" },
  { symbol: "SUSHI", name: "Sushi" },
  { symbol: "SNX", name: "Synthetix" },
  { symbol: "LDO", name: "Lido DAO" },
  { symbol: "RUNE", name: "THORChain" },
  { symbol: "PENDLE", name: "Pendle" },
  { symbol: "DYDX", name: "dYdX" },
  { symbol: "JUP", name: "Jupiter" },
  { symbol: "ENA", name: "Ethena" },
  { symbol: "1INCH", name: "1inch" },
  { symbol: "CVX", name: "Convex Finance" },
  { symbol: "GMX", name: "GMX" },
  { symbol: "BAL", name: "Balancer" },
  { symbol: "KNC", name: "Kyber Network" },
  { symbol: "ZRX", name: "0x" },
  { symbol: "COW", name: "CoW Protocol" },
  { symbol: "MORPHO", name: "Morpho" },
  { symbol: "AERO", name: "Aerodrome" },
  { symbol: "LQTY", name: "Liquity" },
  { symbol: "ACH", name: "Alchemy Pay" },
  { symbol: "BNT", name: "Bancor" },
  { symbol: "FXS", name: "Frax Share" },
  { symbol: "ONDO", name: "Ondo" },
  { symbol: "CFG", name: "Centrifuge" },
  { symbol: "GFI", name: "Goldfinch" },
  { symbol: "PAXG", name: "PAX Gold" },
  { symbol: "XAUT", name: "Tether Gold" },
  { symbol: "TRU", name: "TrueFi" },
  { symbol: "PRO", name: "Propy" },
  { symbol: "CPOOL", name: "Clearpool" },
  { symbol: "HBAR", name: "Hedera" },
  { symbol: "XLM", name: "Stellar" },
  { symbol: "ALGO", name: "Algorand" },
  { symbol: "VET", name: "VeChain" },
  { symbol: "XDC", name: "XDC Network" },
  { symbol: "LCX", name: "LCX" },
  { symbol: "QNT", name: "Quant" },
];

export const CRYPTO_NAME_BY_SYMBOL = Object.fromEntries(
  CRYPTO_DIRECTORY.map((item) => [item.symbol, item.name])
) as Record<string, string>;

export const MORE_CRYPTO = [
  "BNB",
  "DOT",
  "UNI",
  "AAVE",
  "ATOM",
  "NEAR",
  "FIL",
  "ARB",
  "OP",
  "ETC",
  "BCH",
  "SHIB",
];

export const CRYPTO_PAGE_ATTACHMENTS = [
  {
    label: "Crypto",
    value: "Main board",
    href: "/crypto",
  },
  {
    label: "News",
    value: "Crypto headlines",
    href: "/crypto/news",
  },
  {
    label: "Meme",
    value: "Community leaders",
    href: "/crypto/meme",
  },
  {
    label: "DeFi",
    value: "Protocol market board",
    href: "/crypto/defi",
  },
  {
    label: "RWA",
    value: "Tokenized asset board",
    href: "/crypto/rwa",
  },
];

export const DEFAULT_CRYPTO_BOARD: CryptoBoardConfig = {
  variant: "general",
  eyebrow: "Sigi Crypto",
  title: "Crypto Command Center",
  description:
    "Live crypto prices, momentum pressure, volume activity, and Sigi trader reads powered by your expanded market data access.",
  sectionTitle: "Live Crypto Board",
  refreshLabel: "Refreshes every 30 seconds.",
  initialTickers: ["BTC", "ETH", "SOL", "XRP", "DOGE", "ADA", "AVAX", "LINK", "MATIC", "LTC"],
  directory: CRYPTO_DIRECTORY,
  moreTickers: MORE_CRYPTO,
  searchPlaceholder: "Search BTC, ETH, SOL...",
};

export const MEME_CRYPTO_BOARD: CryptoBoardConfig = {
  variant: "meme",
  eyebrow: "Sigi Meme",
  title: "Meme Coin Board",
  description:
    "Live meme-token prices, momentum pressure, and volume activity for the community-driven crypto names supported by your market data feed.",
  sectionTitle: "Live Meme Board",
  refreshLabel: "Refreshes every 30 seconds.",
  initialTickers: ["DOGE", "SHIB", "PEPE", "BONK", "FLOKI", "WIF", "POPCAT", "MOG", "TRUMP", "SPX", "TURBO", "NEIRO", "GOAT", "GIGA", "MEW", "PNUT", "MOODENG", "APU", "MELANIA", "PONKE", "FWOG", "MEME"],
  directory: CRYPTO_DIRECTORY.filter((item) => ["DOGE", "SHIB", "PEPE", "BONK", "FLOKI", "WIF", "POPCAT", "MOG", "TRUMP", "SPX", "TURBO", "NEIRO", "GOAT", "GIGA", "MEW", "PNUT", "MOODENG", "APU", "MELANIA", "PONKE", "FWOG", "MEME"].includes(item.symbol)),
  searchPlaceholder: "Search DOGE, PEPE, WIF...",
};

export const DEFI_CRYPTO_BOARD: CryptoBoardConfig = {
  variant: "defi",
  eyebrow: "Sigi DeFi",
  title: "DeFi Command Center",
  description:
    "Live DeFi and on-chain protocol prices for trading, lending, and liquidity infrastructure names supported by your crypto market feed.",
  sectionTitle: "Live DeFi Board",
  refreshLabel: "Refreshes every 30 seconds.",
  initialTickers: ["UNI", "AAVE", "COMP", "CRV", "SUSHI", "SNX", "LDO", "RUNE", "PENDLE", "DYDX", "JUP", "ENA", "1INCH", "CVX", "GMX", "BAL", "KNC", "ZRX", "COW", "MORPHO", "AERO", "LQTY", "ACH", "BNT", "FXS"],
  directory: CRYPTO_DIRECTORY.filter((item) => ["UNI", "AAVE", "COMP", "CRV", "SUSHI", "SNX", "LDO", "RUNE", "PENDLE", "DYDX", "JUP", "ENA", "1INCH", "CVX", "GMX", "BAL", "KNC", "ZRX", "COW", "MORPHO", "AERO", "LQTY", "ACH", "BNT", "FXS"].includes(item.symbol)),
  searchPlaceholder: "Search UNI, AAVE, COMP...",
};

export const RWA_CRYPTO_BOARD: CryptoBoardConfig = {
  variant: "rwa",
  eyebrow: "Sigi RWA",
  title: "RWA Command Center",
  description:
    "Live tokenized real-world-asset and yield-linked crypto prices for the supported RWA names currently available on your market data feed.",
  sectionTitle: "Live RWA Board",
  refreshLabel: "Refreshes every 30 seconds.",
  initialTickers: ["ONDO", "CFG", "GFI", "PAXG", "XAUT", "TRU", "PRO", "CPOOL", "HBAR", "XLM", "ALGO", "VET", "XRP", "LINK", "XDC", "LCX", "QNT"],
  directory: CRYPTO_DIRECTORY.filter((item) => ["ONDO", "CFG", "GFI", "PAXG", "XAUT", "TRU", "PRO", "CPOOL", "HBAR", "XLM", "ALGO", "VET", "XRP", "LINK", "XDC", "LCX", "QNT"].includes(item.symbol)),
  searchPlaceholder: "Search ONDO, CFG, PAXG...",
};