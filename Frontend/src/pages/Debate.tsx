import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Swords,
  TrendingUp,
  TrendingDown,
  Scale,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
  Database,
  ShieldAlert,
  Quote,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  streamDebate,
  DebateEvent,
  DebateEvidence,
  DebateClaim,
  DebateComponent,
  DebateModerator,
} from '@/lib/api';

/* ── types ────────────────────────────────────────────────────────────────── */
type Side = 'bull' | 'bear';
type Stage = 'evidence' | 'openings' | 'rebuttals' | 'verdict';
type EvidenceEvent = Extract<DebateEvent, { type: 'evidence' }>;
type VerdictEvent  = Extract<DebateEvent, { type: 'verdict' }>;

interface SideState {
  opening?: { thesis: string; points: DebateClaim[] };
  rebuttal?: { points: DebateClaim[]; concession: string };
}

const STAGES: { key: Stage; label: string }[] = [
  { key: 'evidence',  label: 'Evidence' },
  { key: 'openings',  label: 'Openings' },
  { key: 'rebuttals', label: 'Rebuttals' },
  { key: 'verdict',   label: 'Verdict' },
];

const popularSymbols = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'WIPRO', 'BAJFINANCE'];

const CATEGORY_LABEL: Record<DebateEvidence['category'], string> = {
  model: 'ML Model',
  technical: 'Technicals',
  risk: 'Risk',
  sentiment: 'News Sentiment',
  position: 'Your Position',
};

const SIDE_STYLE: Record<Side, { name: string; icon: typeof TrendingUp; text: string; border: string; bg: string }> = {
  bull: { name: 'Bull', icon: TrendingUp,   text: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
  bear: { name: 'Bear', icon: TrendingDown, text: 'text-red-400',     border: 'border-red-500/30',     bg: 'bg-red-500/10' },
};

const VERDICT_STYLE = {
  BUY:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  HOLD: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  SELL: 'text-red-400 bg-red-500/10 border-red-500/30',
};

/* ── small pieces ─────────────────────────────────────────────────────────── */
const EvidenceChip: React.FC<{ id: string; evidence: Map<string, DebateEvidence> }> = ({ id, evidence }) => {
  const e = evidence.get(id);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-mono font-semibold cursor-help">
          {id}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">
        {e ? (
          <>
            <p className="font-semibold">{e.label}</p>
            <p>{e.value}</p>
            {e.note && <p className="text-muted-foreground">{e.note}</p>}
          </>
        ) : 'Unknown evidence'}
      </TooltipContent>
    </Tooltip>
  );
};

const ClaimRow: React.FC<{ claim: DebateClaim; evidence: Map<string, DebateEvidence> }> = ({ claim, evidence }) => {
  const problems = [
    claim.invalid_ids.length > 0 && `Cites evidence that doesn't exist: ${claim.invalid_ids.join(', ')}`,
    claim.unverified_numbers.length > 0 && `Numbers not found in evidence: ${claim.unverified_numbers.join(', ')}`,
    claim.evidence_ids.length === 0 && 'No valid evidence cited',
  ].filter(Boolean) as string[];

  return (
    <li className="text-sm leading-relaxed">
      {claim.target && (
        <p className="text-xs text-muted-foreground italic mb-0.5">Re: “{claim.target}”</p>
      )}
      <span className="text-foreground">{claim.claim}</span>{' '}
      <span className="inline-flex flex-wrap gap-1 align-middle">
        {claim.evidence_ids.map((id) => <EvidenceChip key={id} id={id} evidence={evidence} />)}
        {!claim.verified && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[10px] font-semibold cursor-help">
                <AlertTriangle className="h-3 w-3" /> unverified
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">{problems.join(' · ')}</TooltipContent>
          </Tooltip>
        )}
      </span>
    </li>
  );
};

const Waiting: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
    <Loader2 className="h-4 w-4 animate-spin" /> {label}
  </div>
);

const SideColumn: React.FC<{
  side: Side;
  state: SideState;
  stage: Stage | null;
  running: boolean;
  evidence: Map<string, DebateEvidence>;
}> = ({ side, state, stage, running, evidence }) => {
  const s = SIDE_STYLE[side];
  const Icon = s.icon;
  const openingPending  = running && !state.opening  && stage === 'openings';
  const rebuttalPending = running && !state.rebuttal && stage === 'rebuttals';

  return (
    <Card className={`glass p-4 sm:p-5 border ${s.border} space-y-4`}>
      <div className="flex items-center gap-3">
        <div className={`h-9 w-9 rounded-xl ${s.bg} flex items-center justify-center`}>
          <Icon className={`h-5 w-5 ${s.text}`} />
        </div>
        <h3 className={`font-bold text-lg ${s.text}`}>{s.name} case</h3>
      </div>

      <section>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Opening</p>
        {state.opening ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <p className="text-sm font-medium flex gap-2">
              <Quote className={`h-4 w-4 flex-shrink-0 mt-0.5 ${s.text}`} />
              {state.opening.thesis}
            </p>
            <ul className="space-y-2 list-disc pl-5 marker:text-muted-foreground">
              {state.opening.points.map((p, i) => <ClaimRow key={i} claim={p} evidence={evidence} />)}
            </ul>
          </motion.div>
        ) : openingPending ? <Waiting label="Building the argument…" /> : (
          <p className="text-sm text-muted-foreground">—</p>
        )}
      </section>

      {(state.rebuttal || rebuttalPending) && (
        <section className="pt-3 border-t border-border/50">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Rebuttal</p>
          {state.rebuttal ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <ul className="space-y-3">
                {state.rebuttal.points.map((p, i) => <ClaimRow key={i} claim={p} evidence={evidence} />)}
              </ul>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Concedes: </span>
                {state.rebuttal.concession}
              </p>
            </motion.div>
          ) : <Waiting label="Answering the other side…" />}
        </section>
      )}
    </Card>
  );
};

const ComponentBar: React.FC<{ c: DebateComponent }> = ({ c }) => {
  // Contributions are within ±0.45; scale so the largest possible fills half the track
  const pct = Math.min(50, (Math.abs(c.contribution) / 0.45) * 50);
  const positive = c.contribution >= 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium capitalize">{c.name} <span className="text-muted-foreground font-normal">· {c.explanation}</span></span>
        <span className={`font-mono ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
          {positive ? '+' : ''}{c.contribution.toFixed(3)}
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-muted/50">
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-border" />
        <div
          className={`absolute top-0 bottom-0 rounded-full ${positive ? 'bg-emerald-500' : 'bg-red-500'}`}
          style={positive ? { left: '50%', width: `${pct}%` } : { right: '50%', width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

const VerdictCard: React.FC<{ v: VerdictEvent; evidence: Map<string, DebateEvidence> }> = ({ v, evidence }) => {
  const m: DebateModerator | null = v.moderator;
  return (
    <Card className="glass border-primary/20 p-4 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Scale className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Verdict</p>
            <span className={`inline-block mt-1 px-3 py-1 rounded-lg border text-xl font-bold ${VERDICT_STYLE[v.verdict]}`}>
              {v.verdict}
            </span>
          </div>
        </div>
        <div className="flex-1 sm:max-w-xs sm:ml-auto">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Confidence</span>
            <span className="font-semibold">{v.confidence}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${v.confidence}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-primary to-secondary"
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Composite {v.composite >= 0 ? '+' : ''}{v.composite.toFixed(3)} · BUY &gt; {v.thresholds.buy}, SELL &lt; {v.thresholds.sell}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">How the score was computed</p>
        {v.components.map((c) => <ComponentBar key={c.name} c={c} />)}
      </div>

      {m ? (
        <div className="space-y-4 pt-4 border-t border-border/50">
          <p className="text-sm leading-relaxed">{m.summary}</p>
          <p className="text-sm">
            <span className="font-semibold">Stronger argument: </span>
            <span className={m.stronger_side === 'bull' ? 'text-emerald-400' : m.stronger_side === 'bear' ? 'text-red-400' : 'text-amber-400'}>
              {m.stronger_side === 'even' ? 'Even' : SIDE_STYLE[m.stronger_side].name}
            </span>
            <span className="text-muted-foreground"> — {m.stronger_side_reason}</span>
          </p>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" /> What could make this wrong
            </p>
            <ul className="space-y-2 list-disc pl-5 marker:text-amber-400">
              {m.key_risks.map((r, i) => <ClaimRow key={i} claim={r} evidence={evidence} />)}
            </ul>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground pt-4 border-t border-border/50">
          Moderator commentary unavailable — the verdict above is computed directly from the evidence.
        </p>
      )}

      <p className="text-[11px] text-muted-foreground">
        Educational analysis generated from model outputs and public news. Not financial advice.
      </p>
    </Card>
  );
};

/* ── page ─────────────────────────────────────────────────────────────────── */
export const Debate: React.FC = () => {
  const [symbol, setSymbol]       = useState('RELIANCE');
  const [running, setRunning]     = useState(false);
  const [stage, setStage]         = useState<Stage | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [evidence, setEvidence]   = useState<EvidenceEvent | null>(null);
  const [sides, setSides]         = useState<Record<Side, SideState>>({ bull: {}, bear: {} });
  const [verdict, setVerdict]     = useState<VerdictEvent | null>(null);
  const [errors, setErrors]       = useState<string[]>([]);
  const [fatal, setFatal]         = useState<string | null>(null);
  const [cached, setCached]       = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const evidenceMap = useMemo(
    () => new Map((evidence?.items ?? []).map((e) => [e.id, e])),
    [evidence],
  );

  const groupedEvidence = useMemo(() => {
    const groups = new Map<DebateEvidence['category'], DebateEvidence[]>();
    for (const e of evidence?.items ?? []) {
      groups.set(e.category, [...(groups.get(e.category) ?? []), e]);
    }
    return groups;
  }, [evidence]);

  const handleEvent = (e: DebateEvent) => {
    switch (e.type) {
      case 'status':
        setStage(e.stage);
        setStatusMsg(e.message);
        break;
      case 'evidence':
        setEvidence(e);
        break;
      case 'argument':
        setSides((prev) => ({
          ...prev,
          [e.side]: e.round === 'opening'
            ? { ...prev[e.side], opening: { thesis: e.thesis, points: e.points } }
            : { ...prev[e.side], rebuttal: { points: e.points, concession: e.concession } },
        }));
        break;
      case 'verdict':
        setStage('verdict');
        setVerdict(e);
        break;
      case 'error':
        if (e.stage === 'evidence') setFatal(e.message);
        else setErrors((prev) => [...prev, `${e.side ? `${e.side} ` : ''}${e.stage}: ${e.message}`]);
        break;
      case 'done':
        setCached(e.cached);
        break;
    }
  };

  const startDebate = async (refresh = false) => {
    const sym = symbol.trim().toUpperCase();
    if (!sym) { setFatal('Please enter a symbol'); return; }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setRunning(true);
    setStage(null);
    setStatusMsg('');
    setEvidence(null);
    setSides({ bull: {}, bear: {} });
    setVerdict(null);
    setErrors([]);
    setFatal(null);
    setCached(false);

    try {
      await streamDebate(sym, handleEvent, { refresh, signal: controller.signal });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setFatal(err instanceof Error ? err.message : 'Debate failed');
      }
    } finally {
      if (abortRef.current === controller) setRunning(false);
    }
  };

  const stageIndex = stage ? STAGES.findIndex((s) => s.key === stage) : -1;
  const started = running || evidence !== null || fatal !== null;

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-4"
      >
        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br from-primary to-secondary glow-primary flex items-center justify-center flex-shrink-0">
          <Swords className="h-5 w-5 sm:h-7 sm:w-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight">
            AI <span className="gradient-text">Debate</span>
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Bull vs Bear agents argue from your model, risk and news data — every claim cites its evidence
          </p>
        </div>
      </motion.div>

      {/* ── Controls ───────────────────────────────────────────────────────── */}
      <Card className="glass border-border/50 p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9&-]/g, ''))}
              onKeyDown={(e) => { if (e.key === 'Enter' && !running) startDebate(); }}
              placeholder="e.g., HDFCBANK"
              className="w-full pl-10 pr-4 rounded-xl bg-muted/40 border border-border/50 focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground outline-none transition-all duration-200 text-sm h-[46px]"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => startDebate()}
            disabled={running}
            className="flex items-center justify-center gap-2 px-6 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold rounded-xl glow-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 text-sm h-[46px] whitespace-nowrap sm:min-w-[180px]"
          >
            {running ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> Debating…</>
            ) : (
              <><Swords className="h-4 w-4" /> Start Debate <ChevronRight className="h-4 w-4" /></>
            )}
          </motion.button>
        </div>
        <div className="flex flex-wrap gap-2">
          {popularSymbols.map((s) => (
            <button
              key={s}
              onClick={() => setSymbol(s)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                symbol === s
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border/50 bg-muted/30 text-muted-foreground hover:text-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </Card>

      {/* ── Progress ───────────────────────────────────────────────────────── */}
      {started && !fatal && (
        <Card className="glass border-border/50 p-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {STAGES.map((s, i) => {
              const done = i < stageIndex || (i === stageIndex && !running);
              const active = i === stageIndex && running;
              return (
                <div key={s.key} className="flex items-center gap-2 text-sm">
                  {done ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    : active ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    : <Circle className="h-4 w-4 text-muted-foreground/50" />}
                  <span className={done || active ? 'text-foreground' : 'text-muted-foreground'}>{s.label}</span>
                </div>
              );
            })}
            <div className="sm:ml-auto flex items-center gap-3 text-xs text-muted-foreground">
              {running && <span>{statusMsg}</span>}
              {!running && cached && <span>Cached from earlier today</span>}
              {!running && evidence && (
                <button onClick={() => startDebate(true)} className="inline-flex items-center gap-1 text-primary hover:underline">
                  <RefreshCw className="h-3 w-3" /> Re-run
                </button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ── Errors ─────────────────────────────────────────────────────────── */}
      {fatal && (
        <Card className="glass border-red-500/30 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{fatal}</p>
        </Card>
      )}
      {errors.length > 0 && (
        <Card className="glass border-amber-500/30 p-4 space-y-1">
          <p className="text-sm font-semibold text-amber-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Some agents couldn't respond
          </p>
          {errors.map((e, i) => <p key={i} className="text-xs text-muted-foreground break-words">{e}</p>)}
        </Card>
      )}

      {/* ── Evidence ───────────────────────────────────────────────────────── */}
      {evidence && (
        <Card className="glass border-border/50 p-4">
          <button onClick={() => setShowEvidence((v) => !v)} className="w-full flex items-center gap-2 text-sm font-semibold">
            <Database className="h-4 w-4 text-primary" />
            Evidence pack · {evidence.items.length} facts
            {evidence.current_price && (
              <span className="text-muted-foreground font-normal">· {evidence.symbol} ₹{evidence.current_price.toLocaleString('en-IN')}</span>
            )}
            {evidence.unavailable.length > 0 && (
              <span className="text-amber-400 font-normal text-xs">· missing: {evidence.unavailable.join(', ')}</span>
            )}
            <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${showEvidence ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence initial={false}>
            {showEvidence && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  {[...groupedEvidence.entries()].map(([cat, items]) => (
                    <div key={cat}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{CATEGORY_LABEL[cat]}</p>
                      <ul className="space-y-1.5">
                        {items.map((e) => (
                          <li key={e.id} className="text-xs flex gap-2">
                            <span className="font-mono font-semibold text-primary w-7 flex-shrink-0">{e.id}</span>
                            <span className="min-w-0 break-words">
                              <span className="text-muted-foreground">{e.label}:</span> {e.value}
                              {e.note && <span className="text-muted-foreground"> — {e.note}</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}

      {/* ── Debate ─────────────────────────────────────────────────────────── */}
      {evidence && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {(['bull', 'bear'] as const).map((side) => (
            <SideColumn key={side} side={side} state={sides[side]} stage={stage} running={running} evidence={evidenceMap} />
          ))}
        </div>
      )}

      {/* ── Verdict ────────────────────────────────────────────────────────── */}
      {verdict ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <VerdictCard v={verdict} evidence={evidenceMap} />
        </motion.div>
      ) : running && stage === 'verdict' ? (
        <Card className="glass border-border/50 p-4"><Waiting label="Moderator is weighing the debate…" /></Card>
      ) : null}
    </div>
  );
};

export default Debate;
