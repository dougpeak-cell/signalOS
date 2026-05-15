"use client";

import { useEffect, useState } from "react";

type MobilePreviewMode = "standard" | "dense";

const STANDARD_PREVIEW_WIDTH = 402;
const DENSE_PREVIEW_WIDTH = 430;

function getPreviewWidth(mode: MobilePreviewMode) {
  if (typeof window === "undefined") {
    return mode === "dense" ? DENSE_PREVIEW_WIDTH : STANDARD_PREVIEW_WIDTH;
  }

  const viewportWidth = window.innerWidth;
  const gutter = 0;
  const maxUsableWidth = Math.max(320, viewportWidth - gutter * 2);
  const targetWidth = mode === "dense" ? DENSE_PREVIEW_WIDTH : STANDARD_PREVIEW_WIDTH;

  return Math.min(maxUsableWidth, targetWidth);
}

export function useResponsiveMobilePreviewWidth(
  enabled: boolean,
  mode: MobilePreviewMode = "standard"
) {
  const [previewWidth, setPreviewWidth] = useState(STANDARD_PREVIEW_WIDTH);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const syncWidth = () => {
      setPreviewWidth(getPreviewWidth(mode));
    };

    syncWidth();
    window.addEventListener("resize", syncWidth);
    window.addEventListener("orientationchange", syncWidth);

    return () => {
      window.removeEventListener("resize", syncWidth);
      window.removeEventListener("orientationchange", syncWidth);
    };
  }, [enabled, mode]);

  return previewWidth;
}