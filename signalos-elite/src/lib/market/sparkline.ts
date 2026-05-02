export function buildSparklinePath(
  values: number[],
  width = 120,
  height = 36
): string {
  if (!values.length) return "";

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x =
        values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function getSeriesTrend(values: number[]): "up" | "down" | "flat" {
  if (values.length < 2) return "flat";

  const diff = values[values.length - 1] - values[0];
  if (diff > 0.0001) return "up";
  if (diff < -0.0001) return "down";
  return "flat";
}