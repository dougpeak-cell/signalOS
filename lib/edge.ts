export function fmt1(n: number | null | undefined) {
  if (n == null) return "—";
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toFixed(1);
}

export function computeEdge(opts: {
  proj: number | null | undefined;
  sportsbookLine?: number | null | undefined;
  baseline?: number | null | undefined; // your old “avg last 30d” or whatever
}) {
  const proj = Number(opts.proj);
  const hasProj = Number.isFinite(proj);

  const line = Number(opts.sportsbookLine);
  const hasLine = Number.isFinite(line);

  const base = Number(opts.baseline);
  const hasBase = Number.isFinite(base);

  if (!hasProj) {
    return { edge: null as number | null, label: "—", subtitle: "No projection", mode: "none" as const };
  }

  if (hasLine) {
    const edge = proj - line;
    return {
      edge,
      label: `Edge ${edge >= 0 ? "+" : ""}${edge.toFixed(1)}`,
      subtitle: `Proj ${proj.toFixed(1)} vs Line ${line.toFixed(1)}`,
      mode: "line" as const,
    };
  }

  if (hasBase) {
    const edge = proj - base;
    return {
      edge,
      label: `Edge ${edge >= 0 ? "+" : ""}${edge.toFixed(1)}`,
      subtitle: `Proj ${proj.toFixed(1)} vs Avg ${base.toFixed(1)}`,
      mode: "baseline" as const,
    };
  }

  return {
    edge: null as number | null,
    label: "—",
    subtitle: `Proj ${proj.toFixed(1)}`,
    mode: "proj" as const,
  };
}