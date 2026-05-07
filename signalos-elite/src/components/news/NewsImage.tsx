"use client";

import { useState } from "react";

type NewsImageProps = {
  src?: string | null;
  href?: string | null;
  title?: string;
  alt?: string;
  variant?: "banner" | "thumbnail";
  className?: string;
  fallbackClassName?: string;
  unavailableBehavior?: "fallback" | "collapse";
};

function NewsImageFallback({
  variant = "thumbnail",
  title,
  className = "",
}: {
  variant?: "banner" | "thumbnail";
  title?: string;
  className?: string;
}) {
  const heightClass = variant === "banner" ? "h-[130px] md:h-[180px]" : "h-[90px]";
  const fallbackTitle = title?.trim() || "Headline visual unavailable";
  const kicker = variant === "banner" ? "Market Headline" : "Live Update";

  if (variant === "thumbnail") {
    return (
      <div
        className={[
          heightClass,
          "relative w-full overflow-hidden rounded-t-2xl border-b border-cyan-400/20",
          "bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_30%),linear-gradient(135deg,#020617,#031226,#000)]",
          className,
        ].join(" ")}
      >
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(34,211,238,0.08)_45%,transparent_72%)] opacity-70" />
        <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-black/35 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.2em] text-cyan-100/75 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/80" />
          {kicker}
        </div>
        <div className="absolute inset-x-4 bottom-4 h-px bg-cyan-300/25 shadow-[0_0_18px_rgba(34,211,238,0.3)]" />
      </div>
    );
  }

  return (
    <div
      className={[
        heightClass,
        "relative w-full overflow-hidden rounded-t-2xl border-b border-cyan-400/20",
        "bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.16),transparent_35%),linear-gradient(135deg,#020617,#031226,#000)]",
        className,
      ].join(" ")}
    >
      <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(34,211,238,0.08)_45%,transparent_72%)] opacity-70" />
      <div className="absolute inset-x-0 top-0 h-16 bg-linear-to-b from-cyan-400/8 to-transparent" />
      <div className="absolute inset-x-6 bottom-5 h-px bg-cyan-300/25 shadow-[0_0_18px_rgba(34,211,238,0.3)]" />
      <div className="absolute left-5 top-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-black/35 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-100/75 backdrop-blur-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/80" />
        {kicker}
      </div>

      <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/8 bg-black/30 px-4 py-3 backdrop-blur-[2px]">
        <div className="text-[8px] font-semibold uppercase tracking-[0.24em] text-cyan-100/55">
          SIGI Market News
        </div>
        <div
          className={[
            "mt-2 text-white/88",
            variant === "banner"
              ? "line-clamp-3 text-sm font-semibold leading-5"
              : "line-clamp-2 text-[11px] font-semibold leading-4",
          ].join(" ")}
        >
          {fallbackTitle}
        </div>
      </div>
    </div>
  );
}

export default function NewsImage({
  src,
  href,
  title,
  alt,
  variant = "thumbnail",
  className = "",
  fallbackClassName = "",
  unavailableBehavior = "fallback",
}: NewsImageProps) {
  const [failed, setFailed] = useState(false);

  const imageTitle = title ?? alt ?? "Market news image";
  const heightClass = variant === "banner" ? "h-[130px] md:h-[180px]" : "h-[90px]";
  const validSrc = typeof src === "string" && src.trim().length > 8 && !failed;

  if (!validSrc && unavailableBehavior === "collapse") {
    return null;
  }

  const content = validSrc ? (
    <div
      className={[
        "relative w-full overflow-hidden rounded-t-2xl",
        heightClass,
        className,
      ].join(" ")}
    >
      <img
        src={src}
        alt={imageTitle}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/25 to-transparent" />
    </div>
  ) : (
    <NewsImageFallback variant={variant} title={imageTitle} className={fallbackClassName} />
  );

  if (!href) return content;

  return (
    <a href={href} target="_blank" rel="noreferrer" aria-label={`Open article: ${imageTitle}`}>
      {content}
    </a>
  );
}

export { NewsImageFallback };