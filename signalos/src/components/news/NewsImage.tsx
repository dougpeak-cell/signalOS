"use client";

import { useState } from "react";

export default function NewsImage({
  src,
  alt,
  className = "",
  fallbackClassName = "",
}: {
  src?: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`h-full w-full bg-linear-to-br from-cyan-500/15 via-emerald-500/10 to-black ${fallbackClassName}`}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}