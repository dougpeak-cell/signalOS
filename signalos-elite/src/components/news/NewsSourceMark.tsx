type NewsSourceMarkProps = {
  source?: string | null;
  compact?: boolean;
};

function getSourceTheme(source?: string | null) {
  const normalized = String(source ?? "SIGI News").trim();
  const lower = normalized.toLowerCase();

  if (lower.includes("google")) {
    return {
      label: "Google News",
      monogram: "GN",
      border: "border-sky-300/25",
      bg: "bg-[linear-gradient(135deg,rgba(59,130,246,0.18),rgba(16,185,129,0.12))]",
      glow: "shadow-[0_0_18px_rgba(56,189,248,0.18)]",
      badge: "bg-[conic-gradient(from_180deg_at_50%_50%,rgba(59,130,246,0.95),rgba(234,179,8,0.92),rgba(239,68,68,0.92),rgba(34,197,94,0.9),rgba(59,130,246,0.95))]",
      text: "text-sky-100",
      subtext: "text-sky-100/70",
    };
  }

  if (lower.includes("yahoo")) {
    return {
      label: "Yahoo Finance",
      monogram: "YF",
      border: "border-fuchsia-300/25",
      bg: "bg-[linear-gradient(135deg,rgba(168,85,247,0.20),rgba(79,70,229,0.14))]",
      glow: "shadow-[0_0_18px_rgba(168,85,247,0.18)]",
      badge: "bg-[linear-gradient(135deg,rgba(192,132,252,0.95),rgba(99,102,241,0.95))]",
      text: "text-fuchsia-100",
      subtext: "text-fuchsia-100/70",
    };
  }

  return {
    label: normalized || "SIGI News",
    monogram: String(normalized || "SN")
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] ?? "")
      .join("")
      .toUpperCase() || "SN",
    border: "border-cyan-300/20",
    bg: "bg-[linear-gradient(135deg,rgba(34,211,238,0.16),rgba(15,23,42,0.18))]",
    glow: "shadow-[0_0_18px_rgba(34,211,238,0.14)]",
    badge: "bg-[linear-gradient(135deg,rgba(34,211,238,0.95),rgba(14,165,233,0.88))]",
    text: "text-cyan-100",
    subtext: "text-cyan-100/70",
  };
}

export default function NewsSourceMark({
  source,
  compact = false,
}: NewsSourceMarkProps) {
  const theme = getSourceTheme(source);

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border ${theme.border} ${theme.bg} ${theme.glow} ${compact ? "px-2 py-1" : "px-2.5 py-1.5"}`}
    >
      <span
        className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${theme.badge} ${compact ? "h-5 w-5 text-[8px]" : "h-6 w-6 text-[9px]"}`}
      >
        <span className="absolute inset-px rounded-full bg-black/18" />
        <span className={`relative font-bold uppercase tracking-[0.16em] ${theme.text}`}>
          {theme.monogram}
        </span>
      </span>

      <span className="flex min-w-0 flex-col leading-none">
        <span
          className={`truncate font-semibold uppercase tracking-[0.16em] ${theme.text} ${compact ? "text-[9px]" : "text-[10px]"}`}
        >
          {theme.label}
        </span>
      </span>
    </span>
  );
}