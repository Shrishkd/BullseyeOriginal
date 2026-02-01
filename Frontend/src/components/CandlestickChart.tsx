import React, { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  UTCTimestamp,
  IChartApi,
  ISeriesApi,
} from "lightweight-charts";

/* ===================== TYPES ===================== */

type RawCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  ema?: number | null;
};

type ChartData =
  | {
      candles?: RawCandle[];
      ema?: { time: number; value: number }[];
    }
  | RawCandle[];

type Props = {
  data?: ChartData;
};

/* ===================== UTILS ===================== */

const toUTCTime = (ms: number): UTCTimestamp =>
  Math.floor(ms / 1000) as UTCTimestamp;

/* ===================== COMPONENT ===================== */

const CandlestickChart: React.FC<Props> = ({ data }) => {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const chart = useRef<IChartApi | null>(null);
  const candleSeries = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const emaSeries = useRef<ISeriesApi<"Line"> | null>(null);

  /* -------- Normalize data shape -------- */
  let candles: RawCandle[] = [];
  let ema:
    | {
        time: number;
        value: number;
      }[]
    | undefined;

  if (Array.isArray(data)) {
    // 1D case (raw array from backend)
    candles = data;
    ema = data
      .filter((c) => typeof c.ema === "number")
      .map((c) => ({ time: c.time, value: c.ema as number }));
  } else if (data && Array.isArray(data.candles)) {
    candles = data.candles;
    ema = data.ema;
  }

  /* ===================== INIT CHART ===================== */

  useEffect(() => {
    if (!chartRef.current) return;

    chart.current = createChart(chartRef.current, {
      layout: {
        background: { color: "#0d1117" },
        textColor: "#d1d5db",
      },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      width: chartRef.current.clientWidth,
      height: 420,
      timeScale: {
        timeVisible: true,
      },
    });

    candleSeries.current = chart.current.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      borderVisible: false,
    });

    emaSeries.current = chart.current.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 2,
    });

    const resize = () => {
      chart.current?.applyOptions({
        width: chartRef.current!.clientWidth,
      });
    };

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      chart.current?.remove();
    };
  }, []);

  /* ===================== SET CANDLES ===================== */

  useEffect(() => {
    if (!candleSeries.current || candles.length === 0) return;

    candleSeries.current.setData(
      candles.map((c) => ({
        time: toUTCTime(c.time),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    chart.current?.timeScale().fitContent();
  }, [candles]);

  /* ===================== SET EMA ===================== */

  useEffect(() => {
    if (!emaSeries.current || !ema || ema.length === 0) return;

    emaSeries.current.setData(
      ema.map((p) => ({
        time: toUTCTime(p.time),
        value: p.value,
      }))
    );
  }, [ema]);

  /* ===================== RENDER ===================== */

  return (
    <div
      ref={chartRef}
      style={{ width: "100%", height: "420px" }}
    />
  );
};

export default CandlestickChart;
