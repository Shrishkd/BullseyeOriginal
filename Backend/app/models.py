from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Float,
    ForeignKey, Text
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    portfolios = relationship("Portfolio", back_populates="owner")
    chat_messages = relationship("ChatMessage", back_populates="user")


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=True)
    type = Column(String(50), default="stock")  # stock / crypto / etf / forex

    prices = relationship("Price", back_populates="asset")


class Price(Base):
    __tablename__ = "prices"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), index=True)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    volume = Column(Float)

    asset = relationship("Asset", back_populates="prices")


class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), default="Main")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="portfolios")
    # For now, you can manage holdings on frontend or later add a PortfolioHolding table


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    role = Column(String(50), default="user")  # user / assistant / system
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="chat_messages")


class DocumentEmbedding(Base):
    """
    RAG storage (if you don't use external vector DB).
    For now, we keep embedding as JSON/text; can be replaced later.
    """
    __tablename__ = "document_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    doc_id = Column(String(255), unique=True, index=True)
    text = Column(Text, nullable=False)
    embedding = Column(Text, nullable=False)  # JSON-string of vector
    doc_meta = Column(Text, nullable=True)
