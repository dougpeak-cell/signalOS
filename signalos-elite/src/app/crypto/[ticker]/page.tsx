"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CryptoPageTabs from "@/components/crypto/CryptoPageTabs";
import CryptoQuoteDetails from "@/components/crypto/CryptoQuoteDetails";
import { useResponsiveMobilePreviewFrame } from "@/components/shell/useResponsiveMobilePreview";
import LockedCryptoExperience from "@/components/upgrade/LockedCryptoExperience";
import { useSigiTier } from "@/hooks/useSigiTier";
import { useCryptoStreamState } from "@/hooks/useCryptoStream";
import { getPremiumAccess } from "@/lib/premiumAccess";
import {
  addCryptoWatchlistSymbol,
  upsertCryptoPortfolioHolding,
} from "@/lib/crypto/storage";
import { MARKET_TIME_ABBR, formatMarketClockTimeMs } from "@/lib/marketTime";

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type SnapshotRow = {
  ticker: string;
  symbol: string;
  name: string;
  price: number | null;
  changePercent: number | null;
  volume: number | null;
  high: number | null;
  low: number | null;
  open: number | null;
  updated: number | null;
};

type CryptoIntervalKey = "1m" | "5m" | "15m" | "1h" | "1d" | "1w";

const CRYPTO_INTERVAL_OPTIONS: ReadonlyArray<{
  key: CryptoIntervalKey;
  label: string;
  multiplier: string;
  timespan: "minute" | "hour" | "day" | "week";
  lookbackDays: number;
}> = [
  { key: "1m", label: "1m", multiplier: "1", timespan: "minute", lookbackDays: 1 },
  { key: "5m", label: "5m", multiplier: "5", timespan: "minute", lookbackDays: 1 },
  { key: "15m", label: "15m", multiplier: "15", timespan: "minute", lookbackDays: 2 },
  { key: "1h", label: "1H", multiplier: "1", timespan: "hour", lookbackDays: 14 },
  { key: "1d", label: "Day", multiplier: "1", timespan: "day", lookbackDays: 180 },
  { key: "1w", label: "Week", multiplier: "1", timespan: "week", lookbackDays: 730 },
];

const CRYPTO_IDENTITY: Record<
  string,
  {
    name: string;
    category: string;
    chain: string;
    description: string;
    website?: string;
    explorer?: string;
    docs?: string;
    x?: string;
  }
> = {
  BTC: {
    name: "Bitcoin",
    category: "Store of Value",
    chain: "Bitcoin",
    description: "The original decentralized digital asset and crypto market benchmark.",
    website: "https://bitcoin.org",
    explorer: "https://mempool.space",
  },
  ETH: {
    name: "Ethereum",
    category: "Layer 1 / Smart Contracts",
    chain: "Ethereum",
    description:
      "The leading smart-contract network powering DeFi, NFTs, stablecoins, and on-chain applications.",
    website: "https://ethereum.org",
    explorer: "https://etherscan.io",
  },
  SOL: {
    name: "Solana",
    category: "Layer 1 / High Throughput",
    chain: "Solana",
    description:
      "A high-speed blockchain ecosystem focused on low-cost transactions and consumer-scale crypto apps.",
    website: "https://solana.com",
    explorer: "https://solscan.io",
  },
  ARB: {
    name: "Arbitrum",
    category: "Layer 2 / Ethereum Scaling",
    chain: "Arbitrum",
    description:
      "An Ethereum Layer 2 ecosystem designed for faster and cheaper smart-contract execution.",
    website: "https://arbitrum.io",
    explorer: "https://arbiscan.io",
    docs: "https://docs.arbitrum.io",
  },
  ADA: {
    name: "Cardano",
    category: "Layer 1 / Smart Contracts",
    chain: "Cardano",
    description:
      "A research-driven blockchain network focused on security, scalability, and formal development.",
    website: "https://cardano.org",
    explorer: "https://cardanoscan.io",
  },
  XRP: {
    name: "XRP",
    category: "Payments / Settlement",
    chain: "XRP Ledger",
    description:
      "A digital asset used within the XRP Ledger ecosystem for fast settlement and payments.",
    website: "https://xrpl.org",
    explorer: "https://xrpscan.com",
  },
  DOGE: {
    name: "Dogecoin",
    category: "Payments / Meme",
    chain: "Dogecoin",
    description:
      "A community-driven digital asset originally created as a meme that now serves as a widely recognized payment token.",
    website: "https://dogecoin.com",
    explorer: "https://dogechain.info",
  },
  AVAX: {
    name: "Avalanche",
    category: "Layer 1 / Smart Contracts",
    chain: "Avalanche C-Chain",
    description:
      "A high-performance smart-contract network focused on fast finality, subnet architecture, and scalable on-chain applications.",
    website: "https://www.avax.network",
    explorer: "https://snowtrace.io",
    docs: "https://docs.avax.network",
  },
  LINK: {
    name: "Chainlink",
    category: "Oracle Infrastructure",
    chain: "Ethereum",
    description:
      "A decentralized oracle network that connects smart contracts to real-world data, cross-chain messaging, and off-chain computation.",
    website: "https://chain.link",
    explorer: "https://etherscan.io/token/0x514910771af9ca656af840dff83e8264ecf986ca",
    docs: "https://docs.chain.link",
  },
  MATIC: {
    name: "Polygon",
    category: "Ethereum Scaling / Sidechain",
    chain: "Polygon PoS",
    description:
      "An Ethereum scaling ecosystem best known for the Polygon PoS network and broader infrastructure for multichain applications.",
    website: "https://polygon.technology",
    explorer: "https://polygonscan.com",
    docs: "https://docs.polygon.technology",
  },
  LTC: {
    name: "Litecoin",
    category: "Payments",
    chain: "Litecoin",
    description:
      "A long-running proof-of-work digital asset designed for fast, low-cost peer-to-peer payments.",
    website: "https://litecoin.org",
    explorer: "https://blockchair.com/litecoin",
  },
  BNB: {
    name: "BNB",
    category: "Exchange / Layer 1 Utility",
    chain: "BNB Chain",
    description:
      "The native asset of the BNB Chain ecosystem, used across trading, payments, smart contracts, and on-chain applications.",
    website: "https://www.bnbchain.org",
    explorer: "https://bscscan.com",
    docs: "https://docs.bnbchain.org",
  },
  DOT: {
    name: "Polkadot",
    category: "Interoperability / Layer 0",
    chain: "Polkadot",
    description:
      "A multichain network designed to connect specialized blockchains through shared security and interoperability.",
    website: "https://polkadot.com",
    explorer: "https://polkadot.subscan.io",
    docs: "https://docs.polkadot.com",
  },
  UNI: {
    name: "Uniswap",
    category: "DeFi / Decentralized Exchange",
    chain: "Ethereum",
    description:
      "The governance token behind one of the largest decentralized exchange ecosystems in crypto markets.",
    website: "https://uniswap.org",
    explorer: "https://etherscan.io/token/0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
    docs: "https://docs.uniswap.org",
  },
  AAVE: {
    name: "Aave",
    category: "DeFi / Lending",
    chain: "Ethereum",
    description:
      "A decentralized liquidity protocol enabling borrowing, lending, and broader money-market functionality across chains.",
    website: "https://aave.com",
    explorer: "https://etherscan.io/token/0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9",
    docs: "https://docs.aave.com",
  },
  ATOM: {
    name: "Cosmos",
    category: "Interoperability / App Chains",
    chain: "Cosmos Hub",
    description:
      "The ATOM ecosystem centers on interoperable app-chains connected through the Cosmos stack and interchain messaging.",
    website: "https://cosmos.network",
    explorer: "https://www.mintscan.io/cosmos",
    docs: "https://docs.cosmos.network",
  },
  NEAR: {
    name: "Near Protocol",
    category: "Layer 1 / Smart Contracts",
    chain: "Near",
    description:
      "A developer-focused smart-contract network designed for scalability, usability, and consumer-friendly on-chain applications.",
    website: "https://near.org",
    explorer: "https://nearblocks.io",
    docs: "https://docs.near.org",
  },
  FIL: {
    name: "Filecoin",
    category: "Storage Infrastructure",
    chain: "Filecoin",
    description:
      "A decentralized storage network that incentivizes persistent data storage and retrieval through an open marketplace.",
    website: "https://filecoin.io",
    explorer: "https://filfox.info",
    docs: "https://docs.filecoin.io",
  },
  OP: {
    name: "Optimism",
    category: "Layer 2 / Ethereum Scaling",
    chain: "Optimism",
    description:
      "An Ethereum Layer 2 ecosystem focused on scaling smart-contract usage through optimistic rollup infrastructure.",
    website: "https://www.optimism.io",
    explorer: "https://optimistic.etherscan.io",
    docs: "https://docs.optimism.io",
  },
  ETC: {
    name: "Ethereum Classic",
    category: "Layer 1 / Smart Contracts",
    chain: "Ethereum Classic",
    description:
      "A proof-of-work smart-contract chain that continues the original Ethereum Classic network history.",
    website: "https://ethereumclassic.org",
    explorer: "https://blockscout.com/etc/mainnet",
  },
  BCH: {
    name: "Bitcoin Cash",
    category: "Payments",
    chain: "Bitcoin Cash",
    description:
      "A peer-to-peer electronic cash network created to emphasize lower fees and faster everyday transaction usage.",
    website: "https://bch.info",
    explorer: "https://blockchair.com/bitcoin-cash",
  },
  SHIB: {
    name: "Shiba Inu",
    category: "Meme / Community Token",
    chain: "Ethereum",
    description:
      "A community-driven token ecosystem built around the Shiba Inu brand with exchange, DeFi, and broader community participation themes.",
    website: "https://shibatoken.com",
    explorer: "https://etherscan.io/token/0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE",
  },
  PEPE: {
    name: "Pepe",
    category: "Meme / Community Token",
    chain: "Ethereum",
    description:
      "A meme-driven Ethereum token built around internet-native community attention, speculative trading, and social momentum.",
    website: "https://www.pepe.vip",
    explorer: "https://etherscan.io/token/0x6982508145454ce325ddbe47a25d4ec3d2311933",
  },
  BONK: {
    name: "Bonk",
    category: "Meme / Community Token",
    chain: "Solana",
    description:
      "A Solana-native meme token centered on community distribution, social trading activity, and ecosystem participation.",
    website: "https://bonkcoin.com",
    explorer: "https://solscan.io/token/DezXAZ8z7PnrnRJjz3wXBoRgixCa6ZqfT1pPB263h3Q",
  },
  FLOKI: {
    name: "Floki",
    category: "Meme / Community Token",
    chain: "Ethereum",
    description:
      "A meme-driven token ecosystem built around the Floki community, with branding across utility, gaming, and social trading narratives.",
    website: "https://floki.com",
    explorer: "https://etherscan.io/token/0xcf0c122c6b73f14e024acbcbf1d512b4beddfd25",
  },
  WIF: {
    name: "dogwifhat",
    category: "Meme / Community Token",
    chain: "Solana",
    description:
      "A Solana-native meme coin centered on internet culture, social momentum, and highly speculative community trading flows.",
    website: "https://dogwifcoin.org",
    explorer: "https://solscan.io/token/EKpQGSJtjMFqKZJ9uZgMDYf4M4sT4kD4Bq8R9Y1w5nP",
  },
  POPCAT: {
    name: "Popcat",
    category: "Meme / Community Token",
    chain: "Solana",
    description:
      "A social-first Solana meme coin tied to internet-native community participation and momentum trading behavior.",
    website: "https://www.popcatsol.com",
    explorer: "https://solscan.io/token/7GCihgDB8fe6KNw3QYDT1Q4uQkYHhYf8c92uYzLxgRkW",
  },
  MOG: {
    name: "Mog Coin",
    category: "Meme / Community Token",
    chain: "Ethereum",
    description:
      "An Ethereum meme token shaped by social virality, internet culture, and high-beta speculative trading flows.",
    website: "https://mogcoin.xyz",
    explorer: "https://etherscan.io/token/0xaaeE88e859dF4eB5A4A031c21fA4eF15eeF1D9A8",
  },
  TRUMP: {
    name: "Official Trump",
    category: "Meme / Political Token",
    chain: "Solana",
    description:
      "A politically themed meme asset driven by headline attention, community activity, and event-sensitive speculative flows.",
    website: "https://gettrumpmemes.com",
    explorer: "https://solscan.io/token/6p6xgHyF7Ae3Tz7kRXKuX3sX5Yucs5cjox96D65V6pZe",
  },
  SPX: {
    name: "SPX6900",
    category: "Meme / Community Token",
    chain: "Ethereum",
    description:
      "A meme coin built around parody market branding, community identity, and speculative social trading momentum.",
    website: "https://www.spx6900.com",
    explorer: "https://etherscan.io/token/0xe0f63A87B5E8D0B0a0E4D0c687C2b4c56F8D4c82",
  },
  TURBO: {
    name: "Turbo",
    category: "Meme / Community Token",
    chain: "Ethereum",
    description:
      "A meme asset known for AI-era branding, community-led distribution, and high-volatility retail trading behavior.",
    website: "https://www.turbotoken.io",
    explorer: "https://etherscan.io/token/0xa35923162c49cf95e6bf26623385eb431ad920d3",
  },
  NEIRO: {
    name: "Neiro",
    category: "Meme / Community Token",
    chain: "Ethereum",
    description:
      "A community-led meme token driven by social attention, narrative rotation, and fast-moving speculative flows.",
  },
  GOAT: {
    name: "Goatseus Maximus",
    category: "Meme / Community Token",
    chain: "Solana",
    description:
      "A meme token shaped by internet culture, community momentum, and rapid social-trading participation.",
  },
  GIGA: {
    name: "Gigachad",
    category: "Meme / Community Token",
    chain: "Solana",
    description:
      "A high-volatility meme asset powered by branding, online identity, and community-driven trading interest.",
  },
  MEW: {
    name: "cat in a dogs world",
    category: "Meme / Community Token",
    chain: "Solana",
    description:
      "A cat-themed meme token built around social virality and fast-moving retail crypto attention.",
  },
  PNUT: {
    name: "Peanut the Squirrel",
    category: "Meme / Community Token",
    chain: "Solana",
    description:
      "A culture-driven meme asset whose trading activity is largely shaped by headline momentum and community participation.",
  },
  MOODENG: {
    name: "Moo Deng",
    category: "Meme / Community Token",
    chain: "Solana",
    description:
      "A viral meme token tied to internet-native attention cycles, social sentiment, and speculative rotation.",
  },
  APU: {
    name: "Apu Apustaja",
    category: "Meme / Community Token",
    chain: "Ethereum",
    description:
      "A meme coin centered on long-running internet culture, community identity, and high-beta social trading flows.",
  },
  MELANIA: {
    name: "Melania Meme",
    category: "Meme / Political Token",
    chain: "Solana",
    description:
      "A politically themed meme token driven by headline attention, social volatility, and event-sensitive retail trading flows.",
  },
  PONKE: {
    name: "Ponke",
    category: "Meme / Community Token",
    chain: "Solana",
    description:
      "A Solana meme asset shaped by internet culture, trader attention cycles, and speculative community participation.",
  },
  FWOG: {
    name: "Fwog",
    category: "Meme / Community Token",
    chain: "Solana",
    description:
      "A frog-themed meme token powered by social virality, community momentum, and high-beta rotation across meme traders.",
  },
  MEME: {
    name: "Memecoin",
    category: "Meme / Community Token",
    chain: "Ethereum",
    description:
      "A meme-native token built around creator culture, social participation, and broad speculative trading interest.",
    website: "https://www.memecoin.org",
  },
  LDO: {
    name: "Lido DAO",
    category: "DeFi / Liquid Staking",
    chain: "Ethereum",
    description:
      "The governance token for Lido's liquid staking ecosystem, closely tied to staked-asset liquidity and DeFi collateral usage.",
    website: "https://lido.fi",
    docs: "https://docs.lido.fi",
  },
  RUNE: {
    name: "THORChain",
    category: "DeFi / Cross-chain Liquidity",
    chain: "THORChain",
    description:
      "A cross-chain liquidity network designed for native asset swaps without wrapped intermediaries.",
    website: "https://thorchain.org",
    docs: "https://dev.thorchain.org",
  },
  PENDLE: {
    name: "Pendle",
    category: "DeFi / Yield Markets",
    chain: "Ethereum",
    description:
      "A DeFi protocol focused on tokenized yield trading and interest-rate positioning across on-chain assets.",
    website: "https://www.pendle.finance",
    docs: "https://docs.pendle.finance",
  },
  DYDX: {
    name: "dYdX",
    category: "DeFi / Perpetuals",
    chain: "dYdX Chain",
    description:
      "A decentralized derivatives ecosystem centered on perpetual futures and active on-chain trading infrastructure.",
    website: "https://dydx.trade",
    docs: "https://docs.dydx.xyz",
  },
  JUP: {
    name: "Jupiter",
    category: "DeFi / Aggregation",
    chain: "Solana",
    description:
      "A Solana DeFi token linked to one of the ecosystem's largest routing and liquidity aggregation layers.",
    website: "https://jup.ag",
  },
  ENA: {
    name: "Ethena",
    category: "DeFi / Synthetic Dollar",
    chain: "Ethereum",
    description:
      "The governance token around Ethena's synthetic-dollar infrastructure and delta-neutral yield design.",
    website: "https://www.ethena.fi",
    docs: "https://docs.ethena.fi",
  },
  "1INCH": {
    name: "1inch",
    category: "DeFi / Aggregation",
    chain: "Ethereum",
    description:
      "A decentralized exchange aggregator token used across routing, liquidity access, and multi-venue DeFi execution.",
    website: "https://1inch.io",
    docs: "https://docs.1inch.io",
  },
  CVX: {
    name: "Convex Finance",
    category: "DeFi / Yield Optimization",
    chain: "Ethereum",
    description:
      "A DeFi token tied to Convex's yield optimization layer around Curve liquidity and governance flows.",
    website: "https://www.convexfinance.com",
  },
  GMX: {
    name: "GMX",
    category: "DeFi / Perpetuals",
    chain: "Arbitrum",
    description:
      "A decentralized perpetuals and spot trading protocol centered on on-chain derivatives liquidity.",
    website: "https://gmx.io",
    docs: "https://docs.gmx.io",
  },
  BAL: {
    name: "Balancer",
    category: "DeFi / Automated Market Maker",
    chain: "Ethereum",
    description:
      "A DeFi token tied to Balancer's programmable liquidity pools and automated market-making infrastructure.",
    website: "https://balancer.fi",
    docs: "https://docs.balancer.fi",
  },
  KNC: {
    name: "Kyber Network",
    category: "DeFi / Liquidity Infrastructure",
    chain: "Ethereum",
    description:
      "A liquidity protocol token connected to routing, aggregation, and on-chain market-making infrastructure.",
    website: "https://kyberswap.com",
    docs: "https://docs.kyberswap.com",
  },
  ZRX: {
    name: "0x",
    category: "DeFi / Exchange Infrastructure",
    chain: "Ethereum",
    description:
      "A protocol token for decentralized exchange infrastructure and liquidity routing across on-chain markets.",
    website: "https://0x.org",
    docs: "https://docs.0x.org",
  },
  COW: {
    name: "CoW Protocol",
    category: "DeFi / Aggregation",
    chain: "Ethereum",
    description:
      "A DeFi token linked to batch auction trading, MEV-aware routing, and solver-based execution.",
    website: "https://cow.fi",
    docs: "https://docs.cow.fi",
  },
  MORPHO: {
    name: "Morpho",
    category: "DeFi / Lending",
    chain: "Ethereum",
    description:
      "A lending protocol token focused on optimizing borrowing and lending efficiency across DeFi credit markets.",
    website: "https://morpho.org",
    docs: "https://docs.morpho.org",
  },
  AERO: {
    name: "Aerodrome",
    category: "DeFi / Exchange",
    chain: "Base",
    description:
      "A Base ecosystem liquidity and exchange token centered on emissions-driven trading and pool incentives.",
    website: "https://aerodrome.finance",
  },
  LQTY: {
    name: "Liquity",
    category: "DeFi / Stablecoin Infrastructure",
    chain: "Ethereum",
    description:
      "A DeFi token around Liquity's borrowing and decentralized stablecoin infrastructure.",
    website: "https://www.liquity.org",
    docs: "https://docs.liquity.org",
  },
  ACH: {
    name: "Alchemy Pay",
    category: "DeFi / Payments Infrastructure",
    chain: "Ethereum",
    description:
      "A payments-oriented token bridging crypto rails, merchant access, and broader digital asset settlement flows.",
    website: "https://alchemypay.org",
  },
  BNT: {
    name: "Bancor",
    category: "DeFi / Liquidity",
    chain: "Ethereum",
    description:
      "A DeFi token linked to Bancor's automated liquidity and single-sided exposure infrastructure.",
    website: "https://www.bancor.network",
  },
  FXS: {
    name: "Frax Share",
    category: "DeFi / Stablecoin Infrastructure",
    chain: "Ethereum",
    description:
      "The governance and value-accrual token around the Frax ecosystem's stablecoin and DeFi infrastructure stack.",
    website: "https://frax.finance",
    docs: "https://docs.frax.finance",
  },
  COMP: {
    name: "Compound",
    category: "DeFi / Lending",
    chain: "Ethereum",
    description:
      "The governance token of the Compound money-market protocol, used across decentralized lending and borrowing markets.",
    website: "https://compound.finance",
    explorer: "https://etherscan.io/token/0xc00e94cb662c3520282e6f5717214004a7f26888",
    docs: "https://docs.compound.finance",
  },
  CRV: {
    name: "Curve DAO",
    category: "DeFi / Liquidity",
    chain: "Ethereum",
    description:
      "The governance token for Curve, a DeFi liquidity protocol focused on stable asset and efficient swap markets.",
    website: "https://curve.fi",
    explorer: "https://etherscan.io/token/0xD533a949740bb3306d119CC777fa900bA034cd52",
    docs: "https://resources.curve.finance",
  },
  SUSHI: {
    name: "Sushi",
    category: "DeFi / Exchange",
    chain: "Ethereum",
    description:
      "A DeFi token tied to the Sushi ecosystem, spanning decentralized exchange liquidity, routing, and on-chain trading infrastructure.",
    website: "https://www.sushi.com",
    explorer: "https://etherscan.io/token/0x6b3595068778dd592e39a122f4f5a5cf09c90fe2",
    docs: "https://docs.sushi.com",
  },
  SNX: {
    name: "Synthetix",
    category: "DeFi / Synthetic Assets",
    chain: "Ethereum",
    description:
      "A protocol token for the Synthetix ecosystem, which powers on-chain synthetic asset issuance and derivatives infrastructure.",
    website: "https://www.synthetix.io",
    explorer: "https://etherscan.io/token/0xC011A72400E58ecD99Ee497CF89E3775d4bd732F",
    docs: "https://docs.synthetix.io",
  },
  ONDO: {
    name: "Ondo",
    category: "RWA / Tokenized Finance",
    chain: "Ethereum",
    description:
      "An RWA-focused token connected to Ondo's tokenized finance infrastructure and blockchain access to traditional yield products.",
    website: "https://ondo.finance",
    explorer: "https://etherscan.io/token/0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3",
    docs: "https://docs.ondo.finance",
  },
  CFG: {
    name: "Centrifuge",
    category: "RWA / Credit Infrastructure",
    chain: "Centrifuge",
    description:
      "A real-world-asset protocol focused on bringing private credit and structured financing rails on chain.",
    website: "https://centrifuge.io",
    explorer: "https://assethub-polkadot.subscan.io",
    docs: "https://docs.centrifuge.io",
  },
  GFI: {
    name: "Goldfinch",
    category: "RWA / Private Credit",
    chain: "Ethereum",
    description:
      "A DeFi credit protocol with real-world lending exposure, designed to connect on-chain capital to off-chain borrowers.",
    website: "https://goldfinch.finance",
    explorer: "https://etherscan.io/token/0xdab396cCF3d84Cf2D07C4454e10C8A6F5b008D2b",
    docs: "https://docs.goldfinch.finance",
  },
  PAXG: {
    name: "PAX Gold",
    category: "RWA / Tokenized Gold",
    chain: "Ethereum",
    description:
      "A tokenized gold product backed by physical bullion, designed to track spot gold exposure on chain.",
    website: "https://paxos.com/paxgold",
    explorer: "https://etherscan.io/token/0x45804880De22913dAFE09f4980848ECE6EcbAf78",
  },
  XAUT: {
    name: "Tether Gold",
    category: "RWA / Tokenized Gold",
    chain: "Ethereum",
    description:
      "A tokenized gold asset issued by Tether that provides blockchain-traded exposure to vaulted physical gold.",
    website: "https://gold.tether.to",
    explorer: "https://etherscan.io/token/0x68749665FF8D2d112Fa859AA293F07A622782F38",
  },
  TRU: {
    name: "TrueFi",
    category: "RWA / Credit Markets",
    chain: "Ethereum",
    description:
      "A token tied to on-chain unsecured lending and credit-market infrastructure bridging DeFi with real-world borrowers.",
    website: "https://truefi.io",
  },
  PRO: {
    name: "Propy",
    category: "RWA / Real Estate",
    chain: "Ethereum",
    description:
      "A real-estate tokenization and digital property transaction platform focused on bringing property workflows on chain.",
    website: "https://propy.com",
  },
  CPOOL: {
    name: "Clearpool",
    category: "RWA / Credit Infrastructure",
    chain: "Ethereum",
    description:
      "A decentralized credit marketplace designed to connect institutional borrowers and on-chain capital pools.",
    website: "https://clearpool.finance",
  },
  HBAR: {
    name: "Hedera",
    category: "RWA / Enterprise Infrastructure",
    chain: "Hedera",
    description:
      "An enterprise-oriented distributed ledger network frequently positioned around tokenization, compliance, and real-world business infrastructure.",
    website: "https://hedera.com",
  },
  XLM: {
    name: "Stellar",
    category: "RWA / Payments Infrastructure",
    chain: "Stellar",
    description:
      "A payments and issuance network with strong alignment to stable-value assets, cross-border settlement, and tokenized financial rails.",
    website: "https://stellar.org",
  },
  ALGO: {
    name: "Algorand",
    category: "RWA / Tokenization Infrastructure",
    chain: "Algorand",
    description:
      "A blockchain ecosystem often used in tokenization and institutional-grade asset infrastructure discussions.",
    website: "https://algorand.co",
  },
  VET: {
    name: "VeChain",
    category: "RWA / Enterprise Traceability",
    chain: "VeChainThor",
    description:
      "An enterprise-focused blockchain built around supply chain data, provenance, and real-world commercial workflows.",
    website: "https://www.vechain.org",
  },
  XDC: {
    name: "XDC Network",
    category: "RWA / Trade Finance",
    chain: "XDC Network",
    description:
      "An enterprise-focused blockchain with strong positioning around trade finance, tokenization, and real-world business rails.",
    website: "https://xinfin.org",
  },
  LCX: {
    name: "LCX",
    category: "RWA / Tokenization Infrastructure",
    chain: "Ethereum",
    description:
      "A digital asset and tokenization platform with a focus on compliant issuance, custody, and real-world asset access.",
    website: "https://www.lcx.com",
  },
  QNT: {
    name: "Quant",
    category: "RWA / Enterprise Connectivity",
    chain: "Ethereum",
    description:
      "An interoperability-focused token with strong enterprise and institutional connectivity themes relevant to tokenized asset infrastructure.",
    website: "https://quant.network",
  },
};

function normalizeCryptoSource(value: string | null): "/crypto" | "/crypto/news" | "/crypto/meme" | "/crypto/defi" | "/crypto/rwa" | "/crypto/watchlist" | "/crypto/portfolio" {
  if (value === "/crypto/news") return "/crypto/news";
  if (value === "/crypto/meme") return "/crypto/meme";
  if (value === "/crypto/defi") return "/crypto/defi";
  if (value === "/crypto/rwa") return "/crypto/rwa";
  if (value === "/crypto/watchlist") return "/crypto/watchlist";
  if (value === "/crypto/portfolio") return "/crypto/portfolio";
  return "/crypto";
}

function buildCryptoBackLabel(sourcePath: "/crypto" | "/crypto/news" | "/crypto/meme" | "/crypto/defi" | "/crypto/rwa" | "/crypto/watchlist" | "/crypto/portfolio") {
  if (sourcePath === "/crypto/news") return "Back to Crypto News";
  if (sourcePath === "/crypto/meme") return "Back to Meme Board";
  if (sourcePath === "/crypto/defi") return "Back to DeFi Board";
  if (sourcePath === "/crypto/rwa") return "Back to RWA Board";
  if (sourcePath === "/crypto/watchlist") return "Back to Crypto Watchlist";
  if (sourcePath === "/crypto/portfolio") return "Back to Crypto Portfolio";
  return "Back to Crypto";
}

function money(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";

  const maximumFractionDigits =
    value >= 100 ? 2 :
    value >= 1 ? 4 :
    value >= 0.01 ? 6 :
    8;

  return `$${value.toLocaleString(undefined, {
    maximumFractionDigits,
  })}`;
}

function pct(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function compact(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(0);
}

function SparkChart({ candles, compact = false }: { candles: Candle[]; compact?: boolean }) {
  const zoomOptions = useMemo(() => {
    const options = [24, 36, 60, 96, candles.length].filter(Boolean);
    return Array.from(new Set(options)).sort((a, b) => a - b);
  }, [candles.length]);
  const defaultZoomIndex = useMemo(
    () => Math.max(0, zoomOptions.findIndex((value) => value >= 60)),
    [zoomOptions]
  );
  const [zoomIndex, setZoomIndex] = useState(defaultZoomIndex);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setZoomIndex((current) => Math.min(current, Math.max(zoomOptions.length - 1, 0)));
  }, [zoomOptions.length]);

  const visibleCandles = useMemo(() => {
    const requestedWindow = zoomOptions[Math.min(zoomIndex, zoomOptions.length - 1)] ?? candles.length;
    const windowSize = Math.max(1, Math.min(requestedWindow, candles.length));
    return candles.slice(-windowSize);
  }, [candles, zoomIndex, zoomOptions]);

  const chart = useMemo(() => {
    if (!visibleCandles.length) return null;

    const svgWidth = 1000;
    const plotLeft = 32;
    const priceLabelGutter = compact ? 132 : 108;
    const plotRight = svgWidth - priceLabelGutter;
    const plotWidth = Math.max(plotRight - plotLeft, 1);
    const priceLabelX = svgWidth - 20;

    const highs = visibleCandles.map((candle) => candle.high);
    const lows = visibleCandles.map((candle) => candle.low);
    const volumes = visibleCandles.map((candle) => candle.volume);
    const min = Math.min(...lows);
    const max = Math.max(...highs);
    const range = Math.max(max - min, 0.00001);
    const chartHeight = isExpanded ? (compact ? 212 : 244) : compact ? 152 : 184;
    const chartTop = 24;
    const chartBottom = chartTop + chartHeight;
    const volumeTop = chartBottom + 16;
    const volumeHeight = isExpanded ? 56 : 44;
    const slotWidth = plotWidth / Math.max(visibleCandles.length, 1);
    const bodyWidth = Math.max(4, Math.min(slotWidth * 0.62, 12));
    const maxVolume = Math.max(...volumes, 1);

    const toY = (price: number) => chartBottom - ((price - min) / range) * chartHeight;

    const candleShapes = visibleCandles.map((candle, index) => {
      const centerX = plotLeft + slotWidth * index + slotWidth / 2;
      const openY = toY(candle.open);
      const closeY = toY(candle.close);
      const highY = toY(candle.high);
      const lowY = toY(candle.low);
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(Math.abs(closeY - openY), 2);
      const bullish = candle.close >= candle.open;

      return {
        key: `${candle.time}-${index}`,
        centerX,
        bodyX: centerX - bodyWidth / 2,
        bodyWidth,
        bodyTop,
        bodyHeight,
        highY,
        lowY,
        bullish,
        isLatest: index === visibleCandles.length - 1,
        volumeY: volumeTop + volumeHeight - (candle.volume / maxVolume) * volumeHeight,
        volumeHeight: Math.max((candle.volume / maxVolume) * volumeHeight, 2),
      };
    });

    const movingAveragePeriod = Math.min(7, visibleCandles.length);
    const movingAveragePoints = visibleCandles
      .map((_, index) => {
        const start = Math.max(0, index - movingAveragePeriod + 1);
        const window = visibleCandles.slice(start, index + 1);
        const average =
          window.reduce((sum, candle) => sum + candle.close, 0) / Math.max(window.length, 1);
        const x = plotLeft + slotWidth * index + slotWidth / 2;
        const y = toY(average);
        return `${x},${y}`;
      })
      .join(" ");

    const latest = visibleCandles.at(-1);
    const latestCloseY = latest ? toY(latest.close) : chartBottom;
    const latestClose = latest?.close ?? null;

    const gridLines = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
      const y = chartTop + chartHeight * ratio;
      const value = max - range * ratio;
      return {
        y,
        label: money(value),
      };
    });

    const timeLabels = visibleCandles.length >= 3
      ? [0, Math.floor((visibleCandles.length - 1) / 2), visibleCandles.length - 1].map((index) => {
          const candle = visibleCandles[index];
          const date = new Date(candle.time);
          const label = `${formatMarketClockTimeMs(candle.time)} EST`;

          return {
            key: `${candle.time}-${index}`,
            x: plotLeft + slotWidth * index + slotWidth / 2,
            label,
          };
        })
      : [];

    return {
      candleShapes,
      gridLines,
      timeLabels,
      movingAveragePoints,
      latestCloseY,
      latestClose,
      latestBullish: latest ? latest.close >= latest.open : true,
      plotLeft,
      plotRight,
      priceLabelX,
      volumeTop,
      volumeBottom: volumeTop + volumeHeight,
    };
  }, [compact, isExpanded, visibleCandles]);

  if (!candles.length) {
    return (
      <div className={[
        "flex items-center justify-center rounded-3xl border border-white/10 bg-white/3 text-white/40",
        compact ? "h-64" : "h-80",
      ].join(" ")}>
        FMP candle data unavailable or still loading.
      </div>
    );
  }

  return (
    <div className={[
      "rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))]",
      compact ? "p-4" : "p-5",
    ].join(" ")}>
      <div className={[
        "mb-4 gap-3",
        compact ? "flex flex-col" : "flex items-center justify-between",
      ].join(" ")}>
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-cyan-200/75">
            FMP Candle Snapshot
          </div>
          <div className="mt-1 text-sm text-white/45">
            Intraday candles update with the live crypto tape.
          </div>
        </div>

        <div className={[
          "flex flex-wrap items-center gap-2",
          compact ? "justify-start" : "justify-end",
        ].join(" ")}>
          <div className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
            Times {MARKET_TIME_ABBR}
          </div>
          <div className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-semibold text-white/65">
            {chart?.latestClose ? `Last ${money(chart.latestClose)}` : "Waiting for price"}
          </div>
          <div className="inline-flex rounded-full border border-white/10 bg-black/25 p-1">
            <button
              type="button"
              onClick={() => setZoomIndex((current) => Math.max(0, current - 1))}
              disabled={zoomIndex === 0}
              className="rounded-full px-3 py-1 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              Zoom In
            </button>
            <button
              type="button"
              onClick={() => setZoomIndex((current) => Math.min(zoomOptions.length - 1, current + 1))}
              disabled={zoomIndex >= zoomOptions.length - 1}
              className="rounded-full px-3 py-1 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              Zoom Out
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
          >
            {isExpanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between text-xs text-white/42">
        <span>{visibleCandles.length} candles in view</span>
        <span>{zoomIndex === 0 ? "Tight zoom" : zoomIndex >= zoomOptions.length - 1 ? "Full range" : "Focused range"}</span>
      </div>

      <svg
        viewBox="0 0 1000 340"
        className={[
          "w-full overflow-visible",
          isExpanded ? (compact ? "h-96" : "h-112") : compact ? "h-64" : "h-80",
        ].join(" ")}
      >
        <defs>
          <linearGradient id="cryptoBull" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.75" />
          </linearGradient>

          <linearGradient id="cryptoBear" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#fb7185" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.72" />
          </linearGradient>

          <filter id="cryptoLatestBullGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#34d399" floodOpacity="0.85" />
          </filter>

          <filter id="cryptoLatestBearGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#fb7185" floodOpacity="0.85" />
          </filter>
        </defs>

        <rect x="0" y="0" width="1000" height="340" rx="24" fill="rgba(4,10,20,0.48)" />

        {chart?.gridLines.map((line) => (
          <g key={`${line.y}-${line.label}`}>
            <line
              x1={chart.plotLeft}
              x2={chart.plotRight}
              y1={line.y}
              y2={line.y}
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="6 10"
            />
            <text
              x={chart.priceLabelX}
              y={line.y + 4}
              textAnchor="end"
              fontSize="11"
              fill="rgba(255,255,255,0.42)"
            >
              {line.label}
            </text>
          </g>
        ))}

        {chart?.latestCloseY ? (
          <line
            x1={chart.plotLeft}
            x2={chart.plotRight}
            y1={chart.latestCloseY}
            y2={chart.latestCloseY}
            stroke={chart.latestBullish ? "rgba(52,211,153,0.65)" : "rgba(251,113,133,0.65)"}
            strokeDasharray="4 8"
          />
        ) : null}

        {chart?.movingAveragePoints ? (
          <polyline
            points={chart.movingAveragePoints}
            fill="none"
            stroke="rgba(125,211,252,0.95)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {chart?.candleShapes.map((candle) => (
          <g key={candle.key}>
            <line
              x1={candle.centerX}
              x2={candle.centerX}
              y1={candle.highY}
              y2={candle.lowY}
              stroke={candle.bullish ? "rgba(110,231,183,0.95)" : "rgba(251,113,133,0.95)"}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <rect
              x={candle.bodyX}
              y={candle.bodyTop}
              width={candle.bodyWidth}
              height={candle.bodyHeight}
              rx="2"
              fill={candle.bullish ? "url(#cryptoBull)" : "url(#cryptoBear)"}
              filter={
                candle.isLatest
                  ? candle.bullish
                    ? "url(#cryptoLatestBullGlow)"
                    : "url(#cryptoLatestBearGlow)"
                  : undefined
              }
              className="transition-all duration-500"
            />
          </g>
        ))}

        {chart ? (
          <>
            <line
              x1={chart.plotLeft}
              x2={chart.plotRight}
              y1={chart.volumeTop - 6}
              y2={chart.volumeTop - 6}
              stroke="rgba(255,255,255,0.08)"
            />
            <text
              x={chart.plotLeft}
              y={chart.volumeTop - 10}
              fontSize="11"
              fill="rgba(255,255,255,0.42)"
            >
              Volume
            </text>
          </>
        ) : null}

        {chart?.candleShapes.map((candle) => (
          <rect
            key={`${candle.key}-volume`}
            x={candle.bodyX}
            y={candle.volumeY}
            width={candle.bodyWidth}
            height={candle.volumeHeight}
            rx="1.5"
            fill={candle.bullish ? "rgba(52,211,153,0.42)" : "rgba(251,113,133,0.38)"}
          />
        ))}

        {chart?.timeLabels.map((label) => (
          <text
            key={label.key}
            x={label.x}
            y="326"
            textAnchor="middle"
            fontSize="11"
            fill="rgba(255,255,255,0.42)"
          >
            {label.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

function sigiRead(row: SnapshotRow | null, candles: Candle[]) {
  if (row?.price == null || row.changePercent == null || !candles.length) {
    return "Insufficient FMP data for a momentum read.";
  }
  const change = row?.changePercent ?? 0;
  const latest = candles.at(-1);
  const previous = candles.at(-8);

  const shortTrend =
    latest && previous ? ((latest.close - previous.close) / previous.close) * 100 : 0;

  if (change >= 3 && shortTrend > 0) {
    return "Momentum is pressing higher. Buyers are in control, but chase risk increases if price stretches far above the short-term range.";
  }

  if (change <= -3 && shortTrend < 0) {
    return "Risk-off pressure is active. Sellers are controlling the tape until price reclaims the short-term range.";
  }

  if (Math.abs(change) < 1) {
    return "Price is consolidating. Watch for volume expansion and a clean break above the intraday high or below the intraday low.";
  }

  if (change > 0) {
    return "Bullish pressure is present, but confirmation improves if price holds above VWAP-style intraday support.";
  }

  return "Bearish pressure is present. A reclaim of the prior range would be the first sign of stabilization.";
}

function buildCryptoIdentityTemplate(ticker: string) {
  return `${ticker}: {
  name: "${ticker}",
  category: "Add category",
  chain: "Add chain",
  description: "Add project description.",
  website: "https://",
  explorer: "https://",
  docs: "https://",
  x: "https://x.com/",
},`;
}

function CryptoIdentityPanel({
  identity,
  ticker,
}: {
  identity: (typeof CRYPTO_IDENTITY)[string] | undefined;
  ticker: string;
  compact?: boolean;
}) {
  const compact = arguments[0].compact ?? false;
  const [copied, setCopied] = useState(false);

  if (!identity) {
    const template = buildCryptoIdentityTemplate(ticker);

    return (
      <div className={[
        "mt-4 rounded-3xl border border-white/10 bg-white/3.5",
        compact ? "p-4" : "p-5",
      ].join(" ")}>
        <div className={[
          "items-start gap-4",
          compact ? "flex flex-col" : "flex justify-between",
        ].join(" ")}>
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-white/40">
              Crypto Identity
            </div>
            <p className="mt-3 text-sm text-white/55">
              Project profile not added yet for {ticker}.
            </p>
            <p className="mt-2 text-xs text-white/38">
              Copy the starter block below and paste it into CRYPTO_IDENTITY.
            </p>
          </div>

          <button
            type="button"
            onClick={async () => {
              if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return;
              await navigator.clipboard.writeText(template);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }}
            className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
          >
            {copied ? "Copied" : "Copy template"}
          </button>
        </div>

        <pre className={[
          "mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-black/35 text-xs leading-6 text-cyan-100/90",
          compact ? "p-3" : "p-4",
        ].join(" ")}>
          <code>{template}</code>
        </pre>
      </div>
    );
  }

  const links = [
    { label: "Website", href: identity.website },
    { label: "Explorer", href: identity.explorer },
    { label: "Docs", href: identity.docs },
    { label: "X", href: identity.x },
  ].filter((link): link is { label: string; href: string } => Boolean(link.href));

  return (
    <div className={[
      "mt-4 rounded-3xl border border-cyan-400/20 bg-cyan-400/5.5 shadow-[0_0_32px_rgba(34,211,238,0.08)]",
      compact ? "p-4" : "p-5",
    ].join(" ")}>
      <div className="text-xs uppercase tracking-[0.22em] text-cyan-200">
        Crypto Identity
      </div>

      <div className={[
        "mt-3 items-start gap-4",
        compact ? "flex flex-col" : "flex justify-between",
      ].join(" ")}>
        <div>
          <h2 className={[
            "font-semibold text-white",
            compact ? "text-xl" : "text-2xl",
          ].join(" ")}>{identity.name}</h2>

          <p className="mt-2 text-sm leading-6 text-white/60">{identity.description}</p>
        </div>

        <div className={[
          "rounded-2xl border border-white/10 bg-black/30 px-4 py-3",
          compact ? "w-full text-left" : "text-right",
        ].join(" ")}>
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
            Chain
          </div>
          <div className="mt-1 text-sm font-semibold text-white">{identity.chain}</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs text-white/65">
          {identity.category}
        </span>

        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}

export default function CryptoDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { tier } = useSigiTier();
  const ticker = String(params.ticker ?? "BTC").toUpperCase();
  const isMobilePreview = searchParams.get("mobilePreview") === "1";
  const sourcePath = normalizeCryptoSource(searchParams.get("source"));
  const sourceHref = isMobilePreview ? `${sourcePath}?mobilePreview=1` : sourcePath;
  const backLabel = buildCryptoBackLabel(sourcePath);
  const mobilePreviewFrame = useResponsiveMobilePreviewFrame(isMobilePreview);
  const plan = tier ?? "free";
  const canUseCrypto = getPremiumAccess({ tier: plan, feature: "crypto" });
  const canUseCryptoWorkspace = plan === "pro";
  const identity = CRYPTO_IDENTITY[ticker];
  const polledQuote = useCryptoStreamState(ticker);

  const [interval, setIntervalValue] = useState<CryptoIntervalKey>("5m");
  const [marketData, setMarketData] = useState<{
    key: string;
    candles: Candle[];
    snapshot: SnapshotRow | null;
    dataError: string | null;
    checkedAt: number | null;
  }>({ key: "", candles: [], snapshot: null, dataError: null, checkedAt: null });
  const [actionFeedback, setActionFeedback] = useState<string>("");

  const selectedInterval =
    CRYPTO_INTERVAL_OPTIONS.find((option) => option.key === interval) ?? CRYPTO_INTERVAL_OPTIONS[1];
  const dataKey = `${ticker}:${selectedInterval.key}`;
  const { candles, snapshot, dataError, checkedAt } = marketData.key === dataKey ? marketData
    : { candles: [], snapshot: null, dataError: null, checkedAt: null };

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    async function load(): Promise<void> {
      const results = await Promise.allSettled([
        fetch(`/api/crypto/candles?ticker=${encodeURIComponent(ticker)}&multiplier=${selectedInterval.multiplier}&timespan=${selectedInterval.timespan}&lookbackDays=${selectedInterval.lookbackDays}`,
          { cache: "no-store", signal: controller.signal }).then(async (response) => {
          const json = await response.json();
          if (!response.ok || !json.ok) throw new Error(json.error ?? "FMP candles unavailable.");
          return json;
        }),
        fetch(`/api/crypto/snapshot?tickers=${encodeURIComponent(ticker)}`,
          { cache: "no-store", signal: controller.signal }).then(async (response) => {
          const json = await response.json();
          if (!response.ok || !json.ok) throw new Error(json.error ?? "FMP snapshot unavailable.");
          return json;
        }),
      ]);
      if (!alive) return;
      const [candleResult, snapshotResult] = results;
      setMarketData({
        key: dataKey,
        candles: candleResult.status === "fulfilled" && Array.isArray(candleResult.value.candles) ? candleResult.value.candles : [],
        snapshot: snapshotResult.status === "fulfilled" && Array.isArray(snapshotResult.value.rows) ? snapshotResult.value.rows[0] ?? null : null,
        dataError: results.some((result) => result.status === "rejected") ? "Some FMP crypto data is unavailable. Access and symbol coverage depend on your FMP plan." : null,
        checkedAt: Date.now(),
      });
    }

    void load();

    const timer = window.setInterval(() => { void load(); }, 30_000);

    return () => {
      alive = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [dataKey, selectedInterval, ticker]);

  const latest = candles.at(-1);
  const displayPrice = polledQuote.price ?? snapshot?.price ?? latest?.close ?? null;
  const priceTimestamp = polledQuote.price != null ? polledQuote.timestamp
    : snapshot?.price != null ? snapshot.updated : latest?.time ?? null;
  const displayChangePercent = snapshot?.changePercent ?? null;
  const positive = (displayChangePercent ?? 0) >= 0;

  const showActionFeedback = (message: string) => {
    setActionFeedback(message);
    window.setTimeout(() => {
      setActionFeedback((current) => (current === message ? "" : current));
    }, 1800);
  };

  const addToWatchlist = () => {
    addCryptoWatchlistSymbol(ticker);
    showActionFeedback("Added to crypto watchlist");
  };

  const addToPortfolio = () => {
    const entryPrice = displayPrice ?? snapshot?.price ?? null;
    if (entryPrice == null || entryPrice <= 0) {
      showActionFeedback("FMP price required");
      return;
    }

    upsertCryptoPortfolioHolding({
      symbol: ticker,
      name: identity?.name ?? snapshot?.name ?? ticker,
      quantity: 1,
      entryPrice,
    });
    showActionFeedback("Added to crypto portfolio");
  };

  if (!canUseCrypto) {
    return (
      <LockedCryptoExperience
        ticker={ticker}
        backHref={sourceHref}
        backLabel={backLabel}
      />
    );
  }

  return (
    <main className={[
      "min-h-screen bg-black text-white",
      isMobilePreview ? "px-4 py-6" : "px-6 py-8",
    ].join(" ")}
      style={
        isMobilePreview
          ? {
              width: "100%",
              maxWidth: `${mobilePreviewFrame.width}px`,
              marginInline: "auto",
              overflowX: "hidden",
              ...(mobilePreviewFrame.isFramed
                ? {
                    height: `${mobilePreviewFrame.height}px`,
                    overflowY: "auto",
                    overscrollBehaviorY: "contain",
                  }
                : null),
            }
          : undefined
      }
    >
      <div className="mx-auto max-w-7xl">
          {!canUseCryptoWorkspace && plan === "smart" ? (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
              <p className="text-sm font-bold text-amber-100">
                Pro Crypto Workspace Coming Soon
              </p>

              <p className="mt-1 text-sm text-slate-300">
                Advanced operator tools, elite setup scoring, and multi-timeframe crypto intelligence are currently in development.
              </p>
            </div>
          ) : null}

        <div className="mb-6">
          <Link
            href={sourceHref}
            className="text-sm font-semibold text-cyan-300"
          >
            ← {backLabel}
          </Link>
        </div>

        <div className={[
          "mb-8 flex flex-col justify-between gap-5",
          isMobilePreview ? "" : "md:flex-row md:items-end",
        ].join(" ")}>
          <div>
            <div className="mb-3 inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
              FMP Crypto Chart
            </div>

            <h1 className={[
              "font-semibold tracking-tight",
              isMobilePreview ? "text-4xl" : "text-5xl",
            ].join(" ")}>
              {ticker}
            </h1>

            <p className="mt-3 text-sm text-white/50">
              FMP quote and candle snapshots, polled every 30 seconds. Not a tick-level stream.
            </p>
            {dataError && <p role="status" className="mt-2 text-sm text-amber-200">{dataError}</p>}

            <CryptoPageTabs
              active="market"
              isMobilePreview={isMobilePreview}
              className="mt-4"
            />

            <CryptoIdentityPanel identity={identity} ticker={ticker} compact={isMobilePreview} />

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addToWatchlist}
                className="rounded-full border border-white/10 bg-white/3 px-3 py-1.5 text-xs font-semibold text-white/78 transition hover:bg-white/8"
              >
                Add to Crypto Watchlist
              </button>
              <button
                type="button"
                onClick={addToPortfolio}
                className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
              >
                Add to Crypto Portfolio
              </button>
            </div>

            {actionFeedback ? (
              <div className="mt-3 text-xs font-semibold text-cyan-200">{actionFeedback}</div>
            ) : null}
          </div>

          <div className={[
            "flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/4 p-2",
            isMobilePreview ? "w-full" : "",
          ].join(" ")}>
            {CRYPTO_INTERVAL_OPTIONS.map((option) => (
              <button
                key={option.key}
                onClick={() => {
                  setIntervalValue(option.key);
                }}
                className={[
                  "rounded-xl px-4 py-2 text-sm font-semibold transition",
                  interval === option.key
                    ? "bg-cyan-400 text-black"
                    : "text-white/60 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <section className={[
          "mb-6 grid gap-4",
          isMobilePreview ? "grid-cols-2" : "md:grid-cols-4",
        ].join(" ")}>
          <div className="rounded-3xl border border-white/10 bg-white/4 p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-white/40">
              Price
            </div>
            <div className="mt-3 flex items-end gap-3">
              <div className={[
                "font-semibold transition-all duration-300",
                isMobilePreview ? "text-2xl" : "text-3xl",
              ].join(" ")}>
                {money(displayPrice)}
              </div>

              <div className="text-xs text-white/40">
                {displayPrice == null ? "Unavailable" : polledQuote.price != null || snapshot?.price != null ? "FMP quote" : "FMP candle close"}
              </div>
            </div>
            <p className="mt-2 text-xs text-white/45">
              {priceTimestamp != null
                ? `As of ${new Date(priceTimestamp).toLocaleString()} · provider time`
                : "Provider timestamp unavailable; freshness unknown."}
            </p>
            {priceTimestamp != null && checkedAt != null && checkedAt - priceTimestamp > 600_000 && (
              <p className="mt-1 text-xs text-amber-200">Delayed snapshot (over 10 minutes old).</p>
            )}
            {priceTimestamp != null && checkedAt != null && priceTimestamp - checkedAt > 300_000 && (
              <p className="mt-1 text-xs text-amber-200">Provider time is ahead; freshness unverified.</p>
            )}
            {polledQuote.error && <p className="mt-1 text-xs text-amber-200">Quote polling unavailable; any displayed fallback is timestamped above.</p>}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/4 p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-white/40">
              FMP Change
            </div>
            <div
              className={[
                "mt-3 font-semibold",
                isMobilePreview ? "text-2xl" : "text-3xl",
                positive ? "text-emerald-300" : "text-red-300",
              ].join(" ")}
            >
              {pct(displayChangePercent)}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/4 p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-white/40">
              Volume
            </div>
            <div className={[
              "mt-3 font-semibold",
              isMobilePreview ? "text-2xl" : "text-3xl",
            ].join(" ")}>
              {compact(snapshot?.volume)}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/4 p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-white/40">
              Range
            </div>
            <div className="mt-3 text-lg font-semibold">
              {money(snapshot?.low)} — {money(snapshot?.high)}
            </div>
          </div>
        </section>

        <CryptoQuoteDetails ticker={ticker} compact={isMobilePreview} />

        <section className={[
          "grid gap-6",
          isMobilePreview ? "" : "lg:grid-cols-[1fr_360px]",
        ].join(" ")}>
          <SparkChart candles={candles} compact={isMobilePreview} />

          <aside className={[
            "rounded-3xl border border-cyan-400/20 bg-cyan-400/6",
            isMobilePreview ? "p-4" : "p-5",
          ].join(" ")}>
            <div className="text-xs uppercase tracking-[0.22em] text-cyan-200">
              Sigi Crypto Read
            </div>

            <h2 className={[
              "mt-3 font-semibold",
              isMobilePreview ? "text-xl" : "text-2xl",
            ].join(" ")}>
              {displayChangePercent == null ? "FMP read unavailable" : positive ? "Constructive tape" : "Pressure watch"}
            </h2>

            <p className="mt-4 text-sm leading-6 text-white/65">
              {sigiRead(snapshot, candles)}
            </p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                Trader Focus
              </div>

              <div className="mt-3 space-y-2 text-sm text-white/70">
                <div>Breakout level: {money(snapshot?.high)}</div>
                <div>Support level: {money(snapshot?.low)}</div>
                <div>Current volume: {compact(snapshot?.volume)}</div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                Trade Setup
              </div>

              <div className="mt-3 space-y-2 text-sm text-white/70">
                <div>Bias: {displayChangePercent == null ? "Unavailable" : positive ? "Bullish" : "Bearish"}</div>
                <div>
                  Trigger: {positive
                    ? `Break above ${money(snapshot?.high)}`
                    : `Break below ${money(snapshot?.low)}`}
                </div>
                <div>
                  Risk: {positive
                    ? `Below ${money(snapshot?.low)}`
                    : `Above ${money(snapshot?.high)}`}
                </div>
              </div>
            </div>

            {["Tick-Level Trade Feed", "Order Flow Heat", "Tick Volume Spike Detection"].map((label) => (
              <div key={label} className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-white/40">{label}</div>
                <p className="mt-3 text-sm text-white/55">
                  Unavailable from FMP. Quote snapshots and candle volume are not tick-level trades.
                </p>
              </div>
            ))}
          </aside>
        </section>
      </div>
    </main>
  );
}