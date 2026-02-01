import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PricePoint {
  time: string;
  price: number;
}

export default function MarketPriceChart({ data }: { data: PricePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <XAxis dataKey="time" hide />
        <YAxis domain={["auto", "auto"]} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="price"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
          isAnimationActive
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
