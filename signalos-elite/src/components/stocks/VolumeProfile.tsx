"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  IChartApi,
  ISeriesApi,
  LogicalRange,
  UTCTimestamp,
} from "lightweight-charts";

export type VPCandle = {
  time: UTCTimestamp | number | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type Props = {
  chart: IChartApi | null;
  series: ISeriesApi<"Candlestick"> | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  data: VPCandle[];

  bins?: number;
  maxWidth?: number;
  rightPadding?: number;
  opacity?: number;

  showPOC?: boolean;
  showValueArea?: boolean;
  valueAreaPct?: number;

  barColor?: string;
  valueAreaColor?: string;
  pocColor?: string;
  vahColor?: string;
  valColor?: string;

  showLabels?: boolean;
  labelBgColor?: string;
  labelTextColor?: string;

  lineWidth?: number;
  className?: string;
};

type ProfileBin = {
  priceFrom: number;
  priceTo: number;
  priceMid: number;
  volume: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function toUnix(value: VPCandle["time"]): number {
  if (typeof value === "number") return value;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : 0;
}

function buildProfile(
  data: VPCandle[],
  bins: number,
  valueAreaPct: number
): {
  bins: ProfileBin[];
  pocPrice: number | null;
  vahPrice: number | null;
  valPrice: number | null;
  minPrice: number;
  maxPrice: number;
  maxVol: number;
} {
  const clean = data.filter(
    (d) =>
      Number.isFinite(d.high) &&
      Number.isFinite(d.low) &&
      Number.isFinite(d.volume) &&
      d.high >= d.low &&
      d.volume > 0
  );

  if (!clean.length) {
    return {
      bins: [],
      pocPrice: null,
      vahPrice: null,
      valPrice: null,
      minPrice: 0,
      maxPrice: 0,
      maxVol: 0,
    };
  }

  let minPrice = Infinity;
  let maxPrice = -Infinity;

  for (const c of clean) {
    if (c.low < minPrice) minPrice = c.low;
    if (c.high > maxPrice) maxPrice = c.high;
  }

  if (!Number.isFinite(minPrice) || !Number.isFinite(maxPrice)) {
    return {
      bins: [],
      pocPrice: null,
      vahPrice: null,
      valPrice: null,
      minPrice: 0,
      maxPrice: 0,
      maxVol: 0,
    };
  }

  if (minPrice === maxPrice) {
    maxPrice = minPrice + 0.01;
  }

  const safeBins = Math.max(20, Math.min(300, Math.floor(bins || 80)));
  const step = (maxPrice - minPrice) / safeBins;

  const profile: ProfileBin[] = Array.from({ length: safeBins }, (_, i) => {
    const from = minPrice + i * step;
    const to = from + step;
    return {
      priceFrom: from,
      priceTo: to,
      priceMid: (from + to) / 2,
      volume: 0,
    };
  });

  for (const c of clean) {
    const rangeLow = clamp(c.low, minPrice, maxPrice);
    const rangeHigh = clamp(c.high, minPrice, maxPrice);

    let startIdx = Math.floor((rangeLow - minPrice) / step);
    let endIdx = Math.floor((rangeHigh - minPrice) / step);

    startIdx = clamp(startIdx, 0, safeBins - 1);
    endIdx = clamp(endIdx, 0, safeBins - 1);

    if (endIdx < startIdx) {
      const t = startIdx;
      startIdx = endIdx;
      endIdx = t;
    }

    const touched = endIdx - startIdx + 1;
    const share = c.volume / touched;

    for (let i = startIdx; i <= endIdx; i++) {
      profile[i].volume += share;
    }
  }

  let maxVol = 0;
  let pocIdx = 0;
  let totalVol = 0;

  for (let i = 0; i < profile.length; i++) {
    const v = profile[i].volume;
    totalVol += v;
    if (v > maxVol) {
      maxVol = v;
      pocIdx = i;
    }
  }

  const pocPrice = profile[pocIdx]?.priceMid ?? null;

  const targetVol = totalVol * clamp(valueAreaPct, 0.1, 0.99);

  let cumVol = profile[pocIdx]?.volume ?? 0;
  let left = pocIdx;
  let right = pocIdx;

  while (cumVol < targetVol && (left > 0 || right < profile.length - 1)) {
    const leftNext = left > 0 ? profile[left - 1].volume : -1;
    const rightNext = right < profile.length - 1 ? profile[right + 1].volume : -1;

    if (rightNext > leftNext) {
      right++;
      cumVol += profile[right].volume;
    } else if (left > 0) {
      left--;
      cumVol += profile[left].volume;
    } else if (right < profile.length - 1) {
      right++;
      cumVol += profile[right].volume;
    } else {
      break;
    }
  }

  const vahPrice = profile[right]?.priceTo ?? null;
  const valPrice = profile[left]?.priceFrom ?? null;

  return {
    bins: profile,
    pocPrice,
    vahPrice,
    valPrice,
    minPrice,
    maxPrice,
    maxVol,
  };
}

export default function VolumeProfile({
  chart,
  series,
  containerRef,
  data,
  bins = 96,
  maxWidth = 110,
  rightPadding = 8,
  opacity = 0.9,
  showPOC = true,
  showValueArea = true,
  valueAreaPct = 0.7,
  barColor = "rgba(120, 120, 140, 0.32)",
  valueAreaColor = "rgba(90, 160, 255, 0.42)",
  pocColor = "rgba(255, 180, 0, 0.95)",
  vahColor = "rgba(90, 160, 255, 0.95)",
  valColor = "rgba(90, 160, 255, 0.95)",
  showLabels = true,
  labelBgColor = "rgba(255, 255, 255, 0.96)",
  labelTextColor = "#111827",
  lineWidth = 1,
  className = "",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [visibleRange, setVisibleRange] = useState<LogicalRange | null>(null);

  useEffect(() => {
    if (!chart) return;

    const timeScale = chart.timeScale();

    const syncVisibleRange = () => {
      const range = timeScale.getVisibleLogicalRange();
      setVisibleRange(range ?? null);
    };

    syncVisibleRange();
    timeScale.subscribeVisibleLogicalRangeChange(syncVisibleRange);

    return () => {
      timeScale.unsubscribeVisibleLogicalRangeChange(syncVisibleRange);
    };
  }, [chart]);

  const visibleData = useMemo(() => {
    if (!data.length) return [];

    if (!visibleRange) return data;

    const from = Math.max(0, Math.floor(visibleRange.from));
    const to = Math.min(data.length - 1, Math.ceil(visibleRange.to));

    if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) {
      return data;
    }

    return data.slice(from, to + 1);
  }, [data, visibleRange]);

  const profile = useMemo(
    () => buildProfile(visibleData, bins, valueAreaPct),
    [visibleData, bins, valueAreaPct]
  );

  useEffect(() => {
    if (!chart || !series || !containerRef.current || !canvasRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);

    const draw = () => {
      if (!container || !canvas || !ctx || !series) return;

      const rect = container.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));

      if (
        canvas.width !== Math.floor(width * dpr) ||
        canvas.height !== Math.floor(height * dpr)
      ) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      const { bins, maxVol, pocPrice, vahPrice, valPrice } = profile;
      if (!bins.length || maxVol <= 0) return;

      const xRight = width - rightPadding;
      const fullBarWidth = Math.max(20, Math.min(maxWidth, width * 0.22));

      const vaLow = valPrice ?? -Infinity;
      const vaHigh = vahPrice ?? Infinity;

      ctx.globalAlpha = opacity;

      for (const bin of bins) {
        const y1 = series.priceToCoordinate(bin.priceFrom);
        const y2 = series.priceToCoordinate(bin.priceTo);
        const yMid = series.priceToCoordinate(bin.priceMid);

        if (yMid == null) continue;

        let top = y1 ?? yMid - 2;
        let bottom = y2 ?? yMid + 2;

        if (top > bottom) {
          const t = top;
          top = bottom;
          bottom = t;
        }

        const h = Math.max(2, bottom - top);
        const w = (bin.volume / maxVol) * fullBarWidth;
        const x = xRight - w;
        const y = top;

        const inValueArea = bin.priceMid >= vaLow && bin.priceMid <= vaHigh;
        ctx.fillStyle = inValueArea ? valueAreaColor : barColor;
        ctx.fillRect(x, y, w, h);
      }


      ctx.globalAlpha = 1;

      const drawRightLabel = (
        price: number | null,
        text: string,
        lineColor: string
      ) => {
        if (!showLabels || price == null) return;

        const y = series.priceToCoordinate(price);
        if (y == null) return;

        ctx.save();

        const padX = 6;
        const boxH = 18;
        const radius = 6;
        const font = "600 11px Inter, ui-sans-serif, system-ui, sans-serif";
        ctx.font = font;

        const textW = ctx.measureText(text).width;
        const boxW = Math.ceil(textW + padX * 2);

        const x = width - boxW - 6;
        const yTop = Math.round(y - boxH / 2);

        ctx.beginPath();
        const r = Math.min(radius, boxH / 2, boxW / 2);
        ctx.moveTo(x + r, yTop);
        ctx.lineTo(x + boxW - r, yTop);
        ctx.quadraticCurveTo(x + boxW, yTop, x + boxW, yTop + r);
        ctx.lineTo(x + boxW, yTop + boxH - r);
        ctx.quadraticCurveTo(x + boxW, yTop + boxH, x + boxW - r, yTop + boxH);
        ctx.lineTo(x + r, yTop + boxH);
        ctx.quadraticCurveTo(x, yTop + boxH, x, yTop + boxH - r);
        ctx.lineTo(x, yTop + r);
        ctx.quadraticCurveTo(x, yTop, x + r, yTop);
        ctx.closePath();

        ctx.fillStyle = labelBgColor;
        ctx.fill();

        ctx.lineWidth = 1;
        ctx.strokeStyle = lineColor;
        ctx.stroke();

        ctx.fillStyle = labelTextColor;
        ctx.textBaseline = "middle";
        ctx.fillText(text, x + padX, yTop + boxH / 2);

        ctx.restore();
      };

      const drawHorizontalLine = (price: number | null, color: string) => {
        if (price == null) return;

        const y = series.priceToCoordinate(price);
        if (y == null) return;

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.moveTo(width - fullBarWidth - rightPadding - 6, y + 0.5);
        ctx.lineTo(width - 2, y + 0.5);
        ctx.stroke();
      };

      const fmt = (n: number | null) =>
        n == null ? "" : ` ${n.toFixed(2)}`;

      if (showPOC) {
        drawHorizontalLine(pocPrice, pocColor);
        drawRightLabel(pocPrice, `POC${fmt(pocPrice)}`, pocColor);
      }

      if (showValueArea) {
        drawHorizontalLine(vahPrice, vahColor);
        drawHorizontalLine(valPrice, valColor);

        drawRightLabel(vahPrice, `VAH${fmt(vahPrice)}`, vahColor);
        drawRightLabel(valPrice, `VAL${fmt(valPrice)}`, valColor);
      }
    };

    const queueDraw = () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    };

    const ro = new ResizeObserver(queueDraw);
    ro.observe(container);

    const timeScale = chart.timeScale();
    const handleVisibleChange = () => queueDraw();

    timeScale.subscribeVisibleLogicalRangeChange(handleVisibleChange);
    timeScale.subscribeVisibleTimeRangeChange(handleVisibleChange);

    queueDraw();

    return () => {
      ro.disconnect();
      timeScale.unsubscribeVisibleLogicalRangeChange(handleVisibleChange);
      timeScale.unsubscribeVisibleTimeRangeChange(handleVisibleChange);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [
    chart,
    series,
    containerRef,
    profile,
    maxWidth,
    rightPadding,
    opacity,
    showPOC,
    showValueArea,
    showLabels,
    pocColor,
    vahColor,
    valColor,
    labelBgColor,
    labelTextColor,
    lineWidth,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 z-20 ${className}`}
      aria-hidden="true"
    />
  );
}
