"use client";

import type { ReactNode, RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { useResponsiveMobilePreviewFrame } from "@/components/shell/useResponsiveMobilePreview";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  initialFocusRef?: RefObject<HTMLElement | null>;
  forceVisible?: boolean;
  backdropClassName?: string;
};

export default function MobileSignalSheet({
  open,
  onClose,
  title = "Signal Intel",
  subtitle,
  children,
  footer,
  initialFocusRef,
  forceVisible = false,
  backdropClassName = "bg-black/72 backdrop-blur-sm",
}: Props) {
  const searchParams = useSearchParams();
  const forceDesktopPreview = forceVisible || searchParams.get("mobilePreview") === "1";
  const mobilePreviewFrame = useResponsiveMobilePreviewFrame(forceDesktopPreview);
  const [mounted, setMounted] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const timeoutId = window.setTimeout(() => {
      initialFocusRef?.current?.focus();
    }, 40);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timeoutId);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [initialFocusRef, onClose, open]);

  useEffect(() => {
    if (!open) return;

    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [open, title, subtitle]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className={forceDesktopPreview ? "fixed inset-x-0 top-0 z-120" : "fixed inset-0 z-120 md:hidden"}
      style={
        forceDesktopPreview
          ? { bottom: `${mobilePreviewFrame.bottomGap}px` }
          : undefined
      }
      aria-modal="true"
      role="dialog"
    >
      <button
        type="button"
        aria-label="Close sheet"
        onClick={onClose}
        className={`absolute inset-0 ${backdropClassName}`}
      />

      <div
        className={`${forceDesktopPreview ? "absolute" : "fixed"} inset-x-0 bottom-0 z-50 flex max-h-[92dvh] min-h-[72vh] flex-col overflow-hidden rounded-t-4xl border border-cyan-400/20 bg-slate-950/95 px-4 pb-5 pt-4 shadow-[0_-20px_60px_rgba(34,211,238,0.20)] backdrop-blur-2xl sm:px-5 sm:pb-6`}
        style={
          {
            paddingTop: "max(1rem, env(safe-area-inset-top))",
            paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
            paddingLeft: "max(1.25rem, env(safe-area-inset-left))",
            paddingRight: "max(1.25rem, env(safe-area-inset-right))",
            ...(forceDesktopPreview
              ? {
                  left: "50%",
                  right: "auto",
                  width: "100%",
                  maxWidth: `${mobilePreviewFrame.width}px`,
                  transform: "translateX(-50%)",
                }
              : null),
          }
        }
      >
        <div className="mx-auto flex w-14 justify-center pt-3">
          <div className="h-1.5 w-14 rounded-full bg-white/18" />
        </div>

        <div className="flex items-start justify-between gap-3 border-b border-white/8 px-4 pb-4 pt-3 sm:gap-4 sm:px-5">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/72">
              Mobile Surface
            </div>
            <h2 className="mt-1 text-lg font-semibold text-white">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-white/52">{subtitle}</p> : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center self-start rounded-2xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-white/76 transition hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>

        <div
          ref={scrollContainerRef}
          className="signalos-thin-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5"
          style={
            {
              WebkitOverflowScrolling: "touch",
              overscrollBehaviorY: "contain",
              touchAction: "pan-y",
              ...(forceDesktopPreview
                ? { maxHeight: `${Math.max(280, mobilePreviewFrame.height - 190)}px` }
                : undefined),
            }
          }
        >{children}</div>

        {footer ? <div className="border-t border-white/8 px-5 py-4">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}
