import ccxt
import pandas as pd
import numpy as np
import sys
import json
import time
import datetime
import os
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier

sys.stdout.reconfigure(encoding='utf-8')

# Optimized timeframe mapping from backtest results
OPTIMIZED_TIMEFRAMES = {
    'BNB/USDT': '15m',
    'BTC/USDT': '15m',
    'ETH/USDT': '15m',
    'SOL/USDT': '1h',
    'DOGE/USDT': '1h',
    'XRP/USDT': '5m',
}

DEFAULT_TIMEFRAME = '30m'

def load_env_keys():
    api_key = ''
    secret_key = ''
    try:
        env_path = Path(__file__).parent.parent.parent / '.env'
        if env_path.exists():
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    if '=' in line:
                        key, val = line.split('=', 1)
                        key = key.strip()
                        val = val.strip()
                        if key == 'BINANCE_API_KEY':
                            api_key = val
                        elif key == 'BINANCE_SECRET_KEY':
                            secret_key = val
    except Exception:
        pass
    return api_key, secret_key

api_key, secret_key = load_env_keys()

try:
    # Use KuCoin instead of Binance to avoid US region blocking on Render
    exchange = ccxt.kucoin({
        'enableRateLimit': True,
    })
    
    # Only add keys if they exist (though public data usually doesn't need them)
    if api_key and secret_key:
        exchange.apiKey = api_key
        exchange.secret = secret_key
        
except getattr(ccxt, 'ExchangeNotAvailable', Exception):
    # Fallback to bybit if kucoin fails
    exchange = ccxt.bybit({'enableRateLimit': True})

def fetch_data(symbol, timeframe='30m', limit=1000):
    bars = exchange.fetch_ohlcv(symbol, timeframe, limit=limit)
    df = pd.DataFrame(bars, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
    df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
    return df.set_index('timestamp')

def add_indicators(df):
    close = df['close']
    high = df['high']
    low = df['low']
    volume = df['volume']

    ema_fast = close.ewm(span=12, adjust=False).mean()
    ema_slow = close.ewm(span=26, adjust=False).mean()
    df['macd'] = ema_fast - ema_slow
    df['signal'] = df['macd'].ewm(span=9, adjust=False).mean()
    df['hist'] = df['macd'] - df['signal']

    df['ema50'] = close.ewm(span=50, adjust=False).mean()
    df['ema200'] = close.ewm(span=200, adjust=False).mean()

    tr = pd.concat([
        high - low,
        (high - close.shift()).abs(),
        (low - close.shift()).abs()
    ], axis=1).max(axis=1)
    df['atr'] = tr.ewm(span=14, adjust=False).mean()

    delta = close.diff()
    gain = delta.clip(lower=0).ewm(span=14, adjust=False).mean()
    loss = (-delta.clip(upper=0)).ewm(span=14, adjust=False).mean()
    df['rsi'] = 100 - 100 / (1 + gain / loss)

    df['vol_sma'] = volume.rolling(20).mean()

    obv = [0]
    for i in range(1, len(df)):
        if close.iloc[i] > close.iloc[i-1]:
            obv.append(obv[-1] + volume.iloc[i])
        elif close.iloc[i] < close.iloc[i-1]:
            obv.append(obv[-1] - volume.iloc[i])
        else:
            obv.append(obv[-1])
    df['obv'] = obv
    df['obv_diff'] = df['obv'].diff()

    tr_series = pd.concat([high-low, (high-close.shift()).abs(), (low-close.shift()).abs()], axis=1).max(axis=1)
    atr_14 = tr_series.rolling(14).mean()
    plus_dm = high.diff()
    minus_dm = -low.diff()
    plus_dm[plus_dm < 0] = 0
    minus_dm[minus_dm < 0] = 0
    plus_di = 100 * (plus_dm.ewm(span=14, adjust=False).mean() / atr_14)
    minus_di = 100 * (minus_dm.ewm(span=14, adjust=False).mean() / atr_14)
    dx = 100 * (abs(plus_di - minus_di) / (plus_di + minus_di))
    df['adx'] = dx.ewm(span=14, adjust=False).mean()

    af, max_af = 0.02, 0.2
    sar = close.copy()
    ep, trend = low.iloc[0], 1
    sar.iloc[0] = low.iloc[0]
    for i in range(1, len(df)):
        sar.iloc[i] = sar.iloc[i-1] + af * (ep - sar.iloc[i-1])
        if trend == 1:
            if low.iloc[i] < sar.iloc[i]:
                trend, sar.iloc[i], ep, af = -1, ep, low.iloc[i], 0.02
            else:
                if high.iloc[i] > ep: ep, af = high.iloc[i], min(af + 0.02, max_af)
                sar.iloc[i] = min(sar.iloc[i], low.iloc[i-1] if i >= 1 else low.iloc[i])
        else:
            if high.iloc[i] > sar.iloc[i]:
                trend, sar.iloc[i], ep, af = 1, ep, high.iloc[i], 0.02
            else:
                if low.iloc[i] < ep: ep, af = low.iloc[i], min(af + 0.02, max_af)
                sar.iloc[i] = max(sar.iloc[i], high.iloc[i-1] if i >= 1 else high.iloc[i])
    df['sar'] = sar

    return df

def create_features_targets(df, horizon=5, threshold=0.0):
    data = df.copy()
    data['close_now'] = data['close']
    data['close_future'] = data['close'].shift(-horizon)
    data['pct_change'] = (data['close_future'] - data['close_now']) / data['close_now']
    data['target'] = 0
    data.loc[data['pct_change'] > threshold, 'target'] = 1
    data.loc[data['pct_change'] < -threshold, 'target'] = 0
    data = data.dropna(subset=['close_future'])
    data = data[abs(data['pct_change']) > threshold]

    feature_columns = ['macd', 'signal', 'hist', 'ema50', 'ema200', 'atr', 'rsi', 'vol_sma', 'obv_diff', 'adx', 'sar']
    available_features = [col for col in feature_columns if col in data.columns]
    X = data[available_features].copy()
    y = data['target'].copy()
    X = X.ffill().dropna()
    y = y.loc[X.index]
    return X, y

def train_model(X_train, y_train):
    model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, class_weight='balanced')
    model.fit(X_train, y_train)
    return model

def generate_line_signal(df, model, symbol, threshold_prob=0.6):
    feature_columns = ['macd', 'signal', 'hist', 'ema50', 'ema200', 'atr', 'rsi', 'vol_sma', 'obv_diff', 'adx', 'sar']
    last_row = df.iloc[-1:]
    current_price = last_row['close'].values[0]
    atr = last_row['atr'].values[0]

    proba = model.predict_proba(last_row[feature_columns])
    prob_up = proba[0][1] if model.classes_.tolist() == [0, 1] else proba[0][0]
    prob_down = 1 - prob_up

    score = 0
    if current_price > last_row['ema200'].values[0]: score += 25
    if last_row['rsi'].values[0] > 50: score += 25
    if last_row['macd'].values[0] > last_row['signal'].values[0]: score += 25
    if last_row['adx'].values[0] > 20: score += 25

    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if prob_up >= threshold_prob:
        signal_type = "🟢 BUY"
        confidence = prob_up * 100
        risk = atr * 2
        tp1 = current_price + (risk * 1.5)
        tp2 = current_price + (risk * 3.0)   # เพิ่ม TP2
        sl  = current_price - risk
    elif prob_down >= threshold_prob:
        signal_type = "🔴 SELL"
        confidence = prob_down * 100
        risk = atr * 2
        tp1 = current_price - (risk * 1.5)
        tp2 = current_price - (risk * 3.0)   # เพิ่ม TP2
        sl  = current_price + risk
    else:
        return {
            "signal": "⚪ HOLD",
            "probability": prob_up,
            "confidence": max(prob_up, prob_down) * 100,
            "price": current_price,
            "score": score,
            "tp1": current_price,
            "tp2": current_price,
            "sl": current_price,
            "message": None
        }

    def format_price(p):
        if p is None: return "N/A"
        if p >= 100: return f"{p:,.2f}"
        if p >= 1: return f"{p:,.4f}"
        if p >= 0.0001: return f"{p:.6f}"
        return f"{p:.8f}"

    message = (
        f"🔔 {symbol} Trading Signal 🔔\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"Signal: {signal_type}\n"
        f"Confidence: {confidence:.2f}%\n\n"
        f"📊 Technical Score: {score:.2f}%\n"
        f"📈 Trend: {'Bullish' if current_price > last_row['ema200'].values[0] else 'Bearish'}\n\n"
        f"💰 Entry: ${format_price(current_price)}\n"
        f"🎯 TP 1: ${format_price(tp1)} (Half Close)\n"
        f"🎯 TP 2: ${format_price(tp2)} (Follow Trend)\n"
        f"🛡️ Stop Loss: ${format_price(sl)}\n\n"
        f"⏰ Time: {now}\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"⚠️ ขยับ SL มาที่ทุนเมื่อราคาแตะ TP1"
    )

    return {
        "signal": signal_type,
        "probability": prob_up,
        "confidence": confidence,
        "price": current_price,
        "score": score,
        "tp1": tp1,
        "tp2": tp2,
        "sl": sl,
        "message": message
    }

def analyze_symbol(symbol):
    try:
        full_symbol = symbol if '/' in symbol else f"{symbol}/USDT"
        timeframe = OPTIMIZED_TIMEFRAMES.get(full_symbol, DEFAULT_TIMEFRAME)

        df = fetch_data(full_symbol, timeframe)
        df = add_indicators(df)

        # Lower threshold or better yet, don't filter out so much if data is scarce
        X, y = create_features_targets(df, horizon=5, threshold=0.001) # Lowered from 0.005
        
        if len(X) < 10:
            # Fallback if too little data for training: try even lower threshold
            X, y = create_features_targets(df, horizon=5, threshold=0)
            
        if len(X) < 2:
            raise Exception(f"Insufficient training data for {full_symbol} (found {len(X)} rows)")

        model = train_model(X, y)

        result_data = generate_line_signal(df, model, full_symbol)

        result_data["symbol"] = full_symbol
        result_data["timeframe"] = timeframe
        result_data["status"] = "success"

        # Ensure all values are JSON serializable (no NaNs)
        def clean_data(d):
            if isinstance(d, dict):
                return {k: clean_data(v) for k, v in d.items()}
            elif isinstance(d, list):
                return [clean_data(v) for v in d]
            elif isinstance(d, float):
                if np.isnan(d) or np.isinf(d): return 0.0
                return d
            return d

        print(json.dumps(clean_data(result_data)))

    except Exception as e:
        import traceback
        error_msg = f"{str(e)}\n{traceback.format_exc()}"
        print(json.dumps({"status": "error", "message": error_msg}))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        analyze_symbol(sys.argv[1])
    else:
        analyze_symbol('BTC/USDT')