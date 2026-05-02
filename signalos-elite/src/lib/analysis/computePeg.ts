function calcGrowth(current: number | null, previous: number | null) {
  if (
    current == null ||
    previous == null ||
    !Number.isFinite(current) ||
    !Number.isFinite(previous) ||
    previous <= 0
  ) {
    return null;
  }

  const growth = (current - previous) / previous;
  return Number.isFinite(growth) ? growth : null;
}

function average(values: Array<number | null>) {
  const valid = values.filter(
    (value): value is number => value != null && Number.isFinite(value)
  );

  if (!valid.length) return null;

  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

export function computePegFromGrowth({
  pe,
  currentRevenue,
  previousRevenue,
  twoYearsAgoRevenue,
}: {
  pe: number | null;
  currentRevenue: number | null;
  previousRevenue: number | null;
  twoYearsAgoRevenue?: number | null;
}) {
  if (pe == null || !Number.isFinite(pe) || pe <= 0) {
    return null;
  }

  const growth1 = calcGrowth(currentRevenue, previousRevenue);
  const growth2 = calcGrowth(previousRevenue ?? null, twoYearsAgoRevenue ?? null);

  const avgGrowth = average([growth1, growth2]);

  if (avgGrowth == null || avgGrowth <= 0) {
    return null;
  }

  const peg = pe / (avgGrowth * 100);

  return Number.isFinite(peg) ? peg : null;
}