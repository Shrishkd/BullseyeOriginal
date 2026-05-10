// Frontend/src/pages/Dashboard.tsx
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  ResponsiveContainer, XAxis, YAxis, Tooltip, Cell,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Wallet, Bell, ShieldAlert,
  Activity, ArrowUpRight, ArrowDownRight, Zap, RefreshCw,
  AlertCircle, BarChart3, Target, Layers, Clock,
  ChevronRight, Radio,
} from 'lucide-react';

// ── API ────────────────────────────────────────────────────────────────────────
const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '');
const getToken = () => localStorage.getItem('bullseye_token');

async function apiFetch<T>(path: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) throw new Error('API error');
  return res.json();
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface DashboardData {
  portfolio: {
    total_invested: number;
    total_current_value: number | null;
    total_pnl: number | null;
    total_pnl_pct: number | null;
    holdings_count: number;
    top_gainers: HoldingStat[];
    top_losers: HoldingStat[];
    asset_allocation: Record<string, number>;
  };
  holdings: HoldingStat[];
  alerts: {
    total: number;
    active: number;
    total_triggers: number;
    recent_triggers: RecentTrigger[];
  };
  market_pulse: MarketPulse[];
  portfolio_sparkline: number[];
  risk_snapshot: { overall: string; concentration_hhi: number; flags: number };
  generated_at: string;
  user: { id: number; email: string; name: string | null };
}

interface HoldingStat {
  symbol: string;
  asset_type: string;
  pnl: number | null;
  pnl_pct: number | null;
  current_price: number | null;
  buy_price: number;
  current_value: number | null;
  invested_value: number;
}

interface MarketPulse {
  symbol: string;
  price: number | null;
  change_1d_pct: number | null;
  change_5d_pct: number | null;
  sparkline: number[];
  rsi: number | null;
}

interface RecentTrigger {
  symbol: string;
  alert_type: string;
  message: string;
  triggered_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtCr = (n: number) => {
  if (Math.abs(n) >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (Math.abs(n) >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)} L`;
  return fmt(n);
};

const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

const RISK_COLOR: Record<string, string> = {
  Low: '#22c55e',
  Moderate: '#f59e0b',
  High: '#ef4444',
  'N/A': '#6b7280',
};

const ASSET_COLORS: Record<string, string> = {
  stock: '#6366f1',
  etf: '#06b6d4',
  crypto: '#8b5cf6',
  mutual_fund: '#f59e0b',
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

// ── Mini Sparkline ─────────────────────────────────────────────────────────────
const Spark: React.FC<{ data: number[]; color: string; height?: number }> = ({
  data, color, height = 40,
}) => {
  if (!data || data.length < 2) return <div style={{ height }} className="flex items-center justify-center text-muted-foreground/30 text-xs">No data</div>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data.map((v, i) => ({ v, i }))} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
        <defs>
          <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
          fill={`url(#sg-${color.replace('#', '')})`} dot={false} isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

// ── Allocation Donut (pure SVG) ────────────────────────────────────────────────
const AllocationDonut: React.FC<{ data: Record<string, number> }> = ({ data }) => {
  const entries = Object.entries(data).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (!total) return null;

  const COLORS = ['#6366f1', '#06b6d4', '#8b5cf6', '#f59e0b', '#22c55e'];
  const r = 52, cx = 64, cy = 64, strokeW = 18;
  const circ = 2 * Math.PI * r;

  let cumPct = 0;
  const slices = entries.map(([label, val], i) => {
    const pct = val / total;
    const dash = pct * circ;
    const gap = circ - dash;
    const offset = -cumPct * circ - circ / 4; // start from top
    cumPct += pct;
    return { label, pct, dash, gap, offset, color: COLORS[i % COLORS.length] };
  });

  return (
    <div className="flex items-center gap-6">
      <svg width={128} height={128} className="flex-shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeW} />
        {slices.map((s, i) => (
          <circle
            key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={s.color} strokeWidth={strokeW - 2}
            strokeDasharray={`${s.dash} ${s.gap}`}
            strokeDashoffset={s.offset}
            strokeLinecap="butt"
            style={{ filter: `drop-shadow(0 0 4px ${s.color}60)` }}
          />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="11" fill="hsl(var(--muted-foreground))">Holdings</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="16" fontWeight="700" fill="hsl(var(--foreground))">
          {entries.length}
        </text>
      </svg>
      <div className="space-y-2 flex-1">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-xs text-muted-foreground capitalize">{s.label.replace('_', ' ')}</span>
            </div>
            <span className="text-xs font-semibold text-foreground">{(s.pct * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── RSI Badge ──────────────────────────────────────────────────────────────────
const RSIBadge: React.FC<{ rsi: number | null }> = ({ rsi }) => {
  if (rsi === null) return null;
  const label = rsi > 70 ? 'OB' : rsi < 30 ? 'OS' : '';
  const color = rsi > 70 ? 'text-red-400 bg-red-500/10' : rsi < 30 ? 'text-emerald-400 bg-emerald-500/10' : 'text-muted-foreground bg-muted/30';
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${color}`}>
      RSI {rsi.toFixed(0)}{label ? ` · ${label}` : ''}
    </span>
  );
};

// ── Empty State ────────────────────────────────────────────────────────────────
const EmptyState: React.FC<{ icon: React.ElementType; title: string; sub: string }> = ({
  icon: Icon, title, sub,
}) => (
  <div className="flex flex-col items-center justify-center py-10 text-center">
    <div className="h-14 w-14 rounded-2xl bg-muted/40 border border-border/30 flex items-center justify-center mb-3">
      <Icon className="h-7 w-7 text-muted-foreground" />
    </div>
    <p className="font-semibold text-sm mb-1">{title}</p>
    <p className="text-xs text-muted-foreground max-w-[200px]">{sub}</p>
  </div>
);

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { data, isLoading, error, refetch, isFetching } = useQuery<DashboardData>({
    queryKey: ['dashboard-summary'],
    queryFn: () => apiFetch('/dashboard/summary'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const pnlPositive = (data?.portfolio.total_pnl ?? 0) >= 0;
  const portfolioSparkColor = pnlPositive ? '#22c55e' : '#ef4444';

  const moversBarData = useMemo(() => {
    if (!data?.holdings) return [];
    return data.holdings
      .filter(h => h.pnl_pct !== null)
      .sort((a, b) => (b.pnl_pct ?? 0) - (a.pnl_pct ?? 0))
      .slice(0, 8)
      .map(h => ({ symbol: h.symbol, pnl_pct: h.pnl_pct ?? 0 }));
  }, [data]);

  const allocationTotal = useMemo(() => {
    if (!data?.portfolio.asset_allocation) return 0;
    return Object.values(data.portfolio.asset_allocation).reduce((s, v) => s + v, 0);
  }, [data]);

  if (isLoading) return (
    <div className="p-6 space-y-6">
      <div className="h-8 w-48 bg-muted/50 rounded-lg animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-muted/30 rounded-2xl animate-pulse border border-border/30" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-52 bg-muted/30 rounded-2xl animate-pulse border border-border/30" />
        ))}
      </div>
    </div>
  );

  if (error) return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] text-center">
      <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
      <h2 className="font-bold text-lg mb-1">Failed to load dashboard</h2>
      <p className="text-muted-foreground text-sm mb-4">Check your connection or try again.</p>
      <button
        onClick={() => refetch()}
        className="px-4 py-2 rounded-lg bg-primary/10 text-primary border border-primary/20 text-sm font-medium hover:bg-primary/20 transition-colors"
      >
        Retry
      </button>
    </div>
  );

  const d = data!;
  const p = d.portfolio;
  const hasPortfolio = p.holdings_count > 0;

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold leading-tight">
            {d.user.name ? (
              <>Good to see you, <span className="gradient-text">{d.user.name.split(' ')[0]}</span></>
            ) : (
              <>Your <span className="gradient-text">Dashboard</span></>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1.5">
            <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
            Live data · Updated {new Date(d.generated_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/50 bg-muted/20 text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </motion.div>

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <motion.div variants={stagger} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

        {/* Portfolio Value */}
        <motion.div variants={fadeUp}>
          <div className="glass border border-border/50 rounded-2xl p-5 hover:border-primary/30 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Portfolio Value</p>
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet className="h-3.5 w-3.5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground leading-none mb-2">
              {p.total_current_value != null ? fmtCr(p.total_current_value) : fmtCr(p.total_invested)}
            </p>
            {p.total_pnl != null ? (
              <div className={`flex items-center gap-1 text-xs font-semibold ${pnlPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {pnlPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {fmt(Math.abs(p.total_pnl))} ({fmtPct(p.total_pnl_pct!)})
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Invested: {fmtCr(p.total_invested)}</p>
            )}
            {/* Mini sparkline */}
            {d.portfolio_sparkline.length > 2 && (
              <div className="mt-3 -mx-1">
                <Spark data={d.portfolio_sparkline} color={portfolioSparkColor} height={36} />
              </div>
            )}
          </div>
        </motion.div>

        {/* Total P&L */}
        <motion.div variants={fadeUp}>
          <div className="glass border border-border/50 rounded-2xl p-5 hover:border-primary/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total P&L</p>
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              </div>
            </div>
            {p.total_pnl != null ? (
              <>
                <p className={`text-2xl font-bold leading-none mb-2 ${pnlPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {pnlPositive ? '+' : '-'}{fmtCr(Math.abs(p.total_pnl))}
                </p>
                <div className={`text-xs font-semibold flex items-center gap-1 ${pnlPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {pnlPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {fmtPct(p.total_pnl_pct!)} overall return
                </div>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold leading-none mb-2 text-muted-foreground">—</p>
                <p className="text-xs text-muted-foreground">Live prices loading</p>
              </>
            )}
            <div className="mt-3 flex gap-1">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{
                    height: 20,
                    backgroundColor: i < Math.round(Math.max(0, Math.min(10, ((p.total_pnl_pct ?? 0) + 20) / 4)))
                      ? (pnlPositive ? '#22c55e' : '#ef4444')
                      : 'hsl(var(--muted))',
                    opacity: 0.3 + i * 0.07,
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Alerts */}
        <motion.div variants={fadeUp}>
          <div className="glass border border-border/50 rounded-2xl p-5 hover:border-primary/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Alerts</p>
              <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Bell className="h-3.5 w-3.5 text-amber-400" />
              </div>
            </div>
            <p className="text-2xl font-bold leading-none mb-2">{d.alerts.active}</p>
            <p className="text-xs text-muted-foreground">Active of {d.alerts.total} total</p>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full"
                  style={{ width: d.alerts.total > 0 ? `${(d.alerts.active / d.alerts.total) * 100}%` : '0%' }}
                />
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {d.alerts.total_triggers} triggered
              </span>
            </div>
          </div>
        </motion.div>

        {/* Risk */}
        <motion.div variants={fadeUp}>
          <div className="glass border border-border/50 rounded-2xl p-5 hover:border-primary/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Risk Level</p>
              <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <ShieldAlert className="h-3.5 w-3.5 text-blue-400" />
              </div>
            </div>
            <p className="text-2xl font-bold leading-none mb-2" style={{ color: RISK_COLOR[d.risk_snapshot.overall] }}>
              {d.risk_snapshot.overall}
            </p>
            <p className="text-xs text-muted-foreground">
              {d.risk_snapshot.flags > 0 ? `${d.risk_snapshot.flags} flag${d.risk_snapshot.flags > 1 ? 's' : ''} detected` : 'No flags detected'}
            </p>
            {d.risk_snapshot.concentration_hhi !== undefined && (
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Concentration (HHI)</span>
                  <span>{d.risk_snapshot.concentration_hhi?.toFixed(3) ?? '—'}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (d.risk_snapshot.concentration_hhi ?? 0) * 300)}%`,
                      backgroundColor: RISK_COLOR[d.risk_snapshot.overall],
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* ── Middle Row: Market Pulse + Portfolio Movers ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Market Pulse */}
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <div className="glass border border-border/50 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Market Pulse
              </h2>
              <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted/40 border border-border/30">
                Live
              </span>
            </div>

            {d.market_pulse.length === 0 ? (
              <EmptyState icon={Activity} title="No market data" sub="Market data will appear here once loaded" />
            ) : (
              <div className="divide-y divide-border/20">
                {d.market_pulse.map((m, i) => (
                  <motion.div
                    key={m.symbol}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-muted/10 transition-colors"
                  >
                    {/* Symbol */}
                    <div className="w-24 flex-shrink-0">
                      <p className="font-bold text-sm text-foreground">{m.symbol}</p>
                      <RSIBadge rsi={m.rsi} />
                    </div>

                    {/* Sparkline */}
                    <div className="flex-1 min-w-0 hidden sm:block">
                      <Spark
                        data={m.sparkline}
                        color={(m.change_1d_pct ?? 0) >= 0 ? '#22c55e' : '#ef4444'}
                        height={32}
                      />
                    </div>

                    {/* Price & change */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-sm">
                        {m.price != null ? fmt(m.price) : '—'}
                      </p>
                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        {m.change_1d_pct != null && (
                          <span className={`text-xs font-semibold flex items-center gap-0.5 ${m.change_1d_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {m.change_1d_pct >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {Math.abs(m.change_1d_pct).toFixed(2)}%
                          </span>
                        )}
                        {m.change_5d_pct != null && (
                          <span className="text-[10px] text-muted-foreground">
                            5d: {m.change_5d_pct >= 0 ? '+' : ''}{m.change_5d_pct.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Portfolio Allocation */}
        <motion.div variants={fadeUp}>
          <div className="glass border border-border/50 rounded-2xl overflow-hidden h-full">
            <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Allocation</h2>
            </div>
            <div className="p-5">
              {!hasPortfolio || allocationTotal === 0 ? (
                <EmptyState icon={Layers} title="No holdings" sub="Add holdings in Portfolio to see allocation" />
              ) : (
                <AllocationDonut data={p.asset_allocation} />
              )}
            </div>
            {hasPortfolio && (
              <div className="px-5 pb-5">
                <div className="pt-3 border-t border-border/20 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{p.holdings_count} position{p.holdings_count !== 1 ? 's' : ''}</span>
                  <span>{fmtCr(p.total_invested)} invested</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Bottom Row: Movers + Alerts ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Movers Bar Chart */}
        <motion.div variants={fadeUp} className="lg:col-span-3">
          <div className="glass border border-border/50 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Holdings P&L</h2>
            </div>
            <div className="p-5">
              {moversBarData.length === 0 ? (
                <EmptyState icon={BarChart3} title="No holdings data" sub="Add holdings to see P&L breakdown" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={moversBarData} margin={{ top: 4, bottom: 0, left: 0, right: 4 }}>
                    <XAxis
                      dataKey="symbol"
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis
                      tickFormatter={v => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`}
                      tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false} tickLine={false} width={44}
                    />
                    <Tooltip
                      formatter={(v: any) => [`${v >= 0 ? '+' : ''}${Number(v).toFixed(2)}%`, 'P&L']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '10px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="pnl_pct" radius={[4, 4, 0, 0]}>
                      {moversBarData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.pnl_pct >= 0 ? '#22c55e' : '#ef4444'}
                          fillOpacity={0.85}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top gainer / loser strip */}
            {(p.top_gainers.length > 0 || p.top_losers.length > 0) && (
              <div className="border-t border-border/20 grid grid-cols-2 divide-x divide-border/20">
                <div className="px-4 py-3">
                  <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-2">Top Gainer</p>
                  {p.top_gainers[0] && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">{p.top_gainers[0].symbol}</span>
                      <span className="text-xs text-emerald-400 font-semibold">
                        +{p.top_gainers[0].pnl_pct?.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-2">Top Loser</p>
                  {p.top_losers[0] && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">{p.top_losers[0].symbol}</span>
                      <span className="text-xs text-red-400 font-semibold">
                        {p.top_losers[0].pnl_pct?.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Alerts Panel */}
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <div className="glass border border-border/50 rounded-2xl overflow-hidden h-full">
            <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <h2 className="font-semibold text-sm">Recent Triggers</h2>
              </div>
              {d.alerts.active > 0 && (
                <span className="h-5 w-5 rounded-full bg-amber-400/20 text-amber-400 text-[10px] font-bold flex items-center justify-center border border-amber-400/30">
                  {d.alerts.active}
                </span>
              )}
            </div>

            <div className="p-3 space-y-2">
              {d.alerts.recent_triggers.length === 0 ? (
                <EmptyState icon={Bell} title="No triggers yet" sub="Use 'Check Now' on the Alerts page to evaluate your active alerts" />
              ) : (
                d.alerts.recent_triggers.map((t, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15"
                  >
                    <Zap className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-bold text-foreground">{t.symbol}</span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(t.triggered_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{t.message}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Alerts quick stats */}
            <div className="border-t border-border/20 px-5 py-3 grid grid-cols-3 gap-2">
              {[
                { label: 'Active', value: d.alerts.active, color: 'text-emerald-400' },
                { label: 'Total', value: d.alerts.total, color: 'text-foreground' },
                { label: 'Fired', value: d.alerts.total_triggers, color: 'text-amber-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <p className={`text-lg font-bold ${color}`}>{value}</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Quick Nav Strip ───────────────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Portfolio', sub: `${p.holdings_count} holdings`, href: '/portfolio', icon: Wallet, color: 'from-primary/20 to-primary/5 border-primary/20 hover:border-primary/40' },
            { label: 'Risk Analysis', sub: `${d.risk_snapshot.overall} risk`, href: '/risk', icon: ShieldAlert, color: 'from-blue-500/20 to-blue-500/5 border-blue-500/20 hover:border-blue-500/40' },
            { label: 'AI Predictions', sub: 'XGBoost + LSTM', href: '/predictions', icon: Target, color: 'from-purple-500/20 to-purple-500/5 border-purple-500/20 hover:border-purple-500/40' },
            { label: 'Alerts', sub: `${d.alerts.active} active`, href: '/alerts', icon: Bell, color: 'from-amber-500/20 to-amber-500/5 border-amber-500/20 hover:border-amber-500/40' },
          ].map(({ label, sub, href, icon: Icon, color }) => (
            <a
              key={label}
              href={href}
              className={`glass bg-gradient-to-br ${color} border rounded-2xl p-4 flex items-center justify-between group transition-all duration-200`}
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </div>
              <div className="flex items-center gap-1">
                <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </div>
            </a>
          ))}
        </div>
      </motion.div>

    </motion.div>
  );
}