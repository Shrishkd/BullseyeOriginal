# 🚀 Bullseye — AI-Powered Indian Stock Market Platform

Bullseye is a **full-stack AI-powered stock market platform** focused on the **Indian equity market (NSE)**.  
It provides **real-time candlestick charts**, **live prices in INR**, **market-aware behavior**, and a **scalable backend architecture** designed for production use.

This project is built with **FastAPI + React**, integrates **Upstox market data**, and dynamically supports **ALL NSE stocks** without hard-coding symbols.

---

## ✨ Key Features

### 📈 Market Data
- Real-time **candlestick charts**
- Supports **ALL NSE stocks** (large-cap, mid-cap, small-cap)
- Multiple timeframes: `1m`, `5m`, `15m`, `60m`, `1D`
- Automatic fallback to **Daily candles when market is closed**

### 💰 Live Price (₹ INR)
- Displays **live Last Traded Price (LTP)** next to stock symbol
- Currency-aware (INR)
- Graceful fallback when price is unavailable

### ⏰ Market Awareness
- Detects **NSE market open / closed** state (IST timezone)
- Prevents blank charts outside trading hours
- Clear UI indicator: **Market Open / Market Closed**

### 🔌 Real-Time Updates
- WebSocket-based live price streaming
- Stable async architecture
- No polling overload

### 🔍 NSE-Wide Symbol Support
- Automatically loads **NSE instrument master**
- No hard-coded symbols
- Supports thousands of stocks dynamically

### 🔐 Authentication (Extensible)
- JWT-based auth for REST APIs
- WebSocket kept public for stability (can be secured later)

### ☁️ Deployment-Ready
- Render-compatible backend
- Works with HTTPS & `wss://`
- No platform-specific hacks

### Why This Project Stands Out
- Designed like a real trading platform, not a demo
- Scalable backend architecture
- Clean separation of concerns
- Market-aware UX to prevent misleading data

---

## 🛡️ Design Principles

- No hard-coded market symbols  
- Market-aware UI (prevents misleading or blank charts)  
- Async-first backend architecture  
- Production-safe defaults  
- Extensible system design (easy to add brokers, indicators, or services)

---


## 🧱 Tech Stack

### Backend
- **FastAPI** (Python)
- **Uvicorn**
- **Upstox API**
- **Async SQLAlchemy**
- **WebSockets**
- **Pydantic v2**
- **SQLite** (easily swappable with Postgres)

### Frontend
- **React**
- **TypeScript**
- **Lightweight-charts (TradingView)**
- **Tailwind CSS**
- **WebSocket client**

### Infrastructure
- **Render** (Backend deployment)
- **Render** (Frontend deployment)
- **GitHub** (CI/CD)

---
## 📸 Screenshots


---

## ⚙️ How It Works

1. **Startup**
   - Backend downloads NSE instrument master (CSV)
   - Caches it locally and in memory
   - Enables dynamic symbol → instrument resolution

2. **Market Data Flow**
   - User selects a stock symbol
   - Backend resolves symbol to `instrument_key`
   - Candles and prices fetched via Upstox
   - WebSocket streams live prices

3. **Market-Aware UX**
   - Backend detects market open/closed (IST)
   - Frontend adapts chart behavior automatically


---


## 🙌 Author

**Shrish**  
B.Tech CSE (AI/ML)  
Passionate about **AI, Trading, and Full-Stack Systems**

---

## ⭐ Final Note

Bullseye is designed as a **real-world trading platform**, not just a demo project.  
It follows scalable backend principles, market-aware UX design, and clean architecture to support future growth and advanced features.

