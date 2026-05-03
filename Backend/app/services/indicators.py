def sma(values, period=14):
    result = []
    for i in range(len(values)):
        if i < period:
            result.append(None)
        else:
            result.append(sum(values[i-period:i]) / period)
    return result


def ema(values, period=14):
    result = []
    k = 2 / (period + 1)
    ema_prev = None

    for price in values:
        if ema_prev is None:
            ema_prev = price
        else:
            ema_prev = price * k + ema_prev * (1 - k)
        result.append(ema_prev)

    return result

def rsi(values, period=14):
    gains = []
    losses = []

    for i in range(1, len(values)):
        delta = values[i] - values[i - 1]
        gains.append(max(delta, 0))
        losses.append(abs(min(delta, 0)))

    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period

    rsi_values = [None] * period

    for i in range(period, len(values)):
        avg_gain = (avg_gain * (period - 1) + gains[i - 1]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i - 1]) / period

        rs = avg_gain / avg_loss if avg_loss != 0 else 0
        rsi_values.append(100 - (100 / (1 + rs)))

    return rsi_values

def macd(values, fast=12, slow=26, signal=9):
    """
    MACD (Moving Average Convergence Divergence)
    Returns: (macd_line, signal_line, histogram)
    """
    ema_fast = ema(values, fast)
    ema_slow = ema(values, slow)
    
    macd_line = []
    for i in range(len(values)):
        if ema_fast[i] is None or ema_slow[i] is None:
            macd_line.append(None)
        else:
            macd_line.append(ema_fast[i] - ema_slow[i])
    
    # Signal line (EMA of MACD)
    macd_signal = ema([m for m in macd_line if m is not None], signal)
    
    # Pad signal to match length
    signal_line = [None] * (len(macd_line) - len(macd_signal)) + macd_signal
    
    # Histogram
    histogram = []
    for i in range(len(macd_line)):
        if macd_line[i] is None or signal_line[i] is None:
            histogram.append(None)
        else:
            histogram.append(macd_line[i] - signal_line[i])
    
    return macd_line, signal_line, histogram
