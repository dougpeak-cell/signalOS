"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { ResearchAlignmentFeed } from "@/lib/experts/researchAlignment";

type RequestState = {
  symbol: string;
  feed: ResearchAlignmentFeed | null;
  loading: boolean;
  error: string | null;
};

export function useResearchAlignment(symbol: string | null, enabled: boolean, searchable: boolean, desktopOnly: boolean) {
  const [visible, setVisible] = useState(!desktopOnly);
  const [chosenSymbol, setChosenSymbol] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const ticker = (searchable ? chosenSymbol ?? symbol : symbol)?.trim().toUpperCase() ?? "";
  const [state, setState] = useState<RequestState>({ symbol: "", feed: null, loading: false, error: null });

  useEffect(() => {
    if (!desktopOnly) return;
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setVisible(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [desktopOnly]);

  useEffect(() => {
    if (!enabled || !visible || !ticker) return;
    const controller = new AbortController();
    async function load(): Promise<void> {
      setState({ symbol: ticker, feed: null, loading: true, error: null });
      try {
        const response = await fetch(`/api/experts/research?symbol=${encodeURIComponent(ticker)}`, {
          cache: "no-store", signal: controller.signal,
        });
        const payload: ResearchAlignmentFeed & { ok?: boolean; error?: string } = await response.json();
        if (payload.symbol === ticker && payload.analysts && payload.institutions && payload.amsa && payload.alignment) {
          if (!controller.signal.aborted) setState({
            symbol: ticker, feed: payload, loading: false,
            error: !response.ok || !payload.ok ? payload.error ?? "Research is unavailable." : null,
          });
          return;
        }
        throw new Error(payload.error ?? "Research Alignment returned an unexpected response.");
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Research Alignment could not be loaded.";
        console.error("Research Alignment load failed:", message);
        setState({ symbol: ticker, feed: null, loading: false, error: message });
      }
    }
    void load();
    return () => controller.abort();
  }, [ticker, enabled, visible, attempt]);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const next = (draft ?? ticker).trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9.-]{0,11}$/.test(next)) {
      setInputError("Enter a valid stock ticker, such as AAPL or BRK.B.");
      return;
    }
    setInputError(null);
    setDraft(next);
    setChosenSymbol(next);
    setAttempt((value) => value + 1);
  }
  const current = state.symbol === ticker ? state : { feed: null, loading: Boolean(enabled && ticker), error: null };
  return {
    ...current, ticker, visible, input: draft ?? ticker, inputError, setInput: setDraft, submit,
    retry: () => setAttempt((value) => value + 1),
  };
}
