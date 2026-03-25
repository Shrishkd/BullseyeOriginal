from dotenv import load_dotenv
load_dotenv()

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api.v1 import auth, market, chat, health, ws_market, news
from app.services.instrument_registry import load_instruments
from app.db.session import engine
from app.models import Base


# -----------------------------
# Lifespan (replaces deprecated @app.on_event)
# -----------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    load_instruments()
    print("✅ Startup completed: DB ready, NSE instruments loaded")

    yield  # app runs here

    # ── Shutdown (add cleanup here if needed) ─
    print("🛑 Shutdown: cleaning up")


# -----------------------------
# Create FastAPI app
# -----------------------------
app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan,
)


# -----------------------------
# CORS
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------
# Global exception handler
# (prevents ugly 500s, returns clean JSON errors in dev)
# -----------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"❌ Unhandled error on {request.method} {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error": str(exc),           # remove `error` field before production
            "path": str(request.url),
        },
    )


# -----------------------------
# Routers
# -----------------------------
app.include_router(health.router,     prefix="/api")
app.include_router(auth.router,       prefix="/api")
app.include_router(market.router,     prefix="/api")
app.include_router(chat.router,       prefix="/api")
app.include_router(news.router,       prefix="/api")
app.include_router(ws_market.router)   # no /api prefix — WS has its own path


# -----------------------------
# Root
# -----------------------------
@app.get("/")
async def root():
    return {"message": "Bullseye backend is running", "version": "1.0.0"}