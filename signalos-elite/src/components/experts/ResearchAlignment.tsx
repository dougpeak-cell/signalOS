"use client";

import ResearchAlignmentPanel from "@/components/experts/ResearchAlignmentPanel";
import { useResearchAlignment } from "@/hooks/useResearchAlignment";
import { useSigiTier } from "@/hooks/useSigiTier";

export default function ResearchAlignment({ symbol = null, searchable = false, desktopOnly = false, title, compact = false }: {
  symbol?: string | null;
  searchable?: boolean;
  desktopOnly?: boolean;
  title?: string;
  compact?: boolean;
}): React.JSX.Element | null {
  const { tier } = useSigiTier();
  const hasAccess = tier === "pro";
  const research = useResearchAlignment(symbol, hasAccess, searchable, desktopOnly);
  if (!research.visible) return null;
  return (
    <ResearchAlignmentPanel
      title={title} compact={compact}
      symbol={research.ticker} feed={research.feed} loading={research.loading}
      error={research.error} hasAccess={hasAccess} searchable={searchable}
      input={research.input} inputError={research.inputError}
      onInput={research.setInput} onSubmit={research.submit} onRetry={research.retry}
    />
  );
}
