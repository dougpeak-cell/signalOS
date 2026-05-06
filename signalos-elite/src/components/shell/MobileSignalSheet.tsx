"use client";

import type { ReactNode, RefObject } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { useResponsiveMobilePreviewWidth } from "@/components/shell/useResponsiveMobilePreview";

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
  const mobilePreviewWidth = useResponsiveMobilePreviewWidth(forceDesktopPreview);
  const [mounted, setMounted] = useState(false);

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

  if (!open || !mounted) return null;

  return createPortal(
    <div className={forceDesktopPreview ? "fixed inset-0 z-120" : "fixed inset-0 z-120 md:hidden"} aria-modal="true" role="dialog">
      <button
        type="button"
        aria-label="Close sheet"
        onClick={onClose}
        className={`absolute inset-0 ${backdropClassName}`}
      />

      <div
        className="fixed inset-x-0 bottom-0 z-50 min-h-[72vh] overflow-hidden rounded-t-4xl border border-cyan-400/20 bg-slate-950/95 px-5 pb-6 pt-4 shadow-[0_-20px_60px_rgba(34,211,238,0.20)] backdrop-blur-2xl"
        style={
          forceDesktopPreview
            ? {
                left: "50%",
                right: "auto",
                width: "100%",
                maxWidth: `${mobilePreviewWidth}px`,
                transform: "translateX(-50%)",
              }
            : undefined
        }
      >
        <div className="mx-auto flex w-14 justify-center pt-3">
          <div className="h-1.5 w-14 rounded-full bg-white/18" />
        </div>

        <div className="flex items-start justify-between gap-4 border-b border-white/8 px-5 pb-4 pt-3">
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
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-semibold text-white/76 transition hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="signalos-thin-scrollbar max-h-[76vh] overflow-y-auto px-5 py-4">{children}</div>

        {footer ? <div className="border-t border-white/8 px-5 py-4">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}
