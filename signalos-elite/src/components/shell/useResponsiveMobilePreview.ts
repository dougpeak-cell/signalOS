"use client";

import { useEffect, useState } from "react";

type MobilePreviewMode = "standard" | "dense";

const STANDARD_PREVIEW_WIDTH = 472;
const DENSE_PREVIEW_WIDTH = 508;
const STANDARD_PREVIEW_HEIGHT = 844;
const DENSE_PREVIEW_HEIGHT = 932;

type MobilePreviewFrame = {
  width: number;
  height: number;
  bottomGap: number;
  isFramed: boolean;
};

function getBasePreviewFrame(mode: MobilePreviewMode): MobilePreviewFrame {
  return {
    width: mode === "dense" ? DENSE_PREVIEW_WIDTH : STANDARD_PREVIEW_WIDTH,
    height: mode === "dense" ? DENSE_PREVIEW_HEIGHT : STANDARD_PREVIEW_HEIGHT,
    bottomGap: 0,
    isFramed: true,
  };
}

function getPreviewWidth(mode: MobilePreviewMode) {
  if (typeof window === "undefined") {
    return getBasePreviewFrame(mode).width;
  }

  const viewportWidth = window.innerWidth;
  const gutter = 0;
  const maxUsableWidth = Math.max(320, viewportWidth - gutter * 2);
  const targetWidth = mode === "dense" ? DENSE_PREVIEW_WIDTH : STANDARD_PREVIEW_WIDTH;

  return Math.min(maxUsableWidth, targetWidth);
}

function getPreviewHeight(mode: MobilePreviewMode, width: number) {
  if (typeof window === "undefined") {
    return getBasePreviewFrame(mode).height;
  }

  const targetHeight = mode === "dense"
    ? Math.round((width / DENSE_PREVIEW_WIDTH) * DENSE_PREVIEW_HEIGHT)
    : Math.round((width / STANDARD_PREVIEW_WIDTH) * STANDARD_PREVIEW_HEIGHT);

  return Math.min(window.innerHeight, targetHeight);
}

function getPreviewFrame(mode: MobilePreviewMode): MobilePreviewFrame {
  if (typeof window === "undefined") {
    return getBasePreviewFrame(mode);
  }

  const targetWidth = mode === "dense" ? DENSE_PREVIEW_WIDTH : STANDARD_PREVIEW_WIDTH;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const shouldUseViewportSurface = viewportWidth <= targetWidth + 40;

  if (shouldUseViewportSurface) {
    return {
      width: viewportWidth,
      height: viewportHeight,
      bottomGap: 0,
      isFramed: false,
    };
  }

  const width = getPreviewWidth(mode);
  const height = getPreviewHeight(mode, width);
  const bottomGap = Math.max(0, viewportHeight - height);

  return {
    width,
    height,
    bottomGap,
    isFramed: true,
  };
}

export function useResponsiveMobilePreviewFrame(
  enabled: boolean,
  mode: MobilePreviewMode = "standard"
) {
  const [previewFrame, setPreviewFrame] = useState<MobilePreviewFrame>(() => getBasePreviewFrame(mode));

  useEffect(() => {
    setPreviewFrame(getBasePreviewFrame(mode));
  }, [mode]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const syncFrame = () => {
      setPreviewFrame(getPreviewFrame(mode));
    };

    syncFrame();
    window.addEventListener("resize", syncFrame);
    window.addEventListener("orientationchange", syncFrame);

    return () => {
      window.removeEventListener("resize", syncFrame);
      window.removeEventListener("orientationchange", syncFrame);
    };
  }, [enabled, mode]);

  return previewFrame;
}

export function useResponsiveMobilePreviewWidth(
  enabled: boolean,
  mode: MobilePreviewMode = "standard"
) {
  return useResponsiveMobilePreviewFrame(enabled, mode).width;
}