// ─── Add these exports to Frontend/src/lib/api.ts ───────────────────────────
// (paste after the existing exports, before the default export)

/* ===============================
   Portfolio APIs
   =============================== */

export interface HoldingCreate {
  symbol: string;
  quantity: number;
  buy_price: number;
  buy_date: string;  // ISO string
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
  return request("/portfolio/holdings", {
    method: "POST",
    body: JSON.stringify(data),
  });
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

  const res = await fetch(
    `${import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000/api"}/portfolio/import`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }
  );

  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = text; }

  if (!res.ok) {
    const err: any = new Error(data?.detail || "Import failed");
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function getPortfolioInsights(): Promise<{ insights: string }> {
  return request("/portfolio/ai-insights");
}