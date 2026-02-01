// src/lib/api.ts

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000/api";

/* ===============================
   Token helpers
   =============================== */

function getToken(): string | null {
  return localStorage.getItem("bullseye_token");
}

function setToken(token: string | null) {
  if (token) {
    localStorage.setItem("bullseye_token", token);
  } else {
    localStorage.removeItem("bullseye_token");
  }
}

/* ===============================
   Core request helper
   =============================== */

async function request<T = any>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  // ✅ Build headers safely
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Merge headers ONLY if they are a plain object
  if (opts.headers && typeof opts.headers === "object" && !Array.isArray(opts.headers)) {
    Object.entries(opts.headers as Record<string, string>).forEach(
      ([key, value]) => {
        headers[key] = value;
      }
    );
  }

  // Attach token
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
  });

  // Auto-logout on unauthorized
  if (res.status === 401) {
    console.warn("Unauthorized request:", path);
  }


  // Parse response safely
  const text = await res.text();
  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const err: any = new Error(
      data?.detail ||
        data?.message ||
        (typeof data === "string" ? data : "API error")
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data as T;
}

/* ===============================
   Auth APIs
   =============================== */

export async function signupApi(
  email: string,
  password: string,
  full_name?: string
) {
  return request("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, full_name }),
  });
}

export async function loginApi(email: string, password: string) {
  const data = await request<{ access_token?: string; token?: string }>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }
  );

  const token = data?.access_token || data?.token;
  if (token) {
    setToken(token);
  }

  return data;
}

export function logoutApi() {
  setToken(null);
}

/* ===============================
   Market APIs
   =============================== */

export async function getAsset(symbol: string) {
  return request(`/market/assets/${encodeURIComponent(symbol)}`);
}

export async function getPrices(symbol: string, limit = 200) {
  return request(
    `/market/prices/${encodeURIComponent(symbol)}?limit=${limit}`
  );
}

export async function getCandles(
  symbol: string,
  resolution: string
) {
  return request(
    `/market/candles/${encodeURIComponent(symbol)}?resolution=${resolution}`
  );
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
  symbol: string;
  price: number;
  rsi?: number;
  sma?: number;
  ema?: number;
}) {
  return request("/chat/explain-indicators", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}


/* ===============================
   Chat API
   =============================== */

export async function chatQuery(question: string, top_k = 5) {
  return request("/chat/query", {
    method: "POST",
    body: JSON.stringify({ question, top_k }),
  });
}

/* ===============================
   News APIs
   =============================== */
  export async function getBreakingNews() {
  return request("/news/breaking");
}


/* ===============================
   Optional helpers
   =============================== */

export async function ingestPrice(payload: any) {
  return request("/market/prices/ingest", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* ===============================
   Exports
   =============================== */

export { getToken, setToken };

export default {
  signupApi,
  loginApi,
  logoutApi,
  getAsset,
  getPrices,
  getCandles,
  getQuote,
  chatQuery,
  ingestPrice,
};
