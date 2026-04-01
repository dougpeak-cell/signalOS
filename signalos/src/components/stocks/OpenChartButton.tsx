"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type OpenChartButtonProps = {
  href: string;
  label: string;
  glow?: "cyan" | "emerald";
  fullWidth?: boolean;
  pulse?: boolean; // Add pulse prop for top setup
};

export default function OpenChartButton({
  href,
  label,
  glow = "cyan",
  fullWidth = false,
  pulse = false,
}: OpenChartButtonProps) {
  const router = useRouter();
  const [arming, setArming] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setArming(true);

    setTimeout(() => {
      router.push(href);
    }, 120);
  };

  return (
    <button
      onClick={handleClick}
      className={[
        "group relative inline-flex items-center justify-center overflow-hidden rounded-xl border border-orange-500/30 bg-orange-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-orange-300 transition-all duration-200 hover:border-orange-400 hover:bg-orange-500/25 hover:text-orange-200",
        pulse ? "animate-[pulse_2.5s_ease-in-out_infinite]" : "",
      ].join(" ")}
    >
      <span className="absolute inset-0 opacity-0 transition group-hover:opacity-100 bg-[radial-gradient(circle_at_center,rgba(255,140,0,0.25),transparent_70%)]" />
      <span className="relative z-10">{label}</span>
    </button>
  );
}