export type NewsTone = "bullish" | "bearish" | "neutral";

export type NewsCategory =
  | "macro"
  | "earnings"
  | "ai"
  | "fed"
  | "semis"
  | "energy"
  | "watchlist"
  | "company"
  | "sector";

export type NewsItem = {
  id: string;
  title: string;
  headline: string;
  source: string;
  publishedAt: string;
  rawPublishedAt?: string;
  url: string;
  summary: string;
  tone: NewsTone;
  category: NewsCategory;
  tickers: string[];
  importance: number;
  impact: string;
  score?: number;
  whyItMatters?: string;
  image?: string | null;
  imageUrl?: string | null;
};

export {
  fetchFreeNewsForWatchlist,
  fetchUnifiedFreeNews,
  fetchTopFreeMarketNews,
  fetchTopFreeCryptoNews,
} from "@/lib/news/fetchFreeNews";

export {
  fetchFreeNewsForWatchlist as fetchNewsForWatchlist,
  fetchUnifiedFreeNews as fetchUnifiedNews,
  fetchTopFreeMarketNews as fetchTopMarketNews,
  fetchTopFreeCryptoNews as fetchCryptoNews,
} from "@/lib/news/fetchFreeNews";