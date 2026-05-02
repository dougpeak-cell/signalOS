"use client";

type IndexSparklineProps = {
  points?: number[];
  positive?: boolean;
  variant?: "default" | "risk";
};

export default function IndexSparkline({
  points,
  positive = true,
  variant = "default",
}: IndexSparklineProps) {
  const values =
    points?.filter((n) => Number.isFinite(n)).map((n) => Number(n)) ?? [];

  if (values.length < 2) {
    return <div className="h-12 w-full rounded-2xl bg-white/3" />;
  }

  const width = 240;
  const height = 48;
  const paddingX = 4;
  const paddingY = 6;

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const rawRange = rawMax - rawMin || 1;

  const paddedMin = rawMin - rawRange * 0.12;
  const paddedMax = rawMax + rawRange * 0.12;
  const range = paddedMax - paddedMin || 1;

  const stepX = (width - paddingX * 2) / Math.max(values.length - 1, 1);

  const coords = values.map((value, index) => {
    const x = paddingX + index * stepX;
    const y =
      height -
      paddingY -
      ((value - paddedMin) / range) * (height - paddingY * 2);
    return [x, y] as const;
  });

  const d = coords
    .map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`)
    .join(" ");

  const areaD = `${d} L ${coords[coords.length - 1][0]} ${height - paddingY} L ${
    coords[0][0]
  } ${height - paddingY} Z`;

  const strokeColor =
    variant === "risk"
      ? positive
        ? "#2dd4bf"
        : "#fb7185"
      : positive
        ? "#00e5b0"
        : "#ff5c84";

  const fillColor =
    variant === "risk"
      ? positive
        ? "rgba(45,212,191,0.10)"
        : "rgba(251,113,133,0.12)"
      : positive
        ? "rgba(0,229,176,0.11)"
        : "rgba(255,92,132,0.12)";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-12 w-full overflow-visible"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={areaD} fill={fillColor} />
      <path
        d={d}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}