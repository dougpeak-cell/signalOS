"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { useSelectedTicker } from "@/components/sigi/SelectedTickerContext";

type SigiTickerActivatorProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "onClick"
> & {
  ticker: string;
  children: ReactNode;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
};

export default function SigiTickerActivator({
  ticker,
  children,
  type = "button",
  onClick,
  ...props
}: SigiTickerActivatorProps) {
  const { setActiveTicker } = useSelectedTicker();

  return (
    <button
      {...props}
      type={type}
      onClick={(event) => {
        setActiveTicker(ticker);
        onClick?.(event);
      }}
    >
      {children}
    </button>
  );
}