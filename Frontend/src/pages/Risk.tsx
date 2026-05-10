import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Cell, ReferenceLine,
} from 'recharts';
import {
  ShieldAlert, TrendingDown, Activity, Zap, Target,
  AlertTriangle, CheckCircle2, RefreshCw, ChevronDown,
  ChevronUp, Bot, Sparkles, BarChart3, Flame, Shield,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

// ── API ────────────────────────────────────────────────────────────────────────
const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '');
const getToken = () => localStorage.getItem('bullseye_token');

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers: { ...headers, ...(opts.headers as any) } });
  const text = await res.text();
  let data: any; try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) { const e: any = new Error(data?.detail || 'API error'); throw e; }
  return data;
}

const fetchRiskAnalysis = () => apiFetch<any>('/risk/analysis');
const fetchScenario = (drop: number) =>
  apiFetch<any>('/risk/scenario', { method: 'POST', body: JSON.stringify({ market_drop_pct: drop }) });

// ── Helpers ────────────────────────────────────────────────────────────────────
const RISK_COLORS: Record<string, string> = {
  Low:       '#22c55e',
  Moderate:  '#f59e0b',
  High:      '#f97316',
  'Very High': '#ef4444',
};

const RISK_BG: Record<string, string> = {
  Low:       'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  Moderate:  'bg-amber-500/10 border-amber-500/30 text-amber-400',
  High:      'bg-orange-500/10 border-orange-500/30 text-orange-400',
  'Very High': 'bg-red-500/10 border-red-500/30 text-red-400',
};

const RISK_ICON: Record<string, React.ElementType> = {
  Low:         CheckCircle2,
  Moderate:    Shield,
  High:        AlertTriangle,
  'Very High': Flame,
};

const fmt = (n: number) => '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

const gauge = (score: number) => {
  const angle = -135 + (score / 100) * 270;
  return angle;
};

// ── Gauge Component ────────────────────────────────────────────────────────────
const RiskGauge: React.FC<{ score: number; label: string }> = ({ score, label }) => {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct < 30 ? '#22c55e' : pct < 60 ? '#f59e0b' : pct < 80 ? '#f97316' : '#ef4444';
  const r = 70;
  const circ = Math.PI * r; // half circle
  const strokePct = (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center">
      <svg width="180" height="110" viewBox="0 0 180 110">
        {/* Track */}
        <path d="M 20 95 A 70 70 0 0 1 160 95" fill="none" stroke="hsl(var(--muted))" strokeWidth="14" strokeLinecap="round" />
        {/* Fill */}
        <path
          d="M 20 95 A 70 70 0 0 1 160 95"
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${strokePct} ${circ}`}
          style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
        />
        {/* Needle */}
        <g transform={`rotate(${-135 + (pct / 100) * 270}, 90, 95)`}>
          <line x1="90" y1="95" x2="90" y2="32" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="90" cy="95" r="5" fill={color} />
        </g>
        {/* Labels */}
        <text x="16" y="112" fontSize="10" fill="hsl(var(--muted-foreground))">Low</text>
        <text x="148" y="112" fontSize="10" fill="hsl(var(--muted-foreground))">High</text>
      </svg>
      <div className="text-center -mt-2">
        <p className="text-3xl font-bold" style={{ color }}>{pct.toFixed(0)}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
};

// ── Metric Card ────────────────────────────────────────────────────────────────
const MetricCard: React.FC<{ label: string; value: string; sub?: string; icon: React.ElementType; color?: string }> = ({
  label, value, sub, icon: Icon, color = 'text-primary',
}) => (
  <Card className="glass border-border/50 p-4">
    <div className="flex items-center justify-between mb-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <Icon className={`h-4 w-4 ${color}`} />
    </div>
    <p className="text-xl font-bold text-foreground">{value}</p>
    {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
  </Card>
);

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Risk() {
  const [scenarioDrop, setScenarioDrop] = useState(10);
  const [showHoldings, setShowHoldings] = useState(false);

  const {
    data: risk, isLoading, error, refetch, isFetching,
  } = useQuery({
    queryKey: ['risk-analysis'],
    queryFn: fetchRiskAnalysis,
    staleTime: 5 * 60 * 1000,
  });

  const scenarioMutation = useMutation({
    mutationFn: () => fetchScenario(scenarioDrop),
  });

  const runScenario = () => {
    scenarioMutation.mutate(undefined, {
      onError: (e: any) => toast.error(e.message || 'Scenario failed'),
    });
  };

  // Build radar data from holdings
  const radarData = React.useMemo(() => {
    if (!risk?.holdings) return [];
    return risk.holdings.slice(0, 6).map((h: any) => ({
      symbol: h.symbol,
      Volatility: Math.min(100, h.volatility * 2),
      Drawdown: Math.min(100, h.max_drawdown * 2),
      'Beta Risk': Math.min(100, Math.abs(h.beta) * 50),
      RSI: h.rsi ?? 50,
    }));
  }, [risk]);

  const sectorChartData = React.useMemo(() => {
    if (!risk?.sector_weights) return [];
    return Object.entries(risk.sector_weights as Record<string, number>)
      .map(([name, value]) => ({ name, value: +value.toFixed(1) }))
      .sort((a, b) => b.value - a.value);
  }, [risk]);

  const SECTOR_COLORS_CHART = ['#22c55e','#3b82f6','#f59e0b','#ec4899','#8b5cf6','#06b6d4','#f97316','#6b7280'];

  const riskScore = React.useMemo(() => {
    if (!risk) return 50;
    const volScore = Math.min(100, (risk.portfolio_volatility / 50) * 100);
    const concScore = Math.min(100, risk.hhi_concentration * 400);
    const betaScore = Math.min(100, (risk.portfolio_beta / 2) * 100);
    return Math.round((volScore + concScore + betaScore) / 3);
  }, [risk]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-9 w-56 rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );

  // ── Error / empty ────────────────────────────────────────────────────────────
  if (error || risk?.error) return (
    <div className="p-6 flex flex-col items-center justify-center py-20 text-center">
      <div className="h-20 w-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
        <ShieldAlert className="h-10 w-10 text-amber-400" />
      </div>
      <h2 className="text-2xl font-bold mb-2">No Portfolio Data</h2>
      <p className="text-muted-foreground text-sm max-w-sm">
        {risk?.error || 'Add holdings in your Portfolio section to get risk analysis.'}
      </p>
    </div>
  );

  const riskLevel = risk?.overall_risk_level ?? 'Moderate';
  const RiskIcon = RISK_ICON[riskLevel] ?? ShieldAlert;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">
            <span className="gradient-text">Risk Analysis</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Portfolio safety intelligence — volatility, concentration & stress testing</p>
        </div>
        <Button
          variant="outline" size="sm"
          className="gap-2 glass border-border/50"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </motion.div>

      {/* ── Risk Overview Row ──────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="glass border-border/50 p-5">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Gauge */}
            <div className="flex-shrink-0">
              <RiskGauge score={riskScore} label="Portfolio Risk Score" />
            </div>

            {/* Overall risk badge + flags */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold text-sm ${RISK_BG[riskLevel]}`}>
                  <RiskIcon className="h-4 w-4" />
                  {riskLevel} Risk
                </div>
                <div className="text-sm text-muted-foreground">
                  Based on {risk.holdings_count} holdings across {risk.sectors_count} sectors
                </div>
              </div>

              {/* Risk flags */}
              {risk.risk_flags?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">⚠ Risk Flags</p>
                  <div className="space-y-1.5">
                    {risk.risk_flags.map((flag: string, i: number) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="flex items-start gap-2 text-sm text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2"
                      >
                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        {flag}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
              {risk.risk_flags?.length === 0 && (
                <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2">
                  <CheckCircle2 className="h-4 w-4" /> No major risk flags detected
                </div>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ── Key Metrics ───────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
      >
        <MetricCard label="Volatility" value={`${risk.portfolio_volatility?.toFixed(1)}%`} sub="Annualised" icon={Activity} color="text-amber-400" />
        <MetricCard label="Beta" value={risk.portfolio_beta?.toFixed(2)} sub="vs Market" icon={Zap} color="text-blue-400" />
        <MetricCard label="Sharpe" value={risk.portfolio_sharpe?.toFixed(2)} sub="Risk-adj. return" icon={Target} color="text-emerald-400" />
        <MetricCard label="VaR 95%" value={`${risk.portfolio_var_95?.toFixed(1)}%`} sub="Daily worst case" icon={TrendingDown} color="text-red-400" />
        <MetricCard label="HHI" value={risk.hhi_concentration?.toFixed(3)} sub="Concentration" icon={BarChart3} color="text-purple-400" />
        <MetricCard label="Diversification" value={`${risk.diversification_score?.toFixed(0)}%`} sub="Score" icon={Shield} color="text-cyan-400" />
      </motion.div>

      {/* ── Charts Row ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Sector Concentration Bar */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
          <Card className="glass border-border/50 p-5">
            <h2 className="font-semibold mb-4 text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Sector Concentration
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sectorChartData} layout="vertical" margin={{ left: 60, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis type="category" dataKey="name"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={58} />
                <Tooltip
                  formatter={(v: any) => [`${v.toFixed(1)}%`, 'Allocation']}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                />
                <ReferenceLine x={25} stroke="#f97316" strokeDasharray="4 4" strokeWidth={1.5} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {sectorChartData.map((_, i) => <Cell key={i} fill={SECTOR_COLORS_CHART[i % SECTOR_COLORS_CHART.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-2 text-right">
              Orange line = 25% concentration threshold
            </p>
          </Card>
        </motion.div>

        {/* Volatility Radar */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
          <Card className="glass border-border/50 p-5">
            <h2 className="font-semibold mb-4 text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Holding Risk Radar
            </h2>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="symbol" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar name="Volatility" dataKey="Volatility" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} />
                  <Radar name="Drawdown" dataKey="Drawdown" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} />
                  <Radar name="Beta" dataKey="Beta Risk" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No radar data</div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* ── Scenario / Stress Test ────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="glass border-border/50 p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-400" /> Stress Test — What If Market Drops?
          </h2>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-5">
            <div className="flex-1 space-y-2 w-full">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Market drop</span>
                <span className="font-bold text-orange-400">-{scenarioDrop}%</span>
              </div>
              <Slider
                min={1} max={50} step={1}
                value={[scenarioDrop]}
                onValueChange={([v]) => setScenarioDrop(v)}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>-1%</span><span>-25%</span><span>-50%</span>
              </div>
            </div>
            <Button
              onClick={runScenario}
              disabled={scenarioMutation.isPending}
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white hover:opacity-90 gap-2 shrink-0"
            >
              {scenarioMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><Zap className="h-4 w-4" /> Run Scenario</>}
            </Button>
          </div>

          <AnimatePresence>
            {scenarioMutation.data && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Current Value', value: fmt(scenarioMutation.data.current_value), color: 'text-foreground' },
                    { label: 'Stressed Value', value: fmt(scenarioMutation.data.stressed_value), color: 'text-orange-400' },
                    { label: 'Portfolio Impact', value: `${scenarioMutation.data.impact_pct.toFixed(2)}%`, color: scenarioMutation.data.portfolio_impact < 0 ? 'text-red-400' : 'text-emerald-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-muted/20 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">{label}</p>
                      <p className={`font-bold text-lg ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Per-holding table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/30">
                        {['Symbol', 'Beta', 'Current ₹', 'Stressed ₹', 'Expected Drop', 'P/L Impact'].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-muted-foreground font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {scenarioMutation.data.holdings.map((h: any, i: number) => (
                        <tr key={i} className="border-b border-border/20 hover:bg-muted/10">
                          <td className="px-3 py-2 font-semibold">{h.symbol}</td>
                          <td className="px-3 py-2 text-muted-foreground">{h.beta}</td>
                          <td className="px-3 py-2">{fmt(h.current_price)}</td>
                          <td className="px-3 py-2 text-orange-400">{fmt(h.stressed_price)}</td>
                          <td className="px-3 py-2 text-red-400">-{h.expected_drop}%</td>
                          <td className={`px-3 py-2 font-semibold ${h.pnl_impact < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {h.pnl_impact >= 0 ? '+' : ''}{fmt(h.pnl_impact)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* ── Holdings Risk Table ───────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card className="glass border-border/50 overflow-hidden">
          <button
            className="w-full px-5 py-4 flex items-center justify-between border-b border-border/50 hover:bg-muted/10 transition-colors"
            onClick={() => setShowHoldings(v => !v)}
          >
            <h2 className="font-semibold flex items-center gap-2 text-sm">
              <ShieldAlert className="h-4 w-4 text-primary" /> Per-Holding Risk Metrics
            </h2>
            {showHoldings ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          <AnimatePresence>
            {showHoldings && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/30">
                        {['Symbol', 'Sector', 'Weight', 'Risk Level', 'Volatility', 'Drawdown', 'Sharpe', 'VaR 95%', 'Beta', 'RSI'].map(h => (
                          <th key={h} className="px-3 py-3 text-left text-muted-foreground font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {risk.holdings?.map((h: any, i: number) => (
                        <motion.tr
                          key={h.symbol}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="border-b border-border/20 hover:bg-muted/10"
                        >
                          <td className="px-3 py-2.5 font-bold">{h.symbol}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{h.sector}</td>
                          <td className="px-3 py-2.5">{h.weight_pct}%</td>
                          <td className="px-3 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${RISK_BG[h.risk_level]}`}>
                              {h.risk_level}
                            </span>
                          </td>
                          <td className="px-3 py-2.5" style={{ color: RISK_COLORS[h.risk_level] }}>{h.volatility}%</td>
                          <td className="px-3 py-2.5 text-red-400">{h.max_drawdown > 0 ? `-${h.max_drawdown}%` : '—'}</td>
                          <td className={`px-3 py-2.5 ${h.sharpe_ratio >= 1 ? 'text-emerald-400' : h.sharpe_ratio >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                            {h.sharpe_ratio}
                          </td>
                          <td className="px-3 py-2.5 text-orange-400">{h.var_95}%</td>
                          <td className="px-3 py-2.5">{h.beta}</td>
                          <td className="px-3 py-2.5">
                            {h.rsi ? (
                              <span className={`font-semibold ${h.rsi > 70 ? 'text-red-400' : h.rsi < 30 ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                                {h.rsi}
                              </span>
                            ) : '—'}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* ── AI Risk Summary ───────────────────────────────────────────────────── */}
      {risk.ai_summary && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass border-border/50 p-5">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" /> AI Risk Assessment
              <Badge variant="outline" className="text-[10px] gap-1 px-1.5">
                <Sparkles className="h-2.5 w-2.5" /> Gemini
              </Badge>
            </h2>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {risk.ai_summary}
            </p>
          </Card>
        </motion.div>
      )}

    </div>
  );
}