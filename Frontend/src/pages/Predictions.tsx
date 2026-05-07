import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  RefreshCw,
  Brain,
  AlertCircle,
  Clock,
  Zap,
  Cpu,
  BarChart2,
  Activity,
  TrendingUp,
  ShieldAlert,
  ChevronRight,
  CheckCircle2,
  CircleOff,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PredictionService } from '../services/predictionService';
import { PredictionResponse, ModelType } from '../types/prediction';
import { PredictionCard } from '../components/PredictionCard';
import { SignalsList } from '../components/SignalsList';

/* ── animation variants ───────────────────────────────────────────────────── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};
const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

const popularSymbols = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'WIPRO', 'BAJFINANCE'];

export const Predictions: React.FC = () => {
  const [symbol, setSymbol]           = useState('RELIANCE');
  const [model, setModel]             = useState<ModelType>('xgboost');
  const [prediction, setPrediction]   = useState<PredictionResponse | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const [modelStatus, setModelStatus] = useState<{
    xgboost_trained: boolean;
    lstm_trained: boolean;
  } | null>(null);

  /* ── fetch model availability ─────────────────────────────────────────── */
  const checkModels = async (sym: string) => {
    try {
      const res = await PredictionService.getAvailableModels(sym.toUpperCase());
      setModelStatus({
        xgboost_trained: (res as any).xgboost_trained ?? res.models?.includes('xgboost') ?? false,
        lstm_trained:    (res as any).lstm_trained    ?? res.models?.includes('lstm')    ?? false,
      });
    } catch {
      setModelStatus(null);
    }
  };

  useEffect(() => {
    if (symbol.trim().length > 1) checkModels(symbol);
  }, [symbol]);

  /* ── fetch prediction ─────────────────────────────────────────────────── */
  const fetchPrediction = async () => {
    if (!symbol.trim()) { setError('Please enter a symbol'); return; }
    setLoading(true);
    setError(null);
    setPrediction(null);
    try {
      const result = await PredictionService.getPrediction(symbol.toUpperCase(), model);
      setPrediction(result);
      checkModels(symbol);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prediction');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') fetchPrediction();
  };

  const isFirstTrain =
    model === 'xgboost' && modelStatus !== null && !modelStatus.xgboost_trained;

  /* ── render ───────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen p-6 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-4"
      >
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-secondary glow-primary flex items-center justify-center flex-shrink-0">
          <Brain className="h-7 w-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold leading-tight">
            AI <span className="gradient-text">Predictions</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            ML-powered market forecasting with explainable signals
          </p>
        </div>
      </motion.div>

      {/* ── Info Banner ────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.12, duration: 0.4 }}
      >
        <Card className="glass border-primary/20 p-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <BarChart2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                How it works
                <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-medium">
                  40+ Features
                </span>
              </h3>
              <p className="text-sm text-muted-foreground">
                Our AI analyzes RSI, EMA, MACD, price action, volume patterns, and market
                microstructure to predict the next 10 candles (~50 minutes).{' '}
                <span className="text-primary font-medium">
                  New symbols are auto-trained on first request (~15–30 s).
                </span>
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ── Search / Control Panel ─────────────────────────────────────────── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="glass border-border/50 p-6 space-y-5">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Symbol Input */}
            <motion.div variants={itemVariants}>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Stock Symbol
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                  onKeyPress={handleKeyPress}
                  placeholder="e.g., HDFCBANK"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted/40 border border-border/50 focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground outline-none transition-all duration-200 text-sm"
                />
              </div>
            </motion.div>

            {/* Model Toggle */}
            <motion.div variants={itemVariants}>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                AI Model
              </label>
              <div className="flex gap-2 h-[46px]">
                {([
                  { value: 'xgboost' as ModelType, label: 'XGBoost', sub: 'Fast · Auto-train', icon: Zap },
                  { value: 'lstm'    as ModelType, label: 'LSTM',    sub: 'Deep Learning',    icon: Cpu },
                ] as const).map(({ value, label, sub, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setModel(value)}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-all duration-200 px-3 ${
                      model === value
                        ? 'border-primary bg-primary/10 text-primary glow-primary'
                        : 'border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 px-0.5">
                {model === 'xgboost' ? 'Fast · Auto-trains any NSE symbol' : 'Deep learning · Must be pre-trained'}
              </p>
            </motion.div>

            {/* Predict Button */}
            <motion.div variants={itemVariants} className="flex flex-col justify-end">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={fetchPrediction}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold rounded-xl glow-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 text-sm"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    {isFirstTrain ? 'Training model…' : 'Analyzing…'}
                  </>
                ) : (
                  <>
                    <Activity className="h-4 w-4" />
                    Get Prediction
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </motion.button>
            </motion.div>
          </div>

          {/* Popular Symbols */}
          <motion.div variants={itemVariants} className="pt-4 border-t border-border/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-primary" />
              Popular Symbols
            </p>
            <div className="flex flex-wrap gap-2">
              {popularSymbols.map((sym) => (
                <motion.button
                  key={sym}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setSymbol(sym)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 ${
                    symbol === sym
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/40 bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  {sym}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Model Status Badges */}
          <AnimatePresence>
            {modelStatus !== null && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="flex gap-2 flex-wrap pt-4 border-t border-border/30"
              >
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  modelStatus.xgboost_trained
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-accent/10 text-accent border border-accent/20'
                }`}>
                  {modelStatus.xgboost_trained
                    ? <CheckCircle2 className="h-3 w-3" />
                    : <Zap className="h-3 w-3" />
                  }
                  XGBoost: {modelStatus.xgboost_trained ? 'Trained' : 'Will auto-train'}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  modelStatus.lstm_trained
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-muted text-muted-foreground border border-border/40'
                }`}>
                  {modelStatus.lstm_trained
                    ? <CheckCircle2 className="h-3 w-3" />
                    : <CircleOff className="h-3 w-3" />
                  }
                  LSTM: {modelStatus.lstm_trained ? 'Trained' : 'Not trained'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* ── First-Train Notice ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {loading && isFirstTrain && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="glass border-accent/30 bg-accent/5 p-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 text-accent animate-pulse" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    First-time training for{' '}
                    <span className="gradient-text">{symbol}</span>
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Fetching 200 days of market data and training the XGBoost model.
                    This takes ~15–30 seconds. Future predictions for this symbol will be instant.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="glass border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Prediction Failed</h3>
                  <p className="text-sm text-muted-foreground">{error}</p>
                  {error.includes('Model not trained') && (
                    <p className="text-xs text-muted-foreground mt-2">
                      💡 Train the model first:{' '}
                      <code className="px-2 py-0.5 rounded bg-muted text-primary text-xs">
                        python -m app.services.ml.train_pipeline
                      </code>
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Loading Skeleton ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {[1, 2].map((i) => (
              <Card
                key={i}
                className={`glass border-border/50 p-6 space-y-3 ${i === 2 ? 'lg:col-span-2' : ''}`}
              >
                <div className="h-4 w-1/3 bg-muted/60 rounded-lg animate-pulse" />
                <div className="h-8 w-2/3 bg-muted/60 rounded-lg animate-pulse" />
                <div className="h-4 w-full bg-muted/40 rounded-lg animate-pulse" />
                <div className="h-4 w-4/5 bg-muted/40 rounded-lg animate-pulse" />
              </Card>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Prediction Results ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {prediction && !loading && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Prediction Card */}
            <motion.div variants={fadeInUp} className="lg:col-span-1">
              <PredictionCard prediction={prediction} />
            </motion.div>

            {/* Signals Panel */}
            <motion.div variants={fadeInUp} className="lg:col-span-2">
              <Card className="glass border-border/50 p-6">
                <SignalsList signals={prediction.signals} />

                {/* Disclaimer */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mt-6 pt-5 border-t border-border/30"
                >
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground italic leading-relaxed">
                      Disclaimer: AI predictions are for informational purposes only. Not
                      financial advice. Past performance doesn't guarantee future results.
                      Always do your own research before trading.
                    </p>
                  </div>
                </motion.div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty State ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {!prediction && !loading && !error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              className="h-24 w-24 rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/10 border border-primary/20 glow-accent flex items-center justify-center mb-6"
            >
              <Brain className="h-12 w-12 text-primary" />
            </motion.div>

            <h3 className="text-2xl font-bold mb-2">
              Ready to <span className="gradient-text">Predict</span>
            </h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-8">
              Enter any NSE symbol above and click{' '}
              <span className="text-primary font-medium">"Get Prediction"</span> to
              see AI-powered market analysis with explainable signals.
            </p>

            <div className="flex items-center gap-6">
              {[
                { icon: Zap,      label: 'XGBoost',    desc: 'Fast & accurate' },
                { icon: Cpu,      label: 'LSTM',        desc: 'Deep learning'   },
                { icon: BarChart2, label: '40+ Signals', desc: 'Explainable AI' },
              ].map(({ icon: Icon, label, desc }) => (
                <motion.div
                  key={label}
                  whileHover={{ scale: 1.08 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="h-12 w-12 rounded-2xl bg-muted/40 border border-border/50 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">{label}</span>
                  <span className="text-[11px] text-muted-foreground">{desc}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Predictions;