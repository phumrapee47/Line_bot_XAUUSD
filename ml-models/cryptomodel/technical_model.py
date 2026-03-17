import pandas as pd
import numpy as np
import sys
import json
import datetime
import os
try:
    import xgboost as xgb
except ImportError:
    xgb = None
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import TimeSeriesSplit
from dotenv import load_dotenv

try:
    import ccxt
    HAS_CCXT = True
except ImportError:
    HAS_CCXT = False

try:
    from twelvedata import TDClient
    HAS_TWELVEDATA = True
except ImportError:
    HAS_TWELVEDATA = False

load_dotenv()
sys.stdout.reconfigure(encoding='utf-8')

# ================== CONFIG ==================
# [LOCKED TF] ผลจาก backtest walk-forward:
#   4h → BTC/ETH/BNB : Sharpe 11.89 | WR 64.5% | PF 2.03  ✅ ดีที่สุด
#   1h → SOL/DOGE    : Sharpe -0.7  | WR 54.2%            ✅ ดีสุดในกลุ่ม lower-cap
#   15m → XRP        : ตาม OPTIMIZED_TIMEFRAMES เดิม
#   5m/30m พังหมด → ไม่ใช้
OPTIMIZED_TIMEFRAMES = {
    'BTC/USDT':  '4h',
    'ETH/USDT':  '4h',
    'BNB/USDT':  '4h',
    'SOL/USDT':  '1h',
    'DOGE/USDT': '1h',
    'XRP/USDT':  '15m',
}
DEFAULT_TIMEFRAME = '4h'   # fallback สำหรับ symbol ที่ไม่ได้ระบุไว้

# Multi-TF map: TF หลัก → TF บน (สำหรับ higher-TF features)
MULTI_TF_MAP = {'5m': '15m', '15m': '1h', '30m': '1h', '1h': '4h', '4h': '1d'}
FEE_RATE = 0.0005
HORIZON = 5
THRESHOLD_PROB = 0.72
MIN_ADX = 30
VOL_MULTIPLIER = 1.2

def get_env_keys():
    return {
        'binance_api': os.getenv('BINANCE_API_KEY', ''),
        'binance_secret': os.getenv('BINANCE_SECRET_KEY', ''),
        'twelvedata_api': os.getenv('TWELVEDATA_API_KEY', '')
    }

keys = get_env_keys()

# ================== FETCH DATA ==================
# [FIX] เปลี่ยนจาก TwelveData เป็น Binance (ccxt) เหมือน file2
# ลำดับ: Binance → KuCoin → Bybit → OKX → TwelveData (fallback สุดท้าย)
def fetch_data_ccxt(symbol, timeframe='30m', limit=800):
    if not HAS_CCXT:
        raise ImportError("ccxt module not found")

    exchanges_to_try = []

    # เพิ่ม Binance เป็นอันดับแรก (เหมือน file2)
    if keys['binance_api'] and keys['binance_secret']:
        exchanges_to_try.append(
            ccxt.binance({
                'apiKey': keys['binance_api'],
                'secret': keys['binance_secret'],
                'enableRateLimit': True
            })
        )
    else:
        exchanges_to_try.append(ccxt.binance({'enableRateLimit': True}))

    # Fallback exchanges
    exchanges_to_try += [
        ccxt.kucoin({'enableRateLimit': True}),
        ccxt.bybit({'enableRateLimit': True}),
        ccxt.okx({'enableRateLimit': True}),
    ]

    for exchange in exchanges_to_try:
        try:
            bars = exchange.fetch_ohlcv(symbol, timeframe, limit=limit)
            df = pd.DataFrame(bars, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            return df.set_index('timestamp')
        except Exception:
            continue

    raise Exception("All exchanges failed")

def fetch_data_twelvedata(symbol, timeframe='30m', limit=800):
    if not HAS_TWELVEDATA or not keys['twelvedata_api']:
        raise ImportError("TwelveData missing")
    td_symbol = symbol.replace('/USDT', '/USD')
    td_interval = timeframe.replace('m', 'min').replace('h', 'h')
    td = TDClient(apikey=keys['twelvedata_api'])
    ts = td.time_series(symbol=td_symbol, interval=td_interval, outputsize=limit)
    df = ts.as_pandas().iloc[::-1]
    df.index.name = 'timestamp'
    return df

def fetch_data(symbol, timeframe='30m', limit=800):
    try:
        return fetch_data_ccxt(symbol, timeframe, limit)
    except Exception:
        try:
            return fetch_data_twelvedata(symbol, timeframe, limit)
        except Exception as e:
            raise Exception(f"Data fetch failed: {str(e)}")

# ================== INDICATORS ==================
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

    tr = pd.concat([high - low, (high - close.shift()).abs(), (low - close.shift()).abs()], axis=1).max(axis=1)
    df['atr'] = tr.ewm(span=14, adjust=False).mean()

    delta = close.diff()
    gain = delta.clip(lower=0).ewm(span=14, adjust=False).mean()
    loss = (-delta.clip(upper=0)).ewm(span=14, adjust=False).mean()
    df['rsi'] = 100 - 100 / (1 + gain / loss)

    df['vol_sma'] = volume.rolling(20).mean()

    # OBV
    obv = [0]
    for i in range(1, len(df)):
        if close.iloc[i] > close.iloc[i - 1]:
            obv.append(obv[-1] + volume.iloc[i])
        elif close.iloc[i] < close.iloc[i - 1]:
            obv.append(obv[-1] - volume.iloc[i])
        else:
            obv.append(obv[-1])
    df['obv'] = obv
    df['obv_diff'] = df['obv'].diff()

    # ADX
    tr_series = pd.concat([high - low, (high - close.shift()).abs(), (low - close.shift()).abs()], axis=1).max(axis=1)
    atr_14 = tr_series.rolling(14).mean()
    plus_dm = high.diff()
    minus_dm = -low.diff()
    plus_dm[plus_dm < 0] = 0
    minus_dm[minus_dm < 0] = 0
    plus_di = 100 * (plus_dm.ewm(span=14, adjust=False).mean() / atr_14)
    minus_di = 100 * (minus_dm.ewm(span=14, adjust=False).mean() / atr_14)
    dx = 100 * (abs(plus_di - minus_di) / (plus_di + minus_di))
    df['adx'] = dx.ewm(span=14, adjust=False).mean()

    # Parabolic SAR
    af, max_af = 0.02, 0.2
    sar = close.copy()
    ep, trend = low.iloc[0], 1
    sar.iloc[0] = low.iloc[0]
    for i in range(1, len(df)):
        sar.iloc[i] = sar.iloc[i - 1] + af * (ep - sar.iloc[i - 1])
        if trend == 1:
            if low.iloc[i] < sar.iloc[i]:
                trend, sar.iloc[i], ep, af = -1, ep, low.iloc[i], 0.02
            else:
                if high.iloc[i] > ep:
                    ep, af = high.iloc[i], min(af + 0.02, max_af)
                sar.iloc[i] = min(sar.iloc[i], low.iloc[i - 1] if i >= 1 else low.iloc[i])
        else:
            if high.iloc[i] > sar.iloc[i]:
                trend, sar.iloc[i], ep, af = 1, ep, high.iloc[i], 0.02
            else:
                if low.iloc[i] < ep:
                    ep, af = low.iloc[i], min(af + 0.02, max_af)
                sar.iloc[i] = max(sar.iloc[i], high.iloc[i - 1] if i >= 1 else high.iloc[i])
    df['sar'] = sar
    return df

# ================== FEATURES & TARGETS ==================
def create_features_targets(df, horizon=5):
    data = df.copy()
    data['close_future'] = data['close'].shift(-horizon)
    data['pct_change'] = (data['close_future'] - data['close']) / data['close']
    data['target'] = (data['pct_change'] > 0).astype(int)
    data = data.dropna(subset=['close_future'])

    feature_columns = ['macd', 'signal', 'hist', 'ema50', 'ema200', 'atr', 'rsi',
                        'vol_sma', 'obv_diff', 'adx', 'sar']
    higher_cols = [col for col in df.columns if col.startswith('higher_')]
    feature_columns += higher_cols

    available_features = [col for col in feature_columns if col in data.columns]
    X = data[available_features].copy()
    y = data['target'].copy()
    pct = data['pct_change'].copy()

    X = X.ffill().dropna()
    y = y.loc[X.index]
    pct = pct.loc[X.index]
    return X, y, pct

# ================== WALK-FORWARD BACKTEST ==================
def run_walk_forward_backtest(X, y, pct_changes, timeframe, n_splits=5):
    tscv = TimeSeriesSplit(n_splits=n_splits)
    trade_returns = []

    for train_idx, test_idx in tscv.split(X):
        X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
        y_train = y.iloc[train_idx]
        pct_test = pct_changes.iloc[test_idx]

        model = xgb.XGBClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            eval_metric='logloss'
        )
        model.fit(X_train, y_train)

        proba_up = model.predict_proba(X_test)[:, 1]

        for i in range(len(test_idx)):
            p = proba_up[i]
            adx = X_test.iloc[i]['adx']
            actual_ret = pct_test.iloc[i]

            if p >= THRESHOLD_PROB and adx >= MIN_ADX:
                ret = actual_ret - 2 * FEE_RATE
                trade_returns.append(ret)
            elif p <= (1 - THRESHOLD_PROB) and adx >= MIN_ADX:
                ret = -actual_ret - 2 * FEE_RATE
                trade_returns.append(ret)

    if not trade_returns:
        return {"num_trades": 0, "win_rate": 0, "total_return_pct": 0,
                "profit_factor": 0, "sharpe_ratio": 0, "avg_return_per_trade_pct": 0}

    returns = np.array(trade_returns)
    win_rate = (returns > 0).mean() * 100
    total_return = returns.sum() * 100
    profit_factor = (returns[returns > 0].sum() / abs(returns[returns < 0].sum())) if any(returns < 0) else 999
    sharpe_raw = returns.mean() / returns.std() if returns.std() != 0 else 0

    tf_min = int(timeframe.replace('m', '')) if 'm' in timeframe else int(timeframe.replace('h', '')) * 60
    periods_per_year = 365 * 24 * 60 / tf_min
    ann_sharpe = sharpe_raw * np.sqrt(periods_per_year)

    return {
        "num_trades": len(returns),
        "win_rate": round(win_rate, 2),
        "total_return_pct": round(total_return, 2),
        "profit_factor": round(profit_factor, 2),
        "sharpe_ratio": round(ann_sharpe, 2),
        "avg_return_per_trade_pct": round(returns.mean() * 100, 2)
    }

# ================== GET LOCKED TIMEFRAME (แทน find_best_timeframe) ==================
# [LOCKED] ไม่สแกน 5 TF แล้ว — ใช้ TF ที่ผ่าน backtest มาแล้ว
def get_locked_timeframe(full_symbol):
    # ตัด exchange suffix ออกก่อน match เช่น BTC/USDT:USDT → BTC/USDT
    base_symbol = full_symbol.split(':')[0]
    tf = OPTIMIZED_TIMEFRAMES.get(base_symbol, DEFAULT_TIMEFRAME)
    return tf

def find_best_timeframe_new_symbol(full_symbol):
    """ใช้เฉพาะ symbol ใหม่ที่ไม่อยู่ใน OPTIMIZED_TIMEFRAMES
    ลดจาก 5 TF → 3 TF (ตัด 5m/30m ที่พิสูจน์แล้วว่าแย่ใน backtest)"""
    candidate_tfs = ['4h', '1h', '15m']
    best_tf = DEFAULT_TIMEFRAME
    best_score = -np.inf
    best_metrics = {}
    tf_results = {}

    for tf in candidate_tfs:
        try:
            df = fetch_data(full_symbol, tf)
            df = add_indicators(df)

            higher_tf = MULTI_TF_MAP.get(tf, '1d')
            try:
                higher_df = fetch_data(full_symbol, higher_tf)
                higher_df = add_indicators(higher_df)
                higher_features = higher_df[['macd', 'signal', 'rsi', 'ema50', 'ema200', 'adx']].copy()
                higher_resampled = higher_features.reindex(df.index, method='ffill')
                for col in higher_resampled.columns:
                    df[f'higher_{col}'] = higher_resampled[col]
            except Exception:
                pass

            X, y, pct = create_features_targets(df, horizon=HORIZON)
            if len(X) < 50:
                continue

            metrics = run_walk_forward_backtest(X, y, pct, tf)
            score = metrics.get('sharpe_ratio', -999) + (metrics.get('profit_factor', 0) / 10)
            tf_results[tf] = metrics

            if score > best_score:
                best_score = score
                best_tf = tf
                best_metrics = metrics
        except Exception:
            continue

    return best_tf, best_metrics, tf_results

# ================== SIGNAL GENERATION ==================
def generate_line_signal(df, model, symbol, timeframe, threshold_prob=THRESHOLD_PROB):
    feature_columns = ['macd', 'signal', 'hist', 'ema50', 'ema200', 'atr', 'rsi',
                        'vol_sma', 'obv_diff', 'adx', 'sar']
    higher_cols = [col for col in df.columns if col.startswith('higher_')]
    feature_columns += higher_cols

    # กรอง feature_columns ให้เฉพาะที่มีใน df จริงๆ
    available_features = [col for col in feature_columns if col in df.columns]

    last_row = df.iloc[-1:]
    current_price = last_row['close'].values[0]
    atr = last_row['atr'].values[0]
    adx_now = last_row['adx'].values[0]
    rsi_now = last_row['rsi'].values[0]

    proba = model.predict_proba(last_row[available_features])
    prob_up = proba[0][1]

    score = 0
    if current_price > last_row['ema200'].values[0]: score += 25
    if rsi_now > 50: score += 25
    if last_row['macd'].values[0] > last_row['signal'].values[0]: score += 25
    if adx_now > 20: score += 25

    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def format_price(p):
        if p >= 100: return f"{p:,.2f}"
        if p >= 1: return f"{p:,.4f}"
        return f"{p:.6f}"

    if prob_up >= threshold_prob and adx_now >= MIN_ADX:
        signal_type = "🟢 BUY"
        signal_short = "BUY"
        confidence = prob_up * 100
        risk = atr * 2
        tp1 = current_price + (risk * 1.5)
        tp2 = current_price + (risk * 3.0)
        sl = current_price - risk
    elif prob_up <= (1 - threshold_prob) and adx_now >= MIN_ADX:
        signal_type = "🔴 SELL"
        signal_short = "SELL"
        confidence = (1 - prob_up) * 100
        risk = atr * 2
        tp1 = current_price - (risk * 1.5)
        tp2 = current_price - (risk * 3.0)
        sl = current_price + risk
    else:
        signal_type = "⚪ HOLD (ADX ต่ำหรือความมั่นใจไม่พอ)"
        signal_short = "HOLD"
        confidence = max(prob_up, 1 - prob_up) * 100
        risk = atr * 2
        tp1 = tp2 = sl = current_price

    # [OUTPUT FORMAT] — คงรูปแบบเดิมตามที่กำหนด
    message = f"""🔔 {symbol} Trading Signal 🔔
━━━━━━━━━━━━━━━━━━
Signal: {signal_type}
Confidence: {confidence:.2f}%
Technical Score: {score}/100
Trend: {'Bullish' if current_price > last_row['ema200'].values[0] else 'Bearish'}
Entry: ${format_price(current_price)}
TP1: ${format_price(tp1)} | TP2: ${format_price(tp2)}
SL: ${format_price(sl)}
Time: {now}
⚠️ ขยับ SL มาที่ทุนเมื่อแตะ TP1"""

    return {
        "signal": signal_short,
        "signal_display": signal_type,
        "confidence": round(confidence, 2),
        "price": current_price,
        "score": score,
        "tp1": tp1,
        "tp2": tp2,
        "sl": sl,
        "adx": round(adx_now, 2),
        "rsi": round(rsi_now, 2),
        "probability": round(confidence / 100, 4),
        "trend": "bullish" if current_price > last_row['ema200'].values[0] else "bearish",
        "message": message
    }

# ================== MAIN ==================
def analyze_symbol(symbol):
    try:
        full_symbol = symbol if '/' in symbol else f"{symbol}/USDT"

        # [LOCKED TF] อ่าน TF จาก OPTIMIZED_TIMEFRAMES โดยตรง — ไม่ต้องสแกนทุกครั้ง
        is_known_symbol = full_symbol.split(':')[0] in OPTIMIZED_TIMEFRAMES
        if is_known_symbol:
            timeframe = get_locked_timeframe(full_symbol)
            tf_source = f"Locked (backtest-optimized)"
            best_metrics = {}
            tf_comparison = {}
        else:
            # symbol ใหม่ → ทดสอบ 3 TF (4h/1h/15m) เพื่อหาที่ดีสุด
            timeframe, best_metrics, tf_comparison = find_best_timeframe_new_symbol(full_symbol)
            tf_source = "Auto-selected (new symbol)"

        # ดึงข้อมูลด้วย TF ที่กำหนด
        df = fetch_data(full_symbol, timeframe)
        df = add_indicators(df)

        # Multi-TF block — ดึง higher TF มาเป็น features เพิ่มเติม
        higher_tf = MULTI_TF_MAP.get(timeframe, '1d')
        try:
            higher_df = fetch_data(full_symbol, higher_tf)
            higher_df = add_indicators(higher_df)
            higher_features = higher_df[['macd', 'signal', 'rsi', 'ema50', 'ema200', 'adx']].copy()
            higher_resampled = higher_features.reindex(df.index, method='ffill')
            for col in higher_resampled.columns:
                df[f'higher_{col}'] = higher_resampled[col]
        except Exception:
            pass  # ไม่บังคับ — ใช้ single TF แทนถ้า higher TF ดึงไม่ได้

        X, y, pct = create_features_targets(df, horizon=HORIZON)

        # Train final model
        if 'xgb' in sys.modules and xgb is not None:
            model = xgb.XGBClassifier(
                n_estimators=300,
                max_depth=5,
                learning_rate=0.08,
                subsample=0.75,
                colsample_bytree=0.75,
                scale_pos_weight=(y == 0).sum() / (y == 1).sum() if (y == 1).sum() > 0 else 1,
                random_state=42,
                eval_metric='logloss'
            )
            model_name = "XGBoost v4 (Locked-TF)"
        else:
            # Fallback to RandomForest if XGBoost is missing (Render environment safety)
            model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
            model_name = "RandomForest (Fallback)"
            
        model.fit(X, y)

        result = generate_line_signal(df, model, full_symbol, timeframe)
        result["symbol"] = full_symbol
        result["timeframe"] = timeframe
        result["tf_source"] = tf_source
        result["model"] = model_name
        result["backtest"] = best_metrics
        result["tf_comparison"] = {tf: metrics for tf, metrics in tf_comparison.items()}
        result["status"] = "success"

        def clean_data(d):
            if isinstance(d, dict):
                return {k: clean_data(v) for k, v in d.items()}
            if isinstance(d, float):
                return 0.0 if np.isnan(d) or np.isinf(d) else round(d, 4)
            return d

        cleaned = clean_data(result)

        # print message (LINE/terminal format) แล้วตามด้วย JSON สำหรับ programmatic use
        # print(cleaned["message"])
        print(json.dumps(cleaned, ensure_ascii=False))

    except Exception as e:
        import traceback
        err = {"status": "error", "message": str(e), "trace": traceback.format_exc()}
        print(json.dumps(err, ensure_ascii=False))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        analyze_symbol(sys.argv[1])
    else:
        analyze_symbol('BTC/USDT')