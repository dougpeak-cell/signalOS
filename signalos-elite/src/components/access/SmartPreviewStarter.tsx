"use client";

import { useEffect, useState } from "react";
import {
  isSmartPreviewActive,
  SMART_PREVIEW_WINDOW_MINUTES,
  SMART_PREVIEW_STARTED_EVENT,
  startSmartPreview,
} from "@/lib/premiumAccess";

export default function SmartPreviewStarter() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const syncPreview = () => {
      setActive(isSmartPreviewActive());
    };

    syncPreview();

    const intervalId = window.setInterval(syncPreview, 30000);
    window.addEventListener("focus", syncPreview);
    window.addEventListener("storage", syncPreview);
    window.addEventListener(SMART_PREVIEW_STARTED_EVENT, syncPreview);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", syncPreview);
      window.removeEventListener("storage", syncPreview);
      window.removeEventListener(SMART_PREVIEW_STARTED_EVENT, syncPreview);
    };
  }, []);

  function handleStartPreview() {
    startSmartPreview();
    setActive(true);
  }

  if (active) {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
        Smart Preview Active — full Smart access is open during this session.
      </div>
    );
  }

  return (
    <button
      onClick={handleStartPreview}
      className="rounded-2xl bg-cyan-400 px-5 py-3 font-semibold text-black shadow-lg hover:bg-cyan-300"
    >
      Start {SMART_PREVIEW_WINDOW_MINUTES}-Minute Smart Preview
    </button>
  );
}