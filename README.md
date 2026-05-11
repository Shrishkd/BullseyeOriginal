# 🎯 Bullseye — AI-Powered Investment & Trading Assistant

> A full-stack AI-driven fintech platform that combines live market data, technical analysis, machine learning predictions, and conversational AI into one intelligent investment assistant.

---

# 🚀 Overview

Bullseye is a modern AI-powered investment and trading assistant built to simplify the retail investing workflow.

Most traders use multiple disconnected tools for:
- Live charts
- Market analysis
- Technical indicators
- News sentiment
- AI explanations
- Portfolio tracking

Bullseye solves this fragmentation by integrating everything into a single intelligent platform.

The project demonstrates:
- Full-stack engineering
- Real-time systems
- AI integration
- Machine learning pipelines
- WebSocket streaming
- Async backend architecture
- Production-style debugging and deployment

---

# ✨ Key Features

## 📈 Live Market Dashboard
- Real-time Indian stock market data
- Candlestick charts
- Dynamic NSE stock support
- Interactive chart visualizations

## 🤖 AI Trading Assistant
- Conversational AI powered by Google Gemini
- Indicator explanations
- Market insights
- Context-aware trading assistance

## 🧠 Machine Learning Predictions
- Stock movement prediction
- BUY / SELL / HOLD style insights
- Confidence scoring
- Feature-engineered prediction pipeline

## 📊 Technical Indicators
- RSI
- SMA
- EMA
- MACD
- VWAP
- Volatility analysis
- Volume spike detection

## ⚡ Real-Time Updates
- WebSocket-based live price streaming
- Low-latency market updates
- Live chart refresh

## 🔐 Authentication System
- JWT authentication
- Protected routes
- Secure user sessions
- Password hashing with bcrypt

## 🇮🇳 India-Focused Market Experience
- NSE-compatible architecture
- Indian stock symbols support
- INR-focused product design
- Upstox integration

---

# 🏗️ System Architecture

```text
Frontend (React + TypeScript)
        ↓
REST APIs + WebSockets
        ↓
FastAPI Backend
        ↓
Prediction Engine + AI Services
        ↓
Market Providers (Upstox / Finnhub)
        ↓
Database + Model Storage
```

---

# 🛠️ Tech Stack

# Frontend
- React.js
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Zustand
- TanStack React Query
- TradingView Lightweight Charts
- Recharts

# Backend
- FastAPI
- Python
- Async SQLAlchemy
- SQLite
- Uvicorn
- Pydantic v2

# Authentication & Security
- JWT Authentication
- bcrypt

# AI & Machine Learning
- Google Gemini API
- XGBoost
- TensorFlow / Keras LSTM
- Sentence Transformers
- VADER Sentiment Analysis

# Real-Time Communication
- WebSockets

# APIs & Market Data
- Upstox API
- Finnhub API

# Deployment & DevOps
- Docker
- Render
- GitHub
- Vercel / Netlify

---

# 🧠 Machine Learning Pipeline

Bullseye uses multiple ML models for different tasks instead of relying on a single model.

## 🔹 XGBoost
Used for:
- Structured market prediction
- Direction classification
- Fast inference

Predicts:
- UP
- DOWN
- SIDEWAYS

## 🔹 LSTM (TensorFlow/Keras)
Used for:
- Time-series learning
- Sequential candle pattern analysis
- Historical trend learning

## 🔹 Google Gemini
Used for:
- Conversational AI
- Indicator explanation
- Market reasoning
- Natural language responses

## 🔹 VADER
Used for:
- News sentiment scoring
- Market tone analysis

## 🔹 Sentence Transformers
Used for:
- Semantic embeddings
- Future RAG-ready architecture
- AI memory/search concepts

---

# 📊 Feature Engineering

The prediction engine uses:
- RSI
- EMA
- SMA
- MACD
- VWAP
- Candle patterns
- Volume spikes
- Volatility metrics
- Historical price movements

These features improve:
- Prediction quality
- Explainability
- Market context understanding

---


# 📌 Why This Project Stands Out

Bullseye demonstrates:
- Full-stack development skills
- Production-style debugging
- Real-time architecture understanding
- AI integration
- Machine learning engineering
- Async backend systems
- Financial product thinking
- API integration expertise

This project reflects the type of engineering required in:
- FinTech companies
- AI startups
- Trading platforms
- Backend-heavy systems
- Real-time applications

---

# 📂 Project Structure

```text
bullseye/
│
├── frontend/
│   ├── components/
│   ├── pages/
│   ├── charts/
│   ├── store/
│   └── services/
│
├── backend/
│   ├── api/
│   ├── services/
│   ├── ml/
│   ├── websocket/
│   ├── models/
│   ├── database/
│   └── providers/
│
├── training/
├── datasets/
├── saved_models/
├── docker/
└── docs/
```

---

# 📸 Project Screenshots

## 🏠 Dashboard

![Dashboard Screenshot](./Assets/1.%20dashboard.png)

---

## 📈 Live Market Data

![Market Screenshot](./Assets/2.%20Market.png)

---

## 🤖 Prediction Engine - Sideways

![Prediction Sideways](./Assets/3.%20a%20Prediction%20SW.png)

---

## 📉 Prediction Engine - Loss

![Prediction Loss](./Assets/4.%20b%20Prediction%20Lss.png)

---

## 📈 Prediction Engine - Up

![Prediction Up](./Assets/5.%20c%20Prediction%20up.png)

---

## 💼 Portfolio Management

![Portfolio Screenshot](./Assets/6.%20Portfolio.png)

---

## ⚠️ Risk Analysis

![Risk Screenshot](./Assets/7.%20Risk.png)

---

## 📰 Market News

![News Screenshot](./Assets/8.%20News.png)

---

## 🔔 Alert System

![Alert Screenshot](./Assets/9.%20alert.png)

---

## 💬 AI Chat Assistant

![Chat Screenshot](./Assets/10.%20Chat.png)

---

# 🚀 Future Roadmap

## Planned Features
- Portfolio management
- CSV/Excel portfolio import
- Risk analysis engine
- Backtesting dashboard
- Multi-broker integration
- PostgreSQL migration
- Redis caching
- Background async training jobs
- Explainable AI dashboards
- Live trading execution
- News-based market sentiment
- Dockerized production deployment

---

# ⚙️ Installation

## Clone Repository

```bash
git clone https://github.com/your-username/bullseye.git
cd bullseye
```

---

# Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

# Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

---

# 🔑 Environment Variables

Create `.env` files.

## Backend `.env`

```env
GEMINI_API_KEY=your_key
UPSTOX_API_KEY=your_key
JWT_SECRET=your_secret
DATABASE_URL=sqlite+aiosqlite:///./bullseye.db
```

---

# 📡 API Features

## REST APIs
- Authentication APIs
- Market data APIs
- Prediction APIs
- AI chat APIs
- Indicator APIs

## WebSockets
- Live price streaming
- Real-time market updates

---

# 📚 Learning Outcomes

Through Bullseye, I gained hands-on experience in:
- Async backend architecture
- Real-time systems
- WebSockets
- FinTech engineering
- Machine learning deployment
- Model lifecycle management
- AI integration
- Production debugging
- API design
- Frontend-backend communication

---

# 👨‍💻 Author

## Shrish
B.Tech CSE (AI/ML) Student  
Full Stack Developer | ML Enthusiast | FinTech Builder

---

# ⭐ Recruiter Highlights

✔ End-to-end full-stack product  
✔ Real-time WebSocket architecture  
✔ AI + ML integration  
✔ Production-style backend design  
✔ Financial domain understanding  
✔ Advanced debugging experience  
✔ Scalable system thinking  
✔ India-focused fintech engineering

---

## 🙌 Author

**Shrish**  
B.Tech CSE (AI/ML)  
Passionate about **AI, Trading, and Full-Stack Systems**

---

# 🌟 Final Note

Bullseye evolved from a simple trading assistant idea into a scalable AI-powered fintech platform capable of:
- Live market analysis
- Real-time streaming
- Technical indicator interpretation
- Machine learning prediction
- Conversational AI assistance

The project showcases not only feature development but also strong engineering problem-solving, architecture design, and production-level debugging skills.

---
