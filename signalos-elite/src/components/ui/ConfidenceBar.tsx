import React from "react";

interface ConfidenceBarProps {
  value: number; // 0-100
  tone?: "bullish" | "bearish" | "neutral";
  size?: "sm" | "md" | "lg";
}

const toneColors = {
  bullish: "bg-emerald-400",
  bearish: "bg-rose-400",
  neutral: "bg-white/40",
};

const sizeStyles = {
  sm: "h-2 w-16",
  md: "h-3 w-24",
  lg: "h-4 w-32",
};

export default function ConfidenceBar({ value, tone = "neutral", size = "md" }: ConfidenceBarProps) {
  return (
    <span className="relative block rounded bg-white/10" style={{ height: sizeStyles[size].split(" ")[0], width: sizeStyles[size].split(" ")[1] }}>
      <span
        className={`absolute left-0 top-0 rounded ${toneColors[tone]}`}
        style={{ height: sizeStyles[size].split(" ")[0], width: `${value}%` }}
      />
    </span>
  );
}
