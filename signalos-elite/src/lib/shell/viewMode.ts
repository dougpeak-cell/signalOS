export type ShellViewMode = "detail" | "quick";

export function resolveShellViewMode({
  mode,
  shouldForceQuickView,
  isMobilePhoneView,
  isMobilePreview,
  canUseDetail,
}: {
  mode: string | null;
  shouldForceQuickView: boolean;
  isMobilePhoneView: boolean;
  isMobilePreview: boolean;
  canUseDetail: boolean;
}): {
  requestedMode: ShellViewMode;
  safeMode: ShellViewMode;
} {
  const shouldDefaultToQuickView = isMobilePhoneView || isMobilePreview;
  const requestedMode: ShellViewMode =
    mode === "detail"
      ? "detail"
      : mode === "quick" || shouldForceQuickView || shouldDefaultToQuickView
        ? "quick"
        : "detail";

  return {
    requestedMode,
    safeMode: canUseDetail ? requestedMode : "quick",
  };
}