import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getBreakingNews } from "@/lib/api";

export default function News() {
  const { data, isLoading } = useQuery({
    queryKey: ["breaking-news"],
    queryFn: getBreakingNews,
    refetchInterval: 60_000, // refresh every minute
  });

  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-2">
          <span className="gradient-text">News & Sentiment</span>
        </h1>
        <p className="text-muted-foreground">
          Breaking market news impacting Indian markets
        </p>
      </motion.div>

      {isLoading && <p className="text-muted-foreground">Loading news…</p>}

      <div className="grid gap-4">
        {data?.map((news: any, i: number) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card
              className="glass p-4 border-border/50 hover:border-primary/50 cursor-pointer"
              onClick={() => window.open(news.url, "_blank")}
            >
              <div className="flex items-center gap-2 mb-2 text-xs text-red-500">
                <Flame className="h-4 w-4" />
                BREAKING
              </div>

              <h3 className="font-semibold leading-snug mb-1">
                {news.title}
              </h3>

              <div className="text-xs text-muted-foreground flex justify-between">
                <span>{news.source}</span>
                <span>
                  {new Date(news.published_at).toLocaleTimeString()}
                </span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
