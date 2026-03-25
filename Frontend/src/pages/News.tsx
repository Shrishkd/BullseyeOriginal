import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Flame, TrendingUp, TrendingDown, Minus, ExternalLink, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getBreakingNews } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Sentiment {
  score: number;   // -1.0 to 1.0
  label: "Positive" | "Negative" | "Neutral" | "Bullish" | "Bearish";
}

interface NewsArticle {
  title: string;
  description?: string;
  source: string;
  url: string;
  image_url?: string;
  published_at: string;
  sentiment: Sentiment;
}

interface NewsResponse {
  articles: NewsArticle[];
  market_sentiment: Sentiment;
  total: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sentimentColor(label: string) {
  if (label === "Positive" || label === "Bullish") return "text-emerald-500";
  if (label === "Negative" || label === "Bearish") return "text-red-500";
  return "text-yellow-500";
}

function sentimentBadgeVariant(label: string): "default" | "destructive" | "secondary" | "outline" {
  if (label === "Positive" || label === "Bullish") return "default";
  if (label === "Negative" || label === "Bearish") return "destructive";
  return "secondary";
}

function SentimentIcon({ label }: { label: string }) {
  if (label === "Positive" || label === "Bullish")
    return <TrendingUp className="h-3.5 w-3.5" />;
  if (label === "Negative" || label === "Bearish")
    return <TrendingDown className="h-3.5 w-3.5" />;
  return <Minus className="h-3.5 w-3.5" />;
}

function formatTime(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "numeric", month: "short",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function News() {
  const { data, isLoading, isError, error } = useQuery<NewsResponse>({
    queryKey: ["breaking-news"],
    queryFn: getBreakingNews,
    refetchInterval: 60_000,
    retry: 2,
  });

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-1">
          <span className="gradient-text">News & Sentiment</span>
        </h1>
        <p className="text-muted-foreground text-sm">
          Breaking market news with AI sentiment analysis · Auto-refreshes every minute
        </p>
      </motion.div>

      {/* ── Market Sentiment Banner ── */}
      {data?.market_sentiment && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <Card className="glass p-4 border-border/50 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                Overall Market Sentiment
              </p>
              <p className={`text-2xl font-bold ${sentimentColor(data.market_sentiment.label)}`}>
                {data.market_sentiment.label}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-0.5">Sentiment Score</p>
              <p className={`text-3xl font-mono font-semibold ${sentimentColor(data.market_sentiment.label)}`}>
                {data.market_sentiment.score > 0 ? "+" : ""}
                {data.market_sentiment.score.toFixed(2)}
              </p>
            </div>
            <div className={`text-6xl opacity-10 ${sentimentColor(data.market_sentiment.label)}`}>
              <SentimentIcon label={data.market_sentiment.label} />
            </div>
          </Card>
        </motion.div>
      )}

      {/* ── Loading ── */}
      {isLoading && (
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="glass p-4 border-border/50 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </Card>
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {isError && (
        <Card className="glass p-6 border-red-500/30 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-red-500">Failed to load news</p>
            <p className="text-sm text-muted-foreground mt-1">
              {(error as Error)?.message || "Could not connect to news service. Check your API key and backend."}
            </p>
          </div>
        </Card>
      )}

      {/* ── Articles ── */}
      {!isLoading && !isError && (
        <div className="grid gap-4">
          {(data?.articles ?? []).length === 0 ? (
            <p className="text-muted-foreground text-center py-10">No news articles found.</p>
          ) : (
            data?.articles.map((article, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card
                  className="glass p-4 border-border/50 hover:border-primary/50 cursor-pointer transition-colors group"
                  onClick={() => window.open(article.url, "_blank")}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: content */}
                    <div className="flex-1 min-w-0">
                      {/* Source + breaking tag */}
                      <div className="flex items-center gap-2 mb-1.5 text-xs">
                        <span className="flex items-center gap-1 text-red-500 font-medium">
                          <Flame className="h-3.5 w-3.5" />
                          BREAKING
                        </span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground capitalize">{article.source}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">{formatTime(article.published_at)}</span>
                      </div>

                      {/* Title */}
                      <h3 className="font-semibold leading-snug mb-1 group-hover:text-primary transition-colors line-clamp-2">
                        {article.title}
                      </h3>

                      {/* Description */}
                      {article.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {article.description}
                        </p>
                      )}

                      {/* Sentiment badge */}
                      <Badge
                        variant={sentimentBadgeVariant(article.sentiment.label)}
                        className="text-xs gap-1"
                      >
                        <SentimentIcon label={article.sentiment.label} />
                        {article.sentiment.label}
                        <span className="opacity-70 font-mono">
                          {article.sentiment.score > 0 ? "+" : ""}
                          {article.sentiment.score.toFixed(2)}
                        </span>
                      </Badge>
                    </div>

                    {/* Right: image or icon */}
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      {article.image_url ? (
                        <img
                          src={article.image_url}
                          alt=""
                          className="w-20 h-16 object-cover rounded-md opacity-80"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : null}
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
