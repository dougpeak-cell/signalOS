export function getStyleColor(style: string) {
  const s = style.toLowerCase();

  if (s.includes("sell")) {
    return "bg-cyan-500/15 text-cyan-300 border-cyan-400/20";
  }

  if (s.includes("insider")) {
    return "bg-amber-500/15 text-amber-300 border-amber-400/20";
  }

  if (s.includes("13f")) {
    return "bg-purple-500/15 text-purple-300 border-purple-400/20";
  }

  if (s.includes("cross")) {
    return "bg-emerald-500/15 text-emerald-300 border-emerald-400/20";
  }

  return "bg-white/5 text-white/70 border-white/10";
}