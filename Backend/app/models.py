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

    portfolios    = relationship("Portfolio",        back_populates="owner")
    chat_messages = relationship("ChatMessage",      back_populates="user")
    holdings      = relationship("PortfolioHolding", back_populates="user")
    alerts        = relationship("Alert",            back_populates="user")


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


class PortfolioHolding(Base):
    __tablename__ = "portfolio_holdings"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    symbol     = Column(String(50), nullable=False, index=True)
    quantity   = Column(Float, nullable=False)
    buy_price  = Column(Float, nullable=False)
    buy_date   = Column(DateTime(timezone=True), nullable=False)
    asset_type = Column(String(50), default="stock")  # stock / etf / crypto / mutual_fund
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="holdings")


class Alert(Base):
    __tablename__ = "alerts"

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False)
    symbol          = Column(String(50), nullable=False, index=True)
    alert_type      = Column(String(50), nullable=False)
    threshold       = Column(Float, nullable=False)
    note            = Column(String(500), nullable=True)
    is_active       = Column(Boolean, default=True)
    triggered_count = Column(Integer, default=0)
    last_triggered  = Column(DateTime(timezone=True), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    user     = relationship("User", back_populates="alerts")
    triggers = relationship("TriggeredAlert", back_populates="alert")


class TriggeredAlert(Base):
    __tablename__ = "triggered_alerts"

    id            = Column(Integer, primary_key=True, index=True)
    alert_id      = Column(Integer, ForeignKey("alerts.id"), nullable=False)
    symbol        = Column(String(50), nullable=False)
    alert_type    = Column(String(50), nullable=False)
    threshold     = Column(Float, nullable=False)
    current_value = Column(Float, nullable=False)
    message       = Column(String(500), nullable=False)
    triggered_at  = Column(DateTime(timezone=True), server_default=func.now())

    alert = relationship("Alert", back_populates="triggers")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    role = Column(String(50), default="user")  # user / assistant / system
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="chat_messages")


class DocumentEmbedding(Base):
    """RAG storage — can be replaced with external vector DB."""
    __tablename__ = "document_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    doc_id = Column(String(255), unique=True, index=True)
    text = Column(Text, nullable=False)
    embedding = Column(Text, nullable=False)
    doc_meta = Column(Text, nullable=True)