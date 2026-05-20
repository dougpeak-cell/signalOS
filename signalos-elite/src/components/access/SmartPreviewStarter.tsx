"use client";

import { useEffect, useState } from "react";
import { isSmartPreviewActive, startSmartPreview } from "@/lib/premiumAccess";

export default function SmartPreviewStarter() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(isSmartPreviewActive());
  }, []);

  function handleStartPreview() {
    startSmartPreview();
    setActive(true);
  }

  if (active) {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
        Smart Preview Active — premium tools are unlocked for this session.
      </div>
    );
  }

  return (
    <button
      onClick={handleStartPreview}
      className="rounded-2xl bg-cyan-400 px-5 py-3 font-semibold text-black shadow-lg hover:bg-cyan-300"
    >
      Start 1-Hour Smart Preview
    </button>
  );
}