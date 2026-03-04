"use client";

export default function WatchlistButton({ playerId }: { playerId: string }) {
  console.log("URL?", process.env.NEXT_PUBLIC_SUPABASE_URL);
  return <button>Add to Watchlist</button>;
}