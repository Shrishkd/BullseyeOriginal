# 🎯 Bullseye — AI-Powered Investment & Trading Platform

Bullseye is a full-stack, India-first fintech platform for **NSE equities**. It brings live market data, candlestick charts, machine-learning price predictions, portfolio tracking, risk analysis, smart alerts, news sentiment, an AI chat assistant and a **multi-agent AI Debate** into one interface, and explains what the numbers mean instead of only showing them.

Built with **FastAPI + React/TypeScript**, market data from **Upstox**, ML models in **XGBoost + LSTM**, and **Google Gemini** for AI reasoning.

---

## 🔑 Demo Account

| Email | Password |
|---|---|
| `shrish@test.com` | `demo1234` |

The backend creates this account automatically on startup if it doesn't exist. On the login page, click **Sign in with demo account** to log in with one click.

> The demo account starts with an empty portfolio, so the Portfolio, Risk and Dashboard pages have no holdings until you add some.

---

## ✨ Features

| Module | What it does |
|---|---|
| **Dashboard** | Portfolio value, P/L, alerts, risk level, market pulse for key stocks, holdings P/L chart and asset allocation, all from one aggregated API call |
| **Market Data** | Candlestick charts for **all NSE stocks** (1m, 5m, 15m, 60m, 1D), live LTP over WebSocket with REST fallback, server-side RSI / SMA / EMA / MACD, one-click AI indicator explanations |
| **AI Predictions** | UP / SIDEWAYS / DOWN forecasts with confidence, expected move and explainable signals; XGBoost auto-trains on the first request for a new symbol |
| **🆕 AI Debate** | Bull and Bear agents argue over a stock using the platform's own data, rebut each other, and a Moderator explains a verdict that is **computed in code, not by the LLM** (details below) |
| **Portfolio** | Holdings with live P/L, sector allocation, CSV / Excel import, AI portfolio insights |
| **Risk Analysis** | Volatility, Beta, Sharpe, VaR 95%, max drawdown, HHI concentration, RSI flags, stress test for market drops, AI risk narrative |
| **Smart Alerts** | Price above / below, RSI overbought / oversold and volume-spike alerts, with trigger history |
| **News & Sentiment** | Indian market news from NewsData.io scored with VADER, plus an overall market-sentiment banner |
| **AI Chat** | Gemini-powered assistant for Indian markets, with a RAG-ready embeddings layer |

---

## ⚔️ AI Debate — Bull vs Bear Agents

Most prediction tools stop at "UP, 71% confidence". The AI Debate shows **why**, where the signals disagree, and how the verdict was reached.

```
Evidence Pack ──► Openings ──────────────► Rebuttals ─────────────► Verdict
(no LLM)          Bull ║ Bear (parallel)   Bull ║ Bear (parallel)   formula in code
 E1, E2, …        each claim cites IDs     answer 2 claims each     + Moderator explains
                                           + concede 1 point
```

1. **Evidence pack**: the model's probability split P(up) / P(sideways) / P(down), technicals (RSI, EMA, MACD), risk metrics (volatility, drawdown, Sharpe, VaR, beta vs Nifty 50), company-specific news sentiment and, if you hold the stock, your position. Every fact gets an ID (`E1`, `E2`, …).
2. **Openings**: Bull and Bear each make 3–4 claims, and every claim must cite evidence IDs.
3. **Rebuttals**: each side answers the other's two strongest claims and concedes one point.
4. **Verdict**: BUY / HOLD / SELL plus a confidence score from a fixed formula:

   ```
   composite = 0.45·model + 0.25·technical + 0.15·sentiment − 0.15·risk
   BUY if composite > +0.15 · SELL if composite < −0.15 · otherwise HOLD
   ```

   The Moderator explains the verdict, judges which side argued better, and names 2–3 risks. It cannot change the verdict.

**Grounding safeguards:**
- Agents see only the evidence pack; web search is off for debate calls.
- Outputs are structured JSON validated with Pydantic.
- A server-side checker marks any claim that cites an unknown ID, or quotes a number not found in the evidence, as **unverified** in the UI.
- If an LLM call fails, the computed verdict is still returned.

Rounds stream to the browser over **Server-Sent Events**, and finished debates are cached per user, symbol and trading day.

---

## 📸 Screenshots

### Dashboard

![Dashboard](./Assets/1.%20dashboard.png)

### Live Market Data

![Live Market Data](./Assets/2.%20Market.png)

### Prediction — Sideways

![Prediction — Sideways](./Assets/3.%20a%20Prediction%20SW.png)

### Prediction — Down

![Prediction — Down](./Assets/4.%20b%20Prediction%20Lss.png)

### Prediction — Up

![Prediction — Up](./Assets/5.%20c%20Prediction%20up.png)

### Portfolio Management

![Portfolio Management](./Assets/6.%20Portfolio.png)

### Risk Analysis

![Risk Analysis](./Assets/7.%20Risk.png)

### Market News & Sentiment

![Market News & Sentiment](./Assets/8.%20News.png)

### Smart Alerts

![Smart Alerts](./Assets/9.%20alert.png)

### AI Chat Assistant

![AI Chat Assistant](./Assets/10.%20Chat.png)

---

## 🧱 Architecture

```
┌──────────────── Frontend: React 18 + TypeScript + Vite ────────────────┐
│  Dashboard · Market · Predictions · AI Debate · Portfolio · Risk ·     │
│  Alerts · News · Chat · Settings        (Zustand + TanStack Query)     │
└───────────────┬───────────────────────────────┬────────────────────────┘
          REST + SSE (JWT)                 WebSocket (live LTP)
┌───────────────▼───────────────────────────────▼────────────────────────┐
│                     Backend: FastAPI (async Python)                    │
│  api/v1 routers ─► services ─► crud ─► SQLAlchemy (SQLite / Postgres)  │
│                                                                        │
│  Instrument registry (10k+ NSE symbols)   Market provider router       │
│  ML: features ─► XGBoost / LSTM ─► PredictionService (auto-train)      │
│  Risk metrics · VADER sentiment · Debate orchestrator (Bull/Bear/Mod)  │
└──────┬──────────────────┬─────────────────────┬────────────────────────┘
   Upstox API        NewsData.io           Google Gemini 2.5 Flash
 (quotes, candles)     (news)            (chat, insights, debate agents)
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion |
| State & data | Zustand (auth), TanStack React Query |
| Charts | TradingView Lightweight Charts, Recharts |
| Backend | FastAPI, Uvicorn, Python 3.11, Pydantic v2 |
| Database | Async SQLAlchemy + SQLite (swap to PostgreSQL through `DATABASE_URL`) |
| Auth | JWT (python-jose) + bcrypt |
| Market data | Upstox API (NSE instrument master, quotes, candles), Finnhub fallback |
| ML | XGBoost, TensorFlow / Keras LSTM, scikit-learn, `ta` |
| AI / NLP | Google Gemini 2.5 Flash (`google-genai`), VADER, Sentence Transformers |
| Streaming | WebSockets (live prices), Server-Sent Events (debate) |

---

## 🚀 Getting Started

### Prerequisites
- Python **3.11**
- Node.js **18+** (developed on Node 22)
- API keys:
  - [Upstox](https://upstox.com/developer/) for market data
  - [Google AI Studio](https://aistudio.google.com/) for Gemini
  - [NewsData.io](https://newsdata.io/) for news
  - Finnhub (optional)

### 1. Backend

```bash
cd Backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
```

Create `Backend/.env`:

```env
DATABASE_URL=sqlite+aiosqlite:///./bullseye.db
SECRET_KEY=change-me

# AI
GEMINI_API_KEY=your-gemini-key

# Market data
UPSTOX_API_KEY=your-upstox-key
UPSTOX_API_SECRET=your-upstox-secret
UPSTOX_REDIRECT_URI=your-redirect-uri
UPSTOX_ACCESS_TOKEN=your-upstox-access-token
FINNHUB_API_KEY=optional

# News
NEWS_API_KEY=your-newsdata-key

# Demo account (optional; set DEMO_EMAIL= to disable)
# DEMO_EMAIL=shrish@test.com
# DEMO_PASSWORD=demo1234
```

Run the API:

```bash
python -m uvicorn app.main:app --reload --port 8000
```

On startup the backend creates the database tables, downloads and caches the NSE instrument master, and creates the demo user. Interactive API docs are at **http://localhost:8000/docs**.

### 2. Frontend

```bash
cd Frontend
npm install
npm run dev
```

The app runs at **http://localhost:8080**. It calls `http://localhost:8000/api` by default; set `VITE_API_BASE_URL` in `Frontend/.env` to point it elsewhere.

---

## 📡 API Reference

All routes are prefixed with `/api` and require a JWT (`Authorization: Bearer <token>`), except auth, health and the WebSocket.

| Module | Endpoint | Method | Description |
|---|---|---|---|
| Auth | `/auth/signup` | POST | Register a user |
| Auth | `/auth/login` | POST | Log in and receive a JWT |
| Market | `/market/quote/{symbol}` | GET | Live LTP |
| Market | `/market/candles/{symbol}` | GET | OHLCV candles with indicators |
| Market | `/market/prices/{symbol}` | GET | Stored prices |
| Market | `/market/assets/{symbol}` | GET | Asset details |
| Market | `/market/prices/ingest` | POST | Ingest a price record |
| WebSocket | `/ws/market/{symbol}` | WS | Live price stream (no `/api` prefix) |
| Predictions | `/predict/{symbol}?model=xgboost` | GET | Direction, confidence, probabilities, signals |
| Predictions | `/predict/{symbol}/models` | GET | Which models are trained |
| **Debate** | `/debate/{symbol}?refresh=false` | GET (SSE) | Streams evidence, openings, rebuttals and verdict |
| Portfolio | `/portfolio/holdings` | GET / POST | List or add holdings |
| Portfolio | `/portfolio/holdings/{id}` | DELETE | Remove a holding |
| Portfolio | `/portfolio/summary` | GET | Aggregate P/L |
| Portfolio | `/portfolio/import` | POST | CSV / XLSX import |
| Portfolio | `/portfolio/ai-insights` | GET | Gemini portfolio analysis |
| Risk | `/risk/analysis` | GET | Full portfolio risk report |
| Risk | `/risk/volatility/{symbol}` | GET | Single-symbol risk metrics |
| Risk | `/risk/scenario` | POST | Market-drop stress test |
| Alerts | `/alerts/` | GET / POST | List or create alerts |
| Alerts | `/alerts/{id}` | PUT / DELETE | Update or delete an alert |
| Alerts | `/alerts/check` | GET | Evaluate active alerts now |
| Alerts | `/alerts/triggered` | GET | Trigger history |
| News | `/news/breaking` | GET | Market news with VADER sentiment |
| Chat | `/chat/query` | POST | AI chat |
| Chat | `/chat/explain-indicators` | POST | AI explanation of indicators |
| Dashboard | `/dashboard/summary` | GET | Aggregated dashboard data |
| Health | `/health/ping` | GET | Liveness check |

---

## 🧠 ML Pipeline

- **Data:** daily Upstox candles, 200 for training and 120 for inference.
- **Features (40+):** returns, volatility / ATR, trend structure, momentum (ROC), volume spikes, and RSI / EMA / MACD signals.
- **Targets:** 10-candle look-ahead return split into UP / SIDEWAYS / DOWN with quantile buckets (`pd.qcut`).
- **Split:** chronological 70 / 15 / 15, with no shuffling and no look-ahead.
- **Models:**
  - XGBoost (primary, multi-class softmax), which auto-trains per symbol on the first request.
  - 2-layer LSTM with sequence length 20.
- **Serving:** models and scalers are cached in memory. The API returns the label, confidence, the full probability split, expected move and human-readable signals.

---

## 📁 Project Structure

```
Bullseye/
├── Backend/
│   ├── app/
│   │   ├── api/v1/          # Routers: auth, market, predict, debate, portfolio, risk, alerts, news, chat, dashboard, ws
│   │   ├── services/
│   │   │   ├── debate/      # evidence.py, scoring.py, agents.py, orchestrator.py
│   │   │   ├── ml/          # feature engineering, targets, XGBoost/LSTM, training, PredictionService
│   │   │   ├── market_providers/   # Upstox, Finnhub, router
│   │   │   ├── risk_metrics.py     # Sharpe, beta, VaR, drawdown, HHI
│   │   │   ├── news_service.py     # NewsData.io + VADER
│   │   │   └── llm_client.py       # Gemini client
│   │   ├── crud/  models.py  schemas.py  core/config.py  main.py
│   ├── data/                # Cached NSE instrument master
│   └── requirements.txt
└── Frontend/
    └── src/
        ├── pages/           # Dashboard, Market, Predictions, Debate, Portfolio, Risk, Alerts, News, Chat, …
        ├── components/      # Charts, prediction cards, layout, shadcn/ui
        ├── lib/api.ts       # API client (REST + debate SSE stream)
        └── stores/          # Zustand auth / theme
```

---

## ⚠️ Known Limitations

- **Upstox:**
  - Free-tier credentials don't include intraday historical candles, so ML training and inference use daily candles.
  - Upstox access tokens expire, so `UPSTOX_ACCESS_TOKEN` needs refreshing periodically.
- **News:** the NewsData.io free tier returns at most 10 articles per request, so company-level sentiment can rest on only a few headlines. The debate's scoring down-weights thin coverage.
- **Risk page beta:** the Risk page measures beta against a RELIANCE fallback, because the `NIFTY` index isn't in the NSE_EQ instrument master. The AI Debate uses the NIFTYBEES ETF instead.
- **Security:** the market WebSocket is unauthenticated.
- **LSTM:** the LSTM model must be trained before it can serve predictions; XGBoost auto-trains.

---

## 🗺️ Roadmap

- Debate verdict track record: compare verdicts with realised returns and show a live hit-rate
- Pluggable LLM provider (for example, local Ollama for offline demos)
- Backtesting engine, watchlist, and portfolio rebalancing suggestions
- Walk-forward validation, Optuna tuning, and SHAP explanations for XGBoost
- PostgreSQL, Redis caching, and background training with Celery
- WebSocket authentication

---

## 📚 Learning Outcomes

Building Bullseye gave hands-on experience in:
- Async backend architecture and real-time systems (WebSockets, Server-Sent Events)
- Machine learning pipelines and model lifecycle management
- LLM integration: structured outputs, grounding and multi-agent design
- FinTech domain modelling: indicators, risk metrics, portfolio analytics
- API design and frontend–backend communication
- Production-style debugging across broker APIs, async sessions, CORS and auth

---

## ⭐ Recruiter Highlights

✔ End-to-end full-stack product  
✔ Real-time WebSocket and SSE streaming  
✔ ML pipeline with XGBoost + LSTM and auto-training  
✔ Multi-agent AI debate with evidence-grounded, machine-checked claims  
✔ Financial domain understanding (Sharpe, Beta, VaR, HHI, stress tests)  
✔ Production-style backend design and debugging  
✔ India-focused fintech engineering  

---

## ⚖️ Disclaimer

Bullseye is an educational project. Its predictions, debates and insights are **not financial advice**. Always do your own research before investing.

---

## 🙌 Author

**Shrish**, B.Tech CSE (AI & ML)
📧 shrishdas444@gmail.com
