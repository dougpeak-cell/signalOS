"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HeroStory } from "./TodayHeroPanel";

export function useHeroStory() {
  const [heroStory, setHeroStory] = useState<HeroStory | null>(null);
  const [isLoadingHero, setIsLoadingHero] = useState(false);
  const heroRequestIdRef = useRef(0);

  const loadHeroStory = useCallback(async (symbol?: string | null) => {
    const requestId = ++heroRequestIdRef.current;

    try {
      setIsLoadingHero(true);

      const query = symbol ? `?symbol=${encodeURIComponent(symbol.toUpperCase())}` : "";
      const res = await fetch(`/api/news${query}`, { cache: "no-store" });
      const data = (await res.json()) as HeroStory;

      if (requestId !== heroRequestIdRef.current) {
        return;
      }

      setHeroStory(data);
    } catch (error) {
      if (requestId === heroRequestIdRef.current) {
        console.error("Failed to load hero story", error);
      }
    } finally {
      if (requestId === heroRequestIdRef.current) {
        setIsLoadingHero(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadHeroStory();
  }, [loadHeroStory]);

  return {
    heroStory,
    isLoadingHero,
    loadHeroStory,
    setHeroStory,
  };
}