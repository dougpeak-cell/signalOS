"use client";

import { useEffect, useState } from "react";

export default function PageTransition() {
  const [active, setActive] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setActive(false), 320);
    return () => clearTimeout(t);
  }, []);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-200 bg-black">
      <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_center,rgba(0,140,255,0.12),transparent_60%)]" />
    </div>
  );
}