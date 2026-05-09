import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Plus, Trash2, Upload, Bot,
  X, AlertCircle, CheckCircle2, BarChart3, Wallet,
  ArrowUpRight, ArrowDownRight, RefreshCw, FileSpreadsheet,
  ChevronRight, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// ── API helpers (from portfolioApi.ts merged into lib/api.ts) ─────────────────
const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '');

function getToken() { return localStorage.getItem('bullseye_token'); }

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers: { ...headers, ...(opts.headers as any) } });
  const text = await res.text();
  let data: any; try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) { const e: any = new Error(data?.detail || 'API error'); e.status = res.status; throw e; }
  return data;
}

export interface HoldingWithStats {
  id: number; symbol: string; quantity: number; buy_price: number;
  buy_date: string; asset_type: string; created_at: string;
  current_price: number | null; current_value: number | null;
  invested_value: number; pnl: number | null; pnl_pct: number | null;
  allocation_pct: number | null;
}
export interface PortfolioSummary {
  total_invested: number; total_current_value: number | null;
  total_pnl: number | null; total_pnl_pct: number | null;
  holdings_count: number; last_updated: string;
}
export interface CSVImportResult {
  imported: number; failed: number;
  errors: Array<{ row: number; symbol?: string; error: string }>;
}

const getHoldings = (): Promise<HoldingWithStats[]> => apiFetch('/portfolio/holdings');
const getSummary = (): Promise<PortfolioSummary> => apiFetch('/portfolio/summary');
const addHolding = (data: any) => apiFetch('/portfolio/holdings', { method: 'POST', body: JSON.stringify(data) });
const deleteHolding = (id: number) => apiFetch(`/portfolio/holdings/${id}`, { method: 'DELETE' });
const getInsights = (): Promise<{ insights: string }> => apiFetch('/portfolio/ai-insights');
const importCSV = async (file: File): Promise<CSVImportResult> => {
  const fd = new FormData(); fd.append('file', file);
  const res = await fetch(`${API_BASE}/portfolio/import`, {
    method: 'POST',
    headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    body: fd,
  });
  const text = await res.text();
  let data: any; try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) { const e: any = new Error(data?.detail || 'Import failed'); throw e; }
  return data;
};

// ── Constants ──────────────────────────────────────────────────────────────────
const SECTOR_COLORS: Record<string, string> = {
  Technology:  '#22c55e',
  Banking:     '#3b82f6',
  Energy:      '#f59e0b',
  Pharma:      '#ec4899',
  Crypto:      '#8b5cf6',
  'ETF / Funds': '#06b6d4',
  Others:      '#6b7280',
};

const ASSET_COLORS: Record<string, string> = {
  stock:       '#22c55e',
  etf:         '#06b6d4',
  crypto:      '#8b5cf6',
  mutual_fund: '#f59e0b',
};

const fmt = (n: number, decimals = 2) =>
  '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

// ── Sector helper (mirrors backend) ───────────────────────────────────────────
function sectorFor(symbol: string, assetType: string): string {
  const s = symbol.toUpperCase();
  if (assetType === 'crypto') return 'Crypto';
  if (['HDFCBANK','ICICIBANK','SBIN','AXISBANK','KOTAKBANK','BANDHANBNK','INDUSINDBK'].includes(s)) return 'Banking';
  if (['TCS','INFY','WIPRO','HCLTECH','TECHM','LTIM','COFORGE','MPHASIS'].includes(s)) return 'Technology';
  if (['RELIANCE','ONGC','BPCL','IOC','GAIL','NTPC','POWERGRID','TATAPOWER'].includes(s)) return 'Energy';
  if (['SUNPHARMA','DRREDDY','CIPLA','DIVISLAB','APOLLOHOSP','LUPIN'].includes(s)) return 'Pharma';
  if (assetType === 'etf' || assetType === 'mutual_fund') return 'ETF / Funds';
  return 'Others';
}

// ── Sub-components ────────────────────────────────────────────────────────────

const SummaryCard = ({
  icon: Icon, label, value, sub, positive,
}: { icon: React.ElementType; label: string; value: string; sub?: string; positive?: boolean }) => (
  <Card className="glass border-border/50 p-5 hover:glass-strong transition-smooth">
    <div className="flex items-start justify-between mb-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="h-4 w-4 text-primary" />
      </div>
    </div>
    <p className="text-2xl font-bold text-foreground">{value}</p>
    {sub && (
      <p className={`text-sm mt-1 flex items-center gap-1 ${positive === true ? 'text-emerald-500' : positive === false ? 'text-red-500' : 'text-muted-foreground'}`}>
        {positive === true && <ArrowUpRight className="h-3.5 w-3.5" />}
        {positive === false && <ArrowDownRight className="h-3.5 w-3.5" />}
        {sub}
      </p>
    )}
  </Card>
);

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Portfolio() {
  const qc = useQueryClient();

  // Queries
  const { data: holdings = [], isLoading: holdingsLoading } = useQuery({
    queryKey: ['portfolio-holdings'],
    queryFn: getHoldings,
    refetchInterval: 60_000,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['portfolio-summary'],
    queryFn: getSummary,
    refetchInterval: 60_000,
  });

  const { data: insightsData, isLoading: insightsLoading, refetch: refetchInsights } = useQuery({
    queryKey: ['portfolio-insights'],
    queryFn: getInsights,
    enabled: false,
    staleTime: 5 * 60 * 1000,
  });

  // Mutations
  const addMutation = useMutation({
    mutationFn: addHolding,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio-holdings'] });
      qc.invalidateQueries({ queryKey: ['portfolio-summary'] });
      toast.success('Holding added!');
      setForm({ symbol: '', quantity: '', buy_price: '', buy_date: '', asset_type: 'stock' });
      setShowAddForm(false);
    },
    onError: (e: any) => toast.error(e.message || 'Failed to add holding'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHolding,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio-holdings'] });
      qc.invalidateQueries({ queryKey: ['portfolio-summary'] });
      toast.success('Holding removed');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to delete'),
  });

  const importMutation = useMutation({
    mutationFn: importCSV,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['portfolio-holdings'] });
      qc.invalidateQueries({ queryKey: ['portfolio-summary'] });
      setImportResult(result);
      toast.success(`Imported ${result.imported} holdings${result.failed ? `, ${result.failed} failed` : ''}`);
    },
    onError: (e: any) => toast.error(e.message || 'Import failed'),
  });

  // Local state
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ symbol: '', quantity: '', buy_price: '', buy_date: '', asset_type: 'stock' });
  const [isDragOver, setIsDragOver] = useState(false);
  const [importResult, setImportResult] = useState<CSVImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived data for pie chart
  const allocationData = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const h of holdings) {
      const sector = sectorFor(h.symbol, h.asset_type);
      map[sector] = (map[sector] || 0) + (h.current_value ?? h.invested_value);
    }
    return Object.entries(map).map(([name, value]) => ({ name, value: +value.toFixed(2) }));
  }, [holdings]);

  // Handlers
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.symbol || !form.quantity || !form.buy_price || !form.buy_date) {
      toast.error('Please fill all required fields');
      return;
    }
    addMutation.mutate({
      symbol: form.symbol.toUpperCase().trim(),
      quantity: parseFloat(form.quantity),
      buy_price: parseFloat(form.buy_price),
      buy_date: new Date(form.buy_date).toISOString(),
      asset_type: form.asset_type,
    });
  };

  const handleFileDrop = useCallback((file: File) => {
    if (!file.name.match(/\.(csv|xlsx|xls)$/i)) {
      toast.error('Please upload a .csv, .xlsx, or .xls file');
      return;
    }
    setImportResult(null);
    importMutation.mutate(file);
  }, [importMutation]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileDrop(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileDrop(file);
    e.target.value = '';
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">
            <span className="gradient-text">Portfolio</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Track your investments with live prices & AI analysis</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 glass border-border/50"
            onClick={() => { qc.invalidateQueries({ queryKey: ['portfolio-holdings'] }); qc.invalidateQueries({ queryKey: ['portfolio-summary'] }); }}
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-gradient-to-r from-primary to-secondary glow-primary"
            onClick={() => setShowAddForm(v => !v)}
          >
            <Plus className="h-4 w-4" /> Add Holding
          </Button>
        </div>
      </motion.div>

      {/* ── Summary Cards ──────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        {summaryLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : summary ? (
          <>
            <SummaryCard icon={Wallet}      label="Total Invested"   value={fmt(summary.total_invested)} />
            <SummaryCard icon={BarChart3}   label="Current Value"
              value={summary.total_current_value != null ? fmt(summary.total_current_value) : '—'}
              sub={summary.total_current_value ? `${summary.holdings_count} holdings` : undefined}
            />
            <SummaryCard icon={TrendingUp}  label="Total P/L"
              value={summary.total_pnl != null ? fmt(Math.abs(summary.total_pnl)) : '—'}
              sub={summary.total_pnl_pct != null ? fmtPct(summary.total_pnl_pct) : undefined}
              positive={summary.total_pnl != null ? summary.total_pnl >= 0 : undefined}
            />
            <SummaryCard icon={BarChart3}   label="Holdings"
              value={String(summary.holdings_count)}
              sub={allocationData.length > 0 ? `${allocationData.length} sectors` : undefined}
            />
          </>
        ) : null}
      </motion.div>

      {/* ── Add Holding Form ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28 }}
          >
            <Card className="glass border-primary/30 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2 text-foreground">
                  <Plus className="h-4 w-4 text-primary" /> Add New Holding
                </h2>
                <button onClick={() => setShowAddForm(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground font-medium">Symbol *</label>
                  <Input placeholder="RELIANCE" value={form.symbol}
                    onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))}
                    className="bg-background/50 border-border/50 focus:border-primary h-9 text-sm" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground font-medium">Quantity *</label>
                  <Input type="number" placeholder="10" min="0.001" step="any" value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                    className="bg-background/50 border-border/50 focus:border-primary h-9 text-sm" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground font-medium">Buy Price (₹) *</label>
                  <Input type="number" placeholder="2450.50" min="0.01" step="any" value={form.buy_price}
                    onChange={e => setForm(f => ({ ...f, buy_price: e.target.value }))}
                    className="bg-background/50 border-border/50 focus:border-primary h-9 text-sm" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground font-medium">Buy Date *</label>
                  <Input type="date" value={form.buy_date}
                    onChange={e => setForm(f => ({ ...f, buy_date: e.target.value }))}
                    className="bg-background/50 border-border/50 focus:border-primary h-9 text-sm" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground font-medium">Asset Type</label>
                  <select
                    value={form.asset_type}
                    onChange={e => setForm(f => ({ ...f, asset_type: e.target.value }))}
                    className="h-9 rounded-md border border-border/50 bg-background/50 px-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="stock">Stock</option>
                    <option value="etf">ETF</option>
                    <option value="crypto">Crypto</option>
                    <option value="mutual_fund">Mutual Fund</option>
                  </select>
                </div>
                <Button type="submit" disabled={addMutation.isPending}
                  className="h-9 bg-gradient-to-r from-primary to-secondary glow-primary text-sm">
                  {addMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> Add</>}
                </Button>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Grid: Table + Pie ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">

        {/* Holdings Table */}
        <div className="xl:col-span-2">
          <Card className="glass border-border/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Holdings
              </h2>
              <Badge variant="outline" className="text-xs">{holdings.length} positions</Badge>
            </div>

            {holdingsLoading ? (
              <div className="p-5 space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
              </div>
            ) : holdings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Wallet className="h-8 w-8 text-primary" />
                </div>
                <p className="font-semibold text-lg mb-1">No holdings yet</p>
                <p className="text-muted-foreground text-sm">Add your first holding or import a CSV to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40">
                      {['Symbol', 'Qty', 'Buy ₹', 'Current ₹', 'P/L', 'Alloc %'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {holdings.map((h, i) => (
                        <motion.tr
                          key={h.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-b border-border/20 hover:bg-muted/20 transition-colors group"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: ASSET_COLORS[h.asset_type] || '#6b7280' }}
                              />
                              <span className="font-semibold text-foreground">{h.symbol}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 hidden sm:inline-flex">
                                {h.asset_type}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{h.quantity}</td>
                          <td className="px-4 py-3 text-muted-foreground">{fmt(h.buy_price)}</td>
                          <td className="px-4 py-3 font-medium">
                            {h.current_price != null ? fmt(h.current_price) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {h.pnl != null ? (
                              <div className={`flex items-center gap-1 font-semibold ${h.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {h.pnl >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                                <span>{fmt(Math.abs(h.pnl))}</span>
                                <span className="text-xs opacity-70">({fmtPct(h.pnl_pct!)})</span>
                              </div>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {h.allocation_pct != null ? `${h.allocation_pct.toFixed(1)}%` : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => deleteMutation.mutate(h.id)}
                              disabled={deleteMutation.isPending}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 p-1 rounded"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Allocation Pie */}
        <div className="space-y-4">
          <Card className="glass border-border/50 p-5">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Allocation by Sector
            </h2>
            {allocationData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No data</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={allocationData}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={85}
                      paddingAngle={3} dataKey="value"
                    >
                      {allocationData.map((entry, i) => (
                        <Cell key={i} fill={SECTOR_COLORS[entry.name] || '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => fmt(val)}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-1">
                  {allocationData.map((d, i) => {
                    const total = allocationData.reduce((s, x) => s + x.value, 0);
                    const pct = total > 0 ? (d.value / total * 100).toFixed(1) : '0';
                    return (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ backgroundColor: SECTOR_COLORS[d.name] || '#6b7280' }} />
                          <span className="text-muted-foreground">{d.name}</span>
                        </div>
                        <span className="font-semibold text-foreground">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* ── CSV Import ──────────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="glass border-border/50 p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-primary" /> Import from CSV / Excel
          </h2>

          <div
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
              isDragOver
                ? 'border-primary bg-primary/5 scale-[1.01]'
                : 'border-border/50 hover:border-primary/50 hover:bg-muted/20'
            }`}
          >
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={onFileChange} className="hidden" />
            {importMutation.isPending ? (
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="h-8 w-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Importing…</p>
              </div>
            ) : (
              <>
                <Upload className={`h-8 w-8 mx-auto mb-3 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className="font-medium text-foreground mb-1">Drop your file here or click to browse</p>
                <p className="text-xs text-muted-foreground">Supports .csv, .xlsx, .xls</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Required columns: <code className="px-1 py-0.5 rounded bg-muted text-primary">SYMBOL, QUANTITY, BUY_PRICE, BUY_DATE</code>
                </p>
              </>
            )}
          </div>

          {/* Import Result */}
          <AnimatePresence>
            {importResult && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {importResult.imported > 0 && (
                    <Badge className="gap-1 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3" /> {importResult.imported} imported
                    </Badge>
                  )}
                  {importResult.failed > 0 && (
                    <Badge variant="destructive" className="gap-1 bg-red-500/10 text-red-500 border-red-500/20">
                      <AlertCircle className="h-3 w-3" /> {importResult.failed} failed
                    </Badge>
                  )}
                </div>
                {importResult.errors.length > 0 && (
                  <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-xs text-red-400">
                        Row {err.row}{err.symbol ? ` (${err.symbol})` : ''}: {err.error}
                      </p>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* ── AI Insights ─────────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="glass border-border/50 p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" /> AI Portfolio Insights
              <Badge variant="outline" className="text-[10px] gap-1 px-1.5">
                <Sparkles className="h-2.5 w-2.5" /> Gemini
              </Badge>
            </h2>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 glass border-primary/30 hover:border-primary/60 text-primary hover:text-primary"
              onClick={() => refetchInsights()}
              disabled={insightsLoading || holdings.length === 0}
            >
              {insightsLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4" /> Analyse Portfolio</>}
            </Button>
          </div>

          {holdings.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">Add some holdings to get AI-powered portfolio analysis.</p>
          ) : insightsLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-4 rounded" style={{ width: `${70 + Math.random() * 30}%` }} />)}
            </div>
          ) : insightsData ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{insightsData.insights}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Bot className="h-7 w-7 text-primary" />
              </div>
              <p className="text-muted-foreground text-sm max-w-xs">
                Click <strong>"Analyse Portfolio"</strong> to get Gemini AI insights on your holdings, risks, and recommendations.
              </p>
            </div>
          )}
        </Card>
      </motion.div>

    </div>
  );
}