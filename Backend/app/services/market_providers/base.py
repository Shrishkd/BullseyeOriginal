from abc import ABC, abstractmethod

class MarketProvider(ABC):

    @abstractmethod
    async def fetch_candles(
        self,
        instrument_key: str,
        resolution: str,
        limit: int = 100,
    ):
        pass

    @abstractmethod
    async def fetch_quote(self, instrument_key: str):
        pass
