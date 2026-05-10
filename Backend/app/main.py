from dotenv import load_dotenv
load_dotenv()

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.api.v1 import auth, market, chat, health, ws_market, news, prediction, portfolio, risk, alerts
from app.services.instrument_registry import load_instruments
from app.db.session import engine
from app.models import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    load_instruments()
    print("✅ Startup completed: DB ready, NSE instruments loaded")

    yield

    print("🛑 Shutdown: cleaning up")


ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:5173",
]


class CatchAllErrorMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except Exception as exc:
            print(f"❌ Unhandled error on {request.method} {request.url}: {exc}")
            origin = request.headers.get("origin", "")
            resp = JSONResponse(
                status_code=500,
                content={
                    "detail": "Internal server error",
                    "error": str(exc),
                    "path": str(request.url),
                },
            )
            if origin in ALLOWED_ORIGINS:
                resp.headers["access-control-allow-origin"] = origin
                resp.headers["access-control-allow-credentials"] = "true"
            return resp


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(CatchAllErrorMiddleware)

# Routers
app.include_router(health.router,      prefix="/api")
app.include_router(auth.router,        prefix="/api")
app.include_router(market.router,      prefix="/api")
app.include_router(chat.router,        prefix="/api")
app.include_router(news.router,        prefix="/api")
app.include_router(prediction.router,  prefix="/api")
app.include_router(portfolio.router,   prefix="/api")   # ← NEW
app.include_router(risk.router,        prefix="/api")   # ← NEW
app.include_router(alerts.router,      prefix="/api")   # ← NEW
app.include_router(ws_market.router)


@app.get("/")
async def root():
    return {"message": "Bullseye backend is running", "version": "1.0.0"}