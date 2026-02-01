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
