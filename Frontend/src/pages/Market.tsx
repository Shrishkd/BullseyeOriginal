import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Wifi, Bot } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import CandlestickChart from "@/components/CandlestickChart";
import { getCandles, getQuote, explainIndicators } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";

/* ===============================
   Constants
   =============================== */
const WS_BASE =
  import.meta.env.VITE_WS_BASE_URL || "ws://localhost:8000";

export default function Market() {
  /* ===============================
     State
     =============================== */
  const [symbol, setSymbol] = useState("RELIANCE");
  const debouncedSymbol = useDebounce(symbol, 600);

  const [timeframe, setTimeframe] = useState("5");
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const { isAuthenticated } = useAuthStore();

  /* ===============================
     LIVE PRICE STREAM (WebSocket)
     =============================== */
  useEffect(() => {
    if (!isAuthenticated || !debouncedSymbol) {
      wsRef.current?.close();
      wsRef.current = null;
      setWsConnected(false);
      return;
    }

    // 🔒 prevent duplicate sockets
    wsRef.current?.close();

    const ws = new WebSocket(
      `${WS_BASE}/ws/market/${encodeURIComponent(debouncedSymbol)}`
    );

    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (typeof data.price === "number") {
          setLivePrice(data.price);
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = () => {
      setWsConnected(false);
      console.warn("WebSocket error");
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [debouncedSymbol, isAuthenticated]);

  /* ===============================
     QUOTE (REST) – initial/fallback price
     =============================== */
  const { data: quote } = useQuery({
    queryKey: ["quote", debouncedSymbol],
    queryFn: () => getQuote(debouncedSymbol),
    enabled: isAuthenticated && debouncedSymbol.length > 1,
    staleTime: 30 * 1000,
    retry: false,
  });

  /* ===============================
     CANDLESTICKS (REST)
     =============================== */
  const {
    data: candles,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["candles", debouncedSymbol, timeframe],
    queryFn: () => getCandles(debouncedSymbol, timeframe),
    enabled: isAuthenticated && debouncedSymbol.length > 1,
    staleTime: 60 * 1000,
    retry: false,
  });

  /* ===============================
     Error handling (no spam)
     =============================== */
  useEffect(() => {
    if (error instanceof Error) {
      toast.error("Failed to load market candles");
    }
  }, [error]);

  const latestCandle = candles?.[candles.length - 1];

  /* Prefer WebSocket live price; fallback to REST quote or latest candle close */
  const displayPrice: number | null =
    livePrice != null && livePrice > 0
      ? livePrice
      : quote?.price != null && quote.price > 0
        ? quote.price
        : latestCandle?.close ?? null;

  /* ===============================
     AI Explain Indicators
     =============================== */
  const handleExplain = async () => {
    if (!latestCandle) return;

    setExplaining(true);
    setAiExplanation(null);

    try {
      const res = await explainIndicators({
        symbol: debouncedSymbol,
        price: displayPrice ?? latestCandle.close,
        rsi: latestCandle.rsi,
        sma: latestCandle.sma,
        ema: latestCandle.ema,
      });

      setAiExplanation(res.explanation);
    } catch {
      toast.error("Failed to get AI explanation");
    } finally {
      setExplaining(false);
    }
  };

  /* ===============================
     UI
     =============================== */
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-2">
          <span className="gradient-text">Market</span>
        </h1>
        <p className="text-muted-foreground">
          Real-time candlestick charts with AI-powered indicator analysis
        </p>
      </motion.div>

      {/* Symbol Input */}
      <Card className="glass p-4 border-border/50 max-w-sm">
        <label className="text-sm text-muted-foreground mb-1 block">
          Asset Symbol
        </label>
        <Input
          value={symbol}
          onChange={(e) => {
            const value = e.target.value
              .toUpperCase()
              .replace(/[^A-Z]/g, "");
            setSymbol(value);
          }}
          placeholder="RELIANCE, TCS, INFY"
        />
      </Card>

      {/* Market Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass p-6 border-border/50 space-y-4">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">
                {debouncedSymbol}
                {displayPrice != null && displayPrice > 0 ? (
                  <span className="ml-2 text-primary">
                    ₹{displayPrice.toFixed(2)}
                  </span>
                ) : quote?.market_open === false || candles?.length ? (
                  <span className="ml-2 text-muted-foreground text-sm">
                    Market Closed
                  </span>
                ) : null}
              </h2>
            </div>

            {wsConnected && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Wifi className="h-4 w-4 text-green-500" />
                LIVE
              </div>
            )}
          </div>

          {/* Timeframe Selector */}
          <div className="flex gap-2">
            {["1", "5", "15", "60", "D"].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 rounded text-sm ${
                  timeframe === tf
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {tf === "D" ? "1D" : `${tf}m`}
              </button>
            ))}
          </div>

          {/* Chart */}
          {isLoading && <Skeleton className="h-[420px] w-full" />}

          {!isLoading && candles && candles.length > 0 && (
            <CandlestickChart data={candles} />
          )}

          {!isLoading && (!candles || candles.length === 0) && (
            <p className="text-muted-foreground text-sm">
              No candle data available for this symbol.
            </p>
          )}

          {/* AI Explain Button */}
          <div className="flex justify-end mt-4">
            <button
              onClick={handleExplain}
              disabled={explaining || !latestCandle?.rsi}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-white text-sm hover:opacity-90 disabled:opacity-50"
            >
              <Bot className="h-4 w-4" />
              {explaining ? "Analyzing…" : "AI Explain Indicators"}
            </button>
          </div>

          {/* AI Explanation */}
          {aiExplanation && (
            <Card className="mt-4 glass p-4 border-border/50">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                AI Insight
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {aiExplanation}
              </p>
            </Card>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
