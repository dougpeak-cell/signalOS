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
};

function NewsImageFallback({
  variant = "thumbnail",
  className = "",
}: {
  variant?: "banner" | "thumbnail";
  className?: string;
}) {
  const heightClass = variant === "banner" ? "h-[130px] md:h-[180px]" : "h-[90px]";

  return (
    <div
      className={[
        heightClass,
        "relative flex w-full items-center justify-center overflow-hidden rounded-t-2xl",
        "border-b border-cyan-400/20 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.22),transparent_35%),linear-gradient(135deg,#020617,#020b1f,#000)]",
        className,
      ].join(" ")}
    >
      <div className="absolute inset-0 opacity-25 bg-[linear-gradient(115deg,transparent_0%,rgba(34,211,238,0.12)_45%,transparent_70%)]" />
      <div className="absolute inset-x-6 bottom-4 h-px bg-cyan-300/30 shadow-[0_0_18px_rgba(34,211,238,0.45)]" />
      <div className="relative text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-100/80">
        SigiOS Market News
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
}: NewsImageProps) {
  const [failed, setFailed] = useState(false);

  const imageTitle = title ?? alt ?? "Market news image";
  const heightClass = variant === "banner" ? "h-[130px] md:h-[180px]" : "h-[90px]";
  const validSrc = typeof src === "string" && src.trim().length > 8 && !failed;

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
    <NewsImageFallback variant={variant} className={fallbackClassName} />
  );

  if (!href) return content;

  return (
    <a href={href} target="_blank" rel="noreferrer" aria-label={`Open article: ${imageTitle}`}>
      {content}
    </a>
  );
}

export { NewsImageFallback };