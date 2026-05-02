"use client";

import { useMemo, type FocusEventHandler, type MouseEventHandler } from "react";

import { useSelectedTicker } from "@/components/sigi/SelectedTickerContext";

export type SigiTickerFocusOptions = {
  enableHover?: boolean;
  enableFocus?: boolean;
};

export type SigiTickerFocusProps = {
  onClick: MouseEventHandler<HTMLElement>;
  onMouseEnter?: MouseEventHandler<HTMLElement>;
  onFocus?: FocusEventHandler<HTMLElement>;
};

export function useSigiTickerFocusProps(
  ticker: string,
  options?: SigiTickerFocusOptions
): SigiTickerFocusProps {
  const { activeTicker, setActiveTicker } = useSelectedTicker();
  const enableHover = options?.enableHover ?? false;
  const enableFocus = options?.enableFocus ?? false;

  return useMemo(() => {
    const focusTicker = () => {
      if (activeTicker !== ticker) {
        setActiveTicker(ticker);
      }
    };

    return {
      onClick: () => {
        focusTicker();
      },
      onMouseEnter: enableHover
        ? () => {
            focusTicker();
          }
        : undefined,
      onFocus: enableFocus
        ? () => {
            focusTicker();
          }
        : undefined,
    };
  }, [activeTicker, enableFocus, enableHover, setActiveTicker, ticker]);
}