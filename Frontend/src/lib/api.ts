// Frontend/src/lib/api.ts
// Complete API client — Auth, Market, Chat, News, Portfolio, Risk, Alerts

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000/api";

/* ───────────────────────────────────────────────
   Token helpers
   ─────────────────────────────────────────────── */
export function getToken(): string | null {
  return localStorage.getItem("bullseye_token");
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("bullseye_token", token);
  else localStorage.removeItem("bullseye_token");
}

/* ───────────────────────────────────────────────
   Core fetch
   ─────────────────────────────────────────────── */
async function request<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.headers && typeof opts.headers === "object" && !Array.isArray(opts.headers)) {
    Object.entries(opts.headers as Record<string, string>).forEach(([k, v]) => { headers[k] = v; });
  }
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (res.status === 401) console.warn("Unauthorized:", path);

  const text = await res.text();
  let data: any;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const err: any = new Error(data?.detail || data?.message || (typeof data === "string" ? data : "API error"));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data as T;
}

/* ═══════════════════════════════════════════════
   AUTH
   ═══════════════════════════════════════════════ */
export async function signupApi(email: string, password: string, full_name?: string) {
  return request("/auth/signup", { method: "POST", body: JSON.stringify({ email, password, full_name }) });
}

export async function loginApi(email: string, password: string) {
  const data = await request<{ access_token?: string; token?: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const token = data?.access_token || data?.token;
  if (token) setToken(token);
  return data;
}

export function logoutApi() { setToken(null); }

/* ═══════════════════════════════════════════════
   MARKET
   ═══════════════════════════════════════════════ */
export async function getAsset(symbol: string) {
  return request(`/market/assets/${encodeURIComponent(symbol)}`);
}

export async function getPrices(symbol: string, limit = 200) {
  return request(`/market/prices/${encodeURIComponent(symbol)}?limit=${limit}`);
}

export async function getCandles(symbol: string, resolution: string) {
  return request(`/market/candles/${encodeURIComponent(symbol)}?resolution=${resolution}`);
}

export type QuoteResponse = {
  symbol: string;
  price: number | null;
  currency: string;
  market_open: boolean;
};

export async function getQuote(symbol: string): Promise<QuoteResponse> {
  return request(`/market/quote/${encodeURIComponent(symbol)}`);
}

export async function explainIndicators(payload: {
  symbol: string; price: number; rsi?: number; sma?: number; ema?: number;
}) {
  return request("/chat/explain-indicators", { method: "POST", body: JSON.stringify(payload) });
}

export async function ingestPrice(payload: any) {
  return request("/market/prices/ingest", { method: "POST", body: JSON.stringify(payload) });
}

/* ═══════════════════════════════════════════════
   CHAT
   ═══════════════════════════════════════════════ */
export async function chatQuery(question: string, top_k = 5) {
  return request("/chat/query", { method: "POST", body: JSON.stringify({ question, top_k }) });
}

/* ═══════════════════════════════════════════════
   NEWS
   ═══════════════════════════════════════════════ */
export async function getBreakingNews() {
  return request("/news/breaking");
}

/* ═══════════════════════════════════════════════
   PORTFOLIO
   ═══════════════════════════════════════════════ */
export interface HoldingCreate {
  symbol: string;
  quantity: number;
  buy_price: number;
  buy_date: string;     // ISO string
  asset_type?: string;
}

export interface HoldingWithStats {
  id: number;
  symbol: string;
  quantity: number;
  buy_price: number;
  buy_date: string;
  asset_type: string;
  created_at: string;
  current_price: number | null;
  current_value: number | null;
  invested_value: number;
  pnl: number | null;
  pnl_pct: number | null;
  allocation_pct: number | null;
}

export interface PortfolioSummary {
  total_invested: number;
  total_current_value: number | null;
  total_pnl: number | null;
  total_pnl_pct: number | null;
  holdings_count: number;
  last_updated: string;
}

export interface CSVImportResult {
  imported: number;
  failed: number;
  errors: Array<{ row: number; symbol?: string; error: string }>;
}

export async function getHoldings(): Promise<HoldingWithStats[]> {
  return request("/portfolio/holdings");
}

export async function addHolding(data: HoldingCreate): Promise<HoldingWithStats> {
  return request("/portfolio/holdings", { method: "POST", body: JSON.stringify(data) });
}

export async function deleteHolding(id: number): Promise<void> {
  return request(`/portfolio/holdings/${id}`, { method: "DELETE" });
}

export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  return request("/portfolio/summary");
}

export async function importPortfolioCSV(file: File): Promise<CSVImportResult> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/portfolio/import`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) { const e: any = new Error(data?.detail || "Import failed"); e.status = res.status; throw e; }
  return data;
}

export async function getPortfolioInsights(): Promise<{ insights: string }> {
  return request("/portfolio/ai-insights");
}

/* ═══════════════════════════════════════════════
   RISK
   ═══════════════════════════════════════════════ */
export interface RiskAnalysis {
  overall_risk_level: string;
  portfolio_volatility: number;
  portfolio_beta: number;
  portfolio_sharpe: number;
  portfolio_var_95: number;
  hhi_concentration: number;
  diversification_score: number;
  holdings_count: number;
  sectors_count: number;
  sector_weights: Record<string, number>;
  risk_flags: string[];
  holdings: RiskHolding[];
  ai_summary: string;
  last_updated: string;
}

export interface RiskHolding {
  symbol: string;
  asset_type: string;
  sector: string;
  weight_pct: number;
  volatility: number;
  risk_level: string;
  max_drawdown: number;
  sharpe_ratio: number;
  var_95: number;
  beta: number;
  rsi: number | null;
  pnl_pct: number;
  data_points: number;
}

export interface ScenarioResult {
  market_drop_pct: number;
  current_value: number;
  stressed_value: number;
  portfolio_impact: number;
  impact_pct: number;
  holdings: ScenarioHolding[];
}

export interface ScenarioHolding {
  symbol: string;
  beta: number;
  current_price: number;
  stressed_price: number;
  expected_drop: number;
  pnl_impact: number;
}

export async function getRiskAnalysis(): Promise<RiskAnalysis> {
  return request("/risk/analysis");
}

export async function getSymbolVolatility(symbol: string) {
  return request(`/risk/volatility/${encodeURIComponent(symbol)}`);
}

export async function runScenario(market_drop_pct: number): Promise<ScenarioResult> {
  return request("/risk/scenario", { method: "POST", body: JSON.stringify({ market_drop_pct }) });
}

/* ═══════════════════════════════════════════════
   ALERTS
   ═══════════════════════════════════════════════ */
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

export interface AlertCreate {
  symbol: string;
  alert_type: string;
  threshold: number;
  note?: string;
}

export interface CheckResult {
  checked: number;
  triggered: number;
  results: Array<{
    alert_id: number; symbol: string; type: string;
    message: string; value: number; triggered_at: string;
  }>;
  checked_at: string;
}

export async function getAlerts(): Promise<Alert[]> {
  return request("/alerts/");
}

export async function createAlert(data: AlertCreate): Promise<Alert> {
  return request("/alerts/", { method: "POST", body: JSON.stringify(data) });
}

export async function updateAlert(id: number, data: { is_active?: boolean; threshold?: number; note?: string }): Promise<Alert> {
  return request(`/alerts/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteAlert(id: number): Promise<void> {
  return request(`/alerts/${id}`, { method: "DELETE" });
}

export async function checkAlerts(): Promise<CheckResult> {
  return request("/alerts/check");
}

export async function getTriggeredAlerts(limit = 50): Promise<TriggeredAlert[]> {
  return request(`/alerts/triggered?limit=${limit}`);
}

/* ═══════════════════════════════════════════════
   AI DEBATE (Server-Sent Events)
   ═══════════════════════════════════════════════ */
export interface DebateEvidence {
  id: string;
  category: "model" | "technical" | "risk" | "sentiment" | "position";
  label: string;
  value: string;
  note: string;
}

export interface DebateClaim {
  claim: string;
  evidence_ids: string[];
  invalid_ids: string[];
  unverified_numbers: string[];
  verified: boolean;
  target?: string;   // rebuttals only
}

export interface DebateComponent {
  name: "model" | "technical" | "sentiment" | "risk";
  raw: number;
  weight: number;
  contribution: number;
  explanation: string;
}

export interface DebateModerator {
  summary: string;
  stronger_side: "bull" | "bear" | "even";
  stronger_side_reason: string;
  key_risks: (DebateClaim & { risk: string })[];
}

export type DebateEvent =
  | { type: "status"; stage: "evidence" | "openings" | "rebuttals" | "verdict"; message: string }
  | { type: "evidence"; symbol: string; current_price: number | null; items: DebateEvidence[]; unavailable: string[] }
  | { type: "argument"; side: "bull" | "bear"; round: "opening"; thesis: string; points: DebateClaim[] }
  | { type: "argument"; side: "bull" | "bear"; round: "rebuttal"; points: DebateClaim[]; concession: string }
  | {
      type: "verdict";
      verdict: "BUY" | "HOLD" | "SELL";
      confidence: number;
      composite: number;
      thresholds: { buy: number; sell: number };
      components: DebateComponent[];
      moderator: DebateModerator | null;
    }
  | { type: "error"; stage: string; side?: string; message: string }
  | { type: "done"; cached: boolean };

export async function streamDebate(
  symbol: string,
  onEvent: (e: DebateEvent) => void,
  opts: { refresh?: boolean; signal?: AbortSignal } = {},
): Promise<void> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(
    `${API_BASE}/debate/${encodeURIComponent(symbol)}?refresh=${opts.refresh ? "true" : "false"}`,
    { headers, signal: opts.signal },
  );
  if (!res.ok || !res.body) {
    let detail = "Failed to start debate";
    try { detail = (await res.json())?.detail || detail; } catch { /* non-JSON error */ }
    throw new Error(detail);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const line = frame.split("\n").find((l) => l.startsWith("data: "));
      if (line) onEvent(JSON.parse(line.slice(6)) as DebateEvent);
    }
  }
}

/* ═══════════════════════════════════════════════
   Default export (backwards compat)
   ═══════════════════════════════════════════════ */
export default {
  signupApi, loginApi, logoutApi,
  getAsset, getPrices, getCandles, getQuote, explainIndicators, ingestPrice,
  chatQuery,
  getBreakingNews,
  getHoldings, addHolding, deleteHolding, getPortfolioSummary, importPortfolioCSV, getPortfolioInsights,
  getRiskAnalysis, getSymbolVolatility, runScenario,
  getAlerts, createAlert, updateAlert, deleteAlert, checkAlerts, getTriggeredAlerts,
  streamDebate,
};