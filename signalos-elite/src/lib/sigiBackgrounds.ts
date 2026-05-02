import type { CSSProperties } from "react";

export type SigiBackgroundMode =
  | "neutral"
  | "bullish"
  | "bearish"
  | "macro"
  | "news";

export function getSigiBackground(
  mode?: SigiBackgroundMode | string
): string {
  const normalized = String(mode || "neutral").toLowerCase();

  switch (normalized) {
    case "bullish":
      return "/backgrounds/bull-flow.png";
    case "bearish":
      return "/backgrounds/bear-pressure.png";
    case "macro":
    case "news":
      return "/backgrounds/global-macro.png";
    case "neutral":
    default:
      return "/backgrounds/sigi-grid.png";
  }
}

export function getSigiBackgroundImage(bg: string): string {
  return `
      linear-gradient(
        90deg,
        rgba(2,6,23,0.94) 0%,
        rgba(2,6,23,0.88) 35%,
        rgba(2,6,23,0.75) 65%,
        rgba(2,6,23,0.55) 100%
      ),
      url(${bg})
    `;
}

export function getSigiBackgroundStyle(
  mode?: SigiBackgroundMode | string
): CSSProperties {
  const bg = getSigiBackground(mode);

  return {
    backgroundImage: `
      linear-gradient(
        90deg,
        rgba(2,6,23,0.94) 0%,
        rgba(2,6,23,0.88) 35%,
        rgba(2,6,23,0.75) 65%,
        rgba(2,6,23,0.55) 100%
      ),
      url(${bg})
    `,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  } as const;
}
