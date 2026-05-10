import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell, BellOff, Plus, Trash2, RefreshCw, Zap, Activity,
  TrendingDown, TrendingUp, Volume2, X, CheckCircle2,
  AlertTriangle, Clock, Target, ChevronRight, Sparkles,
  Shield, BarChart3,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
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

// ── Types ──────────────────────────────────────────────────────────────────────
export interface Alert {
  id: number;
  symbol: string;
  alert_type: string;
  threshold: number;
  note?: string;
  is_active: boolean;
  triggered_count: number;
  last_triggered?: string;
  created_at: string;
}

export interface TriggeredAlert {
  id: number;
  alert_id: number;
  symbol: string;
  alert_type: string;
  threshold: number;
  current_value: number;
  message: string;
  triggered_at: string;
}

export interface CheckResult {
  checked: number;
  triggered: number;
  results: Array<{ alert_id: number; symbol: string; type: string; message: string; value: number; triggered_at: string }>;
  checked_at: string;
}

// ── Alert Config ───────────────────────────────────────────────────────────────
const ALERT_TYPES: Record<string, {
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  unit: string;
  placeholder: string;
  defaultThreshold: number;
}> = {
  price_above: {
    label: 'Price Above',
    description: 'Trigger when LTP rises above a level',
    icon: TrendingUp,
    color: 'text-emerald-400',
    unit: '₹',
    placeholder: 'e.g. 2500',
    defaultThreshold: 0,
  },
  price_below: {
    label: 'Price Below',
    description: 'Trigger when LTP falls below a level',
    icon: TrendingDown,
    color: 'text-red-400',
    unit: '₹',
    placeholder: 'e.g. 2000',
    defaultThreshold: 0,
  },
  rsi_overbought: {
    label: 'RSI Overbought',
    description: 'Trigger when RSI rises above threshold',
    icon: Activity,
    color: 'text-orange-400',
    unit: 'RSI',
    placeholder: 'e.g. 70',
    defaultThreshold: 70,
  },
  rsi_oversold: {
    label: 'RSI Oversold',
    description: 'Trigger when RSI falls below threshold',
    icon: Activity,
    color: 'text-blue-400',
    unit: 'RSI',
    placeholder: 'e.g. 30',
    defaultThreshold: 30,
  },
  volume_spike: {
    label: 'Volume Spike',
    description: 'Trigger when volume exceeds X× 20-day avg',
    icon: Volume2,
    color: 'text-purple-400',
    unit: '×',
    placeholder: 'e.g. 2.5',
    defaultThreshold: 2,
  },
};

const TYPE_BG: Record<string, string> = {
  price_above:    'bg-emerald-500/10 border-emerald-500/20',
  price_below:    'bg-red-500/10 border-red-500/20',
  rsi_overbought: 'bg-orange-500/10 border-orange-500/20',
  rsi_oversold:   'bg-blue-500/10 border-blue-500/20',
  volume_spike:   'bg-purple-500/10 border-purple-500/20',
};

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

function fmtThreshold(type: string, value: number) {
  const cfg = ALERT_TYPES[type];
  if (!cfg) return String(value);
  if (type === 'volume_spike') return `${value}× avg volume`;
  if (type.startsWith('rsi')) return `RSI ${value}`;
  return `₹${value.toLocaleString('en-IN')}`;
}

// ── Alert Type Card ────────────────────────────────────────────────────────────
const AlertTypeCard: React.FC<{
  type: string;
  selected: boolean;
  onClick: () => void;
}> = ({ type, selected, onClick }) => {
  const cfg = ALERT_TYPES[type];
  const Icon = cfg.icon;
  return (
    <button
      onClick={onClick}
      className={`text-left p-3 rounded-xl border transition-all duration-200 w-full ${
        selected
          ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
          : 'border-border/50 bg-muted/20 hover:border-primary/40 hover:bg-muted/40'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${cfg.color}`} />
        <span className="text-sm font-semibold text-foreground">{cfg.label}</span>
      </div>
      <p className="text-xs text-muted-foreground">{cfg.description}</p>
    </button>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Alerts() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'alerts' | 'history'>('alerts');
  const [form, setForm] = useState({
    symbol: '',
    alert_type: 'price_above',
    threshold: '',
    note: '',
  });

  // Queries
  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => apiFetch<Alert[]>('/alerts/'),
    refetchInterval: 30_000,
  });

  const { data: triggered = [], isLoading: historyLoading } = useQuery({
    queryKey: ['alerts-triggered'],
    queryFn: () => apiFetch<TriggeredAlert[]>('/alerts/triggered'),
    refetchInterval: 30_000,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => apiFetch('/alerts/', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alert created!');
      setForm({ symbol: '', alert_type: 'price_above', threshold: '', note: '' });
      setShowForm(false);
    },
    onError: (e: any) => toast.error(e.message || 'Failed to create alert'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      apiFetch(`/alerts/${id}`, { method: 'PUT', body: JSON.stringify({ is_active }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/alerts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alert deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const checkMutation = useMutation({
    mutationFn: () => apiFetch<CheckResult>('/alerts/check'),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['alerts-triggered'] });
      if (data.triggered > 0) {
        toast.success(`${data.triggered} alert(s) triggered!`, { duration: 5000 });
      } else {
        toast.info(`Checked ${data.checked} alerts — none triggered`);
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.symbol || !form.threshold) { toast.error('Symbol and threshold are required'); return; }
    createMutation.mutate({
      symbol: form.symbol.toUpperCase().trim(),
      alert_type: form.alert_type,
      threshold: parseFloat(form.threshold),
      note: form.note || null,
    });
  };

  const selectedTypeCfg = ALERT_TYPES[form.alert_type];
  const activeAlerts = alerts.filter(a => a.is_active);
  const inactiveAlerts = alerts.filter(a => !a.is_active);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">
            <span className="gradient-text">Alerts</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time market monitoring — price, RSI & volume triggers</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline" size="sm"
            className="gap-2 glass border-border/50"
            onClick={() => checkMutation.mutate()}
            disabled={checkMutation.isPending || alerts.length === 0}
          >
            {checkMutation.isPending
              ? <RefreshCw className="h-4 w-4 animate-spin" />
              : <><Zap className="h-4 w-4 text-amber-400" /> Check Now</>}
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-gradient-to-r from-primary to-secondary glow-primary"
            onClick={() => setShowForm(v => !v)}
          >
            <Plus className="h-4 w-4" /> New Alert
          </Button>
        </div>
      </motion.div>

      {/* ── Stats Row ──────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-3"
      >
        {[
          { label: 'Active Alerts', value: activeAlerts.length, icon: Bell, color: 'text-emerald-400' },
          { label: 'Total Triggered', value: alerts.reduce((s, a) => s + a.triggered_count, 0), icon: Zap, color: 'text-amber-400' },
          { label: 'History', value: triggered.length, icon: Clock, color: 'text-blue-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="glass border-border/50 p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground font-medium">{label}</p>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className="text-2xl font-bold">{value}</p>
          </Card>
        ))}
      </motion.div>

      {/* ── Create Alert Form ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28 }}
          >
            <Card className="glass border-primary/30 p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" /> Create New Alert
                </h2>
                <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Alert Type Grid */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Alert Type</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {Object.keys(ALERT_TYPES).map(type => (
                      <AlertTypeCard
                        key={type}
                        type={type}
                        selected={form.alert_type === type}
                        onClick={() => {
                          setForm(f => ({
                            ...f,
                            alert_type: type,
                            threshold: String(ALERT_TYPES[type].defaultThreshold || ''),
                          }));
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Symbol + Threshold + Note */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground font-medium">Symbol *</label>
                    <Input
                      placeholder="RELIANCE, TCS…"
                      value={form.symbol}
                      onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))}
                      className="bg-background/50 border-border/50 focus:border-primary h-9 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground font-medium">
                      Threshold ({selectedTypeCfg?.unit}) *
                    </label>
                    <Input
                      type="number"
                      step="any"
                      placeholder={selectedTypeCfg?.placeholder}
                      value={form.threshold}
                      onChange={e => setForm(f => ({ ...f, threshold: e.target.value }))}
                      className="bg-background/50 border-border/50 focus:border-primary h-9 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground font-medium">Note (optional)</label>
                    <Input
                      placeholder="Reason for alert…"
                      value={form.note}
                      onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                      className="bg-background/50 border-border/50 focus:border-primary h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button type="submit" disabled={createMutation.isPending}
                    className="bg-gradient-to-r from-primary to-secondary glow-primary gap-2">
                    {createMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><Bell className="h-4 w-4" /> Create Alert</>}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tabs ───────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-xl w-fit border border-border/40">
        {(['alerts', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize ${
              activeTab === tab
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'alerts' ? `My Alerts (${alerts.length})` : `Trigger History (${triggered.length})`}
          </button>
        ))}
      </div>

      {/* ── My Alerts Tab ──────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeTab === 'alerts' && (
          <motion.div key="alerts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {alertsLoading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
            ) : alerts.length === 0 ? (
              <Card className="glass border-border/50 p-12 text-center">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Bell className="h-8 w-8 text-primary" />
                </div>
                <p className="font-semibold text-lg mb-1">No alerts yet</p>
                <p className="text-muted-foreground text-sm">Click "New Alert" to start monitoring market conditions.</p>
              </Card>
            ) : (
              <>
                {/* Active */}
                {activeAlerts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                      Active ({activeAlerts.length})
                    </p>
                    {activeAlerts.map((alert, i) => (
                      <AlertRow key={alert.id} alert={alert} index={i}
                        onToggle={(id) => toggleMutation.mutate({ id, is_active: false })}
                        onDelete={(id) => deleteMutation.mutate(id)}
                      />
                    ))}
                  </div>
                )}

                {/* Inactive */}
                {inactiveAlerts.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Paused ({inactiveAlerts.length})
                    </p>
                    {inactiveAlerts.map((alert, i) => (
                      <AlertRow key={alert.id} alert={alert} index={i}
                        onToggle={(id) => toggleMutation.mutate({ id, is_active: true })}
                        onDelete={(id) => deleteMutation.mutate(id)}
                        dimmed
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* ── History Tab ────────────────────────────────────────────────────── */}
        {activeTab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {historyLoading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
            ) : triggered.length === 0 ? (
              <Card className="glass border-border/50 p-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="font-semibold mb-1">No trigger history yet</p>
                <p className="text-muted-foreground text-sm">Use "Check Now" to evaluate your alerts against live market data.</p>
              </Card>
            ) : (
              triggered.map((t, i) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card className={`border p-4 ${TYPE_BG[t.alert_type] || 'glass border-border/50'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="h-9 w-9 rounded-lg bg-background/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                          {React.createElement(ALERT_TYPES[t.alert_type]?.icon ?? Bell, {
                            className: `h-4 w-4 ${ALERT_TYPES[t.alert_type]?.color ?? 'text-primary'}`,
                          })}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-bold text-foreground">{t.symbol}</span>
                            <Badge variant="outline" className="text-[10px]">{ALERT_TYPES[t.alert_type]?.label}</Badge>
                          </div>
                          <p className="text-sm text-foreground/80">{t.message}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            <span>Threshold: {fmtThreshold(t.alert_type, t.threshold)}</span>
                            <span>·</span>
                            <span>Value: {t.current_value.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-muted-foreground whitespace-nowrap">{fmtTime(t.triggered_at)}</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Last Check Result ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {checkMutation.data && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Card className={`border p-4 ${checkMutation.data.triggered > 0 ? 'border-amber-500/30 bg-amber-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
              <div className="flex items-center gap-3">
                {checkMutation.data.triggered > 0
                  ? <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
                  : <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                }
                <div>
                  <p className="font-semibold text-sm">
                    Checked {checkMutation.data.checked} alerts at {fmtTime(checkMutation.data.checked_at)}
                  </p>
                  {checkMutation.data.triggered > 0 ? (
                    <ul className="text-xs text-amber-300 mt-1 space-y-0.5">
                      {checkMutation.data.results.map((r, i) => <li key={i}>⚡ {r.message}</li>)}
                    </ul>
                  ) : (
                    <p className="text-xs text-emerald-400 mt-0.5">All conditions nominal — no alerts triggered</p>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ── Alert Row Sub-component ────────────────────────────────────────────────────
const AlertRow: React.FC<{
  alert: Alert;
  index: number;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  dimmed?: boolean;
}> = ({ alert, index, onToggle, onDelete, dimmed }) => {
  const cfg = ALERT_TYPES[alert.alert_type];
  const Icon = cfg?.icon ?? Bell;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: dimmed ? 0.55 : 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Card className={`border p-4 transition-all group hover:border-primary/30 ${TYPE_BG[alert.alert_type] || 'glass border-border/50'}`}>
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="h-10 w-10 rounded-xl bg-background/40 flex items-center justify-center flex-shrink-0">
            <Icon className={`h-5 w-5 ${cfg?.color ?? 'text-primary'}`} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="font-bold text-foreground">{alert.symbol}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{cfg?.label ?? alert.alert_type}</Badge>
              {alert.triggered_count > 0 && (
                <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-400 border-amber-500/20 gap-1">
                  <Zap className="h-2.5 w-2.5" /> {alert.triggered_count}×
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{cfg?.description}</span>
              <ChevronRight className="h-3 w-3" />
              <span className="font-semibold text-foreground">{fmtThreshold(alert.alert_type, alert.threshold)}</span>
              {alert.note && <><span>·</span><span className="italic">{alert.note}</span></>}
            </div>
            {alert.last_triggered && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Last triggered: {fmtTime(alert.last_triggered)}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onToggle(alert.id)}
              title={alert.is_active ? 'Pause alert' : 'Activate alert'}
              className={`p-2 rounded-lg transition-all ${
                alert.is_active
                  ? 'text-emerald-400 hover:bg-emerald-500/10'
                  : 'text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              {alert.is_active ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </button>
            <button
              onClick={() => onDelete(alert.id)}
              className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};