# app/api/v1/chat.py

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas import ChatRequest, ChatResponse
from app.services.llm_client import LLMClient
from app.services.embeddings import EmbeddingsStore
from app.api.deps import get_db, get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])

llm_client = LLMClient()
emb_store = EmbeddingsStore()


@router.post("/query", response_model=ChatResponse)
async def chat_query(
    payload: ChatRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Main AI chat endpoint for BullSeye.
    Uses:
    - Embeddings (RAG-ready)
    - Gemini LLM
    - JWT-protected access
    """

    question = payload.question

    # 1️⃣ Embed user question
    q_emb = emb_store.embed_text(question)

    # 2️⃣ Retrieve relevant documents (vector search)
    docs = emb_store.similarity_search(q_emb, top_k=payload.top_k)

    # 3️⃣ Build context from retrieved docs
    context_text = "\n\n".join(
        [d.get("text", "") for d in docs if d.get("text")]
    )

    system_prompt = (
        "You are Bullseye, an AI-powered investment and trading assistant. "
        "You help users understand markets, stocks, crypto, and portfolio risk. "
        "Use provided context when available. "
        "Fetch current stock price from internet"
        "If context is empty, provide general educational guidance. "
        "Do NOT give guaranteed financial advice or promises."
    )

    user_message = f"""
Context:
{context_text or "No additional context provided."}

User question:
{question}
"""

    # 4️⃣ Generate AI response via Gemini
    answer = llm_client.chat(
        system_prompt=system_prompt,
        user_message=user_message,
    )

    # 5️⃣ Return response
    return ChatResponse(
        answer=answer,
        sources=[d.get("id", "") for d in docs],
    )
    
@router.post("/explain-indicators")
async def explain_indicators(
    payload: dict,
    user=Depends(get_current_user),
):
    """
    Explain technical indicators like RSI, SMA, EMA using AI.
    """
    symbol = payload.get("symbol")
    rsi = payload.get("rsi")
    sma = payload.get("sma")
    ema = payload.get("ema")
    price = payload.get("price")

    system_prompt = (
        "You are Bullseye, an AI-powered investment assistant. "
        "Explain technical indicators in a simple, educational way. "
        "Do not give direct buy/sell advice or guarantees."
        "Fetch current stock price from internet"
    )

    user_message = f"""
Asset: {symbol}

Current price: {price}
RSI: {rsi}
SMA: {sma}
EMA: {ema}

Explain:
1. What RSI indicates at this level
2. What SMA vs EMA relationship suggests
3. Overall market sentiment (bullish / bearish / neutral)
"""

    answer = llm_client.chat(
        system_prompt=system_prompt,
        user_message=user_message,
    )

    return {"explanation": answer}
