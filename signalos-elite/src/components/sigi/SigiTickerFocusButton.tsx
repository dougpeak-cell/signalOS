"use client";

import type {
  ButtonHTMLAttributes,
  FocusEventHandler,
  MouseEventHandler,
  ReactNode,
} from "react";

import { useSelectedTicker } from "@/components/sigi/SelectedTickerContext";
import { prefetchCompanyProfile } from "@/lib/companyCache";

type SigiTickerFocusButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick"
> & {
  ticker: string;
  children?: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onFocus?: FocusEventHandler<HTMLButtonElement>;
  onMouseEnter?: MouseEventHandler<HTMLButtonElement>;
};

export function SigiTickerFocusButton({
  ticker,
  children,
  onClick,
  onFocus,
  onMouseEnter,
  type = "button",
  ...props
}: SigiTickerFocusButtonProps) {
  const { setActiveTicker } = useSelectedTicker();

  const handleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    setActiveTicker(ticker);
    prefetchCompanyProfile(ticker);
    onClick?.(event);
  };

  const handleFocus: FocusEventHandler<HTMLButtonElement> = (event) => {
    setActiveTicker(ticker);
    prefetchCompanyProfile(ticker);
    onFocus?.(event);
  };

  const handleMouseEnter: MouseEventHandler<HTMLButtonElement> = (event) => {
    setActiveTicker(ticker);
    prefetchCompanyProfile(ticker);
    onMouseEnter?.(event);
  };

  return (
    <button
      {...props}
      type={type}
      onClick={handleClick}
      onFocus={handleFocus}
      onMouseEnter={handleMouseEnter}
    >
      {children ?? `Focus ${ticker.toUpperCase()} in Sigi`}
    </button>
  );
}