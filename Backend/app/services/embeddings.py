import json
from sentence_transformers import SentenceTransformer
import numpy as np
from app.core.config import settings


class EmbeddingsStore:
    """
    For now, this just provides embed() and a stub similarity_search().
    Later you can connect Pinecone / Chroma / Qdrant here.
    """

    def __init__(self):
        self.model = SentenceTransformer(settings.EMBEDDING_MODEL)

    def embed_text(self, text: str) -> list[float]:
        emb = self.model.encode([text], show_progress_bar=False)[0]
        return emb.tolist()

    def similarity_search(self, query_emb: list[float], top_k: int = 5):
        # TODO: hook to real vector DB
        # For now, return empty list
        return []
