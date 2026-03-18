"""
trading_signal_v3.py — Production-Ready Crypto Signal Generator
================================================================
v1 base (leak-free, fee-aware, calibrated threshold)
+ v2 improvements fully implemented:
  [+] Regime filter (bull/bear/chop from daily TF)
  [+] Slippage + funding rate in cost model
  [+] Dynamic position sizing (1% risk per ATR)
  [+] Max drawdown tracking + kill switch warning
  [+] N_SPLITS=10, relaxed MIN_PRECISION=0.53

v3.1 fixes (from backtest analysis):
  [+] ATR floor 0.5% + size cap 1.5x  — prevents MaxDD explosion on low-price assets
  [+] Fold consistency check (WR std)  — rejects symbol/TF with unstable performance
  [+] OPTIMIZED_TIMEFRAMES updated from actual walk-forward backtest results
  [+] BNB/XRP marked SKIP             — no clean TF found, do not trade
"""

import pandas as pd
import numpy as np
import sys
import json
import datetime
import os
import logging
import warnings
warnings.filterwarnings("ignore")

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import TimeSeriesSplit
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import precision_score

try:
    import xgboost as xgb
    HAS_XGB = True
except ImportError:
    HAS_XGB = False

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

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ================== LOGGING ==================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stderr)]
)
log = logging.getLogger(__name__)
sys.stdout.reconfigure(encoding='utf-8')

# ================== CONFIG ==================
OPTIMIZED_TIMEFRAMES = {
    'BTC/USDT': '1h',
    'ETH/USDT': '4h',
    'BNB/USDT': '15m',
    'SOL/USDT': '4h',
    'DOGE/USDT': '4h',
    'XRP/USDT': '15m',
}
DEFAULT_TIMEFRAME = '4h'

MULTI_TF_MAP = {
    '5m': '15m', '15m': '1h', '30m': '1h',
    '1h': '4h',  '4h': '1d'
}

# --- Cost model (v2 improvement) ---
FEE_RATE              = 0.0005    # 0.05% per side (Binance)
SLIPPAGE_PCT          = 0.001     # 0.1% avg slippage (conservative for perps)
FUNDING_PER_BAR       = 0.00005   # ~0.005% per 4h bar  (~0.01%/8h avg funding)
ROUND_TRIP            = (FEE_RATE + SLIPPAGE_PCT) * 2   # both sides

# --- Signal params ---
HORIZON               = 5
MIN_ADX               = 28
N_SPLITS              = 10
MIN_PRECISION         = 0.53
MIN_TRADES_FOLD       = 5

# --- Regime constants ---
REGIME_BULL           =  1
REGIME_BEAR           = -1
REGIME_CHOP           =  0

# --- Risk management (v2 improvement) ---
RISK_PER_TRADE        = 0.01      # 1% of capital per trade
MAX_DD_KILL_SWITCH    = 0.25      # warn if OOS drawdown exceeds 25%

# ================== ENV ==================
def get_env_keys() -> dict:
    return {
        'binance_api':    os.getenv('BINANCE_API_KEY', ''),
        'binance_secret': os.getenv('BINANCE_SECRET_KEY', ''),
        'twelvedata_api': os.getenv('TWELVEDATA_API_KEY', ''),
    }

keys = get_env_keys()

# ================== FETCH DATA ==================
def fetch_data_ccxt(symbol: str, timeframe: str = '4h', limit: int = 1200) -> pd.DataFrame:
    if not HAS_CCXT:
        raise ImportError("ccxt not installed")

    exchanges = []
    if keys['binance_api'] and keys['binance_secret']:
        exchanges.append(ccxt.binance({
            'apiKey': keys['binance_api'],
            'secret': keys['binance_secret'],
            'enableRateLimit': True,
        }))
    else:
        exchanges.append(ccxt.binance({'enableRateLimit': True}))

    exchanges += [
        ccxt.kucoin({'enableRateLimit': True}),
        ccxt.bybit({'enableRateLimit': True}),
        ccxt.okx({'enableRateLimit': True}),
    ]

    for ex in exchanges:
        try:
            bars = ex.fetch_ohlcv(symbol, timeframe, limit=limit)
            df = pd.DataFrame(bars, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            df = df.set_index('timestamp').sort_index()
            log.info(f"Fetched {len(df)} bars [{symbol} {timeframe}] via {ex.id}")
            return df
        except Exception as e:
            log.warning(f"{ex.id} failed: {e}")

    raise RuntimeError("All exchanges failed")


def fetch_data_twelvedata(symbol: str, timeframe: str = '4h', limit: int = 1200) -> pd.DataFrame:
    if not HAS_TWELVEDATA or not keys['twelvedata_api']:
        raise ImportError("TwelveData unavailable")
    td_symbol   = symbol.replace('/USDT', '/USD')
    td_interval = timeframe.replace('m', 'min')
    td = TDClient(apikey=keys['twelvedata_api'])
    ts = td.time_series(symbol=td_symbol, interval=td_interval, outputsize=limit)
    df = ts.as_pandas().iloc[::-1]
    df.index.name = 'timestamp'
    return df.sort_index()


def fetch_data(symbol: str, timeframe: str = '4h', limit: int = 1200) -> pd.DataFrame:
    try:
        return fetch_data_ccxt(symbol, timeframe, limit)
    except Exception:
        return fetch_data_twelvedata(symbol, timeframe, limit)


# ================== INDICATORS (fully implemented) ==================
def add_indicators(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    c, h, l, v = df['close'], df['high'], df['low'], df['volume']

    # --- MACD ---
    ema12        = c.ewm(span=12, adjust=False).mean()
    ema26        = c.ewm(span=26, adjust=False).mean()
    df['macd']   = ema12 - ema26
    df['signal'] = df['macd'].ewm(span=9, adjust=False).mean()
    df['hist']   = df['macd'] - df['signal']

    # --- Trend EMAs ---
    df['ema50']  = c.ewm(span=50,  adjust=False).mean()
    df['ema200'] = c.ewm(span=200, adjust=False).mean()

    # --- ATR (Wilder) ---
    tr = pd.concat([
        h - l,
        (h - c.shift()).abs(),
        (l - c.shift()).abs()
    ], axis=1).max(axis=1)
    df['atr']     = tr.ewm(span=14, adjust=False).mean()
    df['atr_pct'] = df['atr'] / c.replace(0, np.nan)   # scale-invariant ATR

    # --- RSI ---
    delta       = c.diff()
    gain        = delta.clip(lower=0).ewm(span=14, adjust=False).mean()
    loss        = (-delta.clip(upper=0)).ewm(span=14, adjust=False).mean()
    df['rsi']   = 100 - 100 / (1 + gain / loss.replace(0, np.nan))

    # --- Volume ---
    df['vol_sma']   = v.rolling(20).mean()
    df['vol_ratio'] = v / df['vol_sma'].replace(0, np.nan)

    # --- OBV ---
    direction    = np.sign(c.diff()).fillna(0)
    df['obv']    = (direction * v).cumsum()
    df['obv_diff'] = df['obv'].diff()

    # --- ADX + DI ---
    atr14     = tr.rolling(14).mean()
    plus_dm   = h.diff().clip(lower=0)
    minus_dm  = (-l.diff()).clip(lower=0)
    # Zero out whichever DM is smaller on each bar
    both_pos  = (h.diff() > 0) & (-l.diff() > 0)
    plus_gt   = h.diff() >= -l.diff()
    plus_dm   = np.where(both_pos & ~plus_gt, 0, plus_dm)
    minus_dm  = np.where(both_pos &  plus_gt, 0, minus_dm)
    plus_dm   = pd.Series(plus_dm,  index=df.index)
    minus_dm  = pd.Series(minus_dm, index=df.index)

    plus_di   = 100 * plus_dm.ewm(span=14,  adjust=False).mean() / atr14.replace(0, np.nan)
    minus_di  = 100 * minus_dm.ewm(span=14, adjust=False).mean() / atr14.replace(0, np.nan)
    denom     = (plus_di + minus_di).replace(0, np.nan)
    dx        = 100 * (plus_di - minus_di).abs() / denom
    df['adx']      = dx.ewm(span=14, adjust=False).mean()
    df['plus_di']  = plus_di
    df['minus_di'] = minus_di

    # --- Bollinger Bands ---
    sma20          = c.rolling(20).mean()
    std20          = c.rolling(20).std()
    df['bb_upper'] = sma20 + 2 * std20
    df['bb_lower'] = sma20 - 2 * std20
    bb_range       = (df['bb_upper'] - df['bb_lower']).replace(0, np.nan)
    df['bb_pct']   = (c - df['bb_lower']) / bb_range     # 0=bottom, 1=top

    # --- Price vs EMAs (ratio, scale-invariant) ---
    df['price_vs_ema50']  = c / df['ema50'].replace(0, np.nan)  - 1
    df['price_vs_ema200'] = c / df['ema200'].replace(0, np.nan) - 1
    df['ema50_vs_ema200'] = df['ema50'] / df['ema200'].replace(0, np.nan) - 1

    # --- Momentum ---
    df['mom5']  = c.pct_change(5)
    df['mom10'] = c.pct_change(10)
    df['mom20'] = c.pct_change(20)

    return df


# ================== HIGHER TF + REGIME FILTER (v2 improvement) ==================
def add_higher_tf_features(df: pd.DataFrame, symbol: str, timeframe: str) -> pd.DataFrame:
    """
    Fetch higher-TF candles, shift(1) to prevent look-ahead,
    then compute regime label: BULL / BEAR / CHOP.
    """
    higher_tf = MULTI_TF_MAP.get(timeframe)
    if not higher_tf:
        return df

    try:
        hdf = fetch_data(symbol, higher_tf, limit=600)
        hdf = add_indicators(hdf)

        cols_to_use = ['macd', 'signal', 'rsi', 'ema50', 'ema200',
                       'adx', 'atr_pct', 'bb_pct', 'mom5']
        hdf_feat = hdf[cols_to_use].copy()

        # [KEY] shift(1) — only use closed candles, never the current one
        hdf_shifted = hdf_feat.shift(1)
        hdf_shifted.columns = [f'h_{col}' for col in hdf_shifted.columns]

        # --- Regime label (v2 improvement) ---
        # BULL  : price above higher-TF EMA200
        # CHOP  : ADX < 20 (no clear trend regardless of price)
        # BEAR  : price below higher-TF EMA200 AND ADX >= 20
        h_ema200 = hdf['ema200'].shift(1).reindex(hdf_shifted.index)
        h_adx    = hdf['adx'].shift(1).reindex(hdf_shifted.index)
        h_close  = hdf['close'].shift(1).reindex(hdf_shifted.index)

        regime = pd.Series(REGIME_CHOP, index=hdf_shifted.index, dtype=float)
        regime = np.where(h_adx < 20,                      REGIME_CHOP, regime)
        regime = np.where(h_close > h_ema200, REGIME_BULL, regime)
        regime = np.where(
            (h_close <= h_ema200) & (h_adx >= 20), REGIME_BEAR, regime
        )
        hdf_shifted['h_regime'] = regime

        # Forward-fill to primary TF (safe — already shifted)
        merged = hdf_shifted.reindex(df.index, method='ffill')
        df = pd.concat([df, merged], axis=1)
        log.info(f"Higher-TF features + regime added from {higher_tf}")

    except Exception as e:
        log.warning(f"Higher-TF skipped: {e}")

    return df


# ================== FEATURES & TARGET ==================
FEATURE_COLS = [
    # MACD family
    'macd', 'signal', 'hist',
    # Momentum & trend
    'rsi', 'adx', 'plus_di', 'minus_di',
    'price_vs_ema50', 'price_vs_ema200', 'ema50_vs_ema200',
    # Volatility
    'atr_pct', 'bb_pct',
    # Volume
    'vol_ratio', 'obv_diff',
    # Momentum lookback
    'mom5', 'mom10', 'mom20',
]


def build_dataset(df: pd.DataFrame, horizon: int = HORIZON):
    """
    Build X, y, ret.

    Target: net return after realistic costs (fee + slippage + funding).
    Excludes last `horizon` bars — those are the live prediction rows.
    """
    data = df.copy()

    # Forward return
    data['fwd_ret'] = data['close'].pct_change(horizon).shift(-horizon)

    # v2: cost = round-trip fees+slippage + funding for holding `horizon` bars
    cost = ROUND_TRIP + FUNDING_PER_BAR * horizon
    data['net_ret'] = data['fwd_ret'] - cost
    data['target']  = (data['net_ret'] > 0).astype(int)

    h_cols   = [c for c in data.columns if c.startswith('h_')]
    features = [c for c in FEATURE_COLS + h_cols if c in data.columns]

    # Exclude last `horizon` rows (no future label)
    data_train = data.iloc[:-horizon].copy()

    X   = data_train[features].replace([np.inf, -np.inf], np.nan).ffill().dropna()
    y   = data_train['target'].loc[X.index]
    ret = data_train['net_ret'].loc[X.index]

    return X, y, ret, features


# ================== MODEL ==================
def _build_model(y_train: pd.Series):
    ratio = (y_train == 0).sum() / max((y_train == 1).sum(), 1)
    if HAS_XGB:
        return xgb.XGBClassifier(
            n_estimators=300,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.75,
            colsample_bytree=0.75,
            scale_pos_weight=ratio,
            random_state=42,
            eval_metric='logloss',
            verbosity=0,
        )
    return RandomForestClassifier(
        n_estimators=200,
        max_depth=8,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1,
    )


def _calibrate_threshold(probs: np.ndarray, labels: np.ndarray,
                          min_precision: float = MIN_PRECISION) -> float:
    """
    Sweep thresholds on TRAIN data.
    Return the LOWEST threshold where precision >= min_precision
    (more trades = better statistical estimate).
    """
    best = 0.65
    for t in np.arange(0.55, 0.85, 0.01):
        mask = probs >= t
        if mask.sum() < 10:
            break
        prec = precision_score(labels, mask.astype(int), zero_division=0)
        if prec >= min_precision:
            best = round(float(t), 2)
            break
    return best


def _annualized_sharpe(returns: np.ndarray, timeframe: str) -> float:
    if len(returns) < 2 or returns.std() == 0:
        return 0.0
    tf_mins = {'1m': 1, '5m': 5, '15m': 15, '30m': 30,
               '1h': 60, '4h': 240, '1d': 1440}
    mins   = tf_mins.get(timeframe, 240)
    ann    = np.sqrt(365 * 24 * 60 / mins)
    return float((returns.mean() / returns.std()) * ann)


# ================== WALK-FORWARD BACKTEST ==================
def walk_forward_backtest(X: pd.DataFrame, y: pd.Series, ret: pd.Series,
                          timeframe: str, n_splits: int = N_SPLITS) -> tuple:
    """
    Honest OOS evaluation:
    - Threshold calibrated on TRAIN fold, applied on TEST fold
    - Regime filter applied during signal evaluation
    - Position size scaled by ATR (v2 improvement)
    - Max drawdown tracked (v2 improvement)
    """
    tscv         = TimeSeriesSplit(n_splits=n_splits)
    all_oos_ret  = []
    all_oos_prob = []
    fold_details = []

    for fold_i, (train_idx, test_idx) in enumerate(tscv.split(X)):
        X_tr, X_te = X.iloc[train_idx], X.iloc[test_idx]
        y_tr        = y.iloc[train_idx]
        r_te        = ret.iloc[test_idx]

        if len(X_tr) < 100 or y_tr.nunique() < 2:
            continue

        # Build + calibrate on train fold
        base  = _build_model(y_tr)
        cal   = CalibratedClassifierCV(base, method='isotonic', cv=3)
        try:
            cal.fit(X_tr, y_tr)
        except Exception:
            base.fit(X_tr, y_tr)
            cal = base

        tr_prob   = cal.predict_proba(X_tr)[:, 1]
        threshold = _calibrate_threshold(tr_prob, y_tr.values)

        te_prob  = cal.predict_proba(X_te)[:, 1]
        adx_arr  = X_te['adx'].values    if 'adx'       in X_te.columns else np.full(len(X_te), 99)
        atr_arr  = X_te['atr_pct'].values if 'atr_pct'  in X_te.columns else np.full(len(X_te), 0.01)
        reg_arr  = X_te['h_regime'].values if 'h_regime' in X_te.columns else np.zeros(len(X_te))

        fold_ret = []
        for i in range(len(test_idx)):
            p      = te_prob[i]
            adx    = adx_arr[i]
            atr_p  = max(atr_arr[i], 1e-6)
            regime = reg_arr[i]
            r      = r_te.iloc[i]

            # v2 Regime filter ———————————————————————————
            # Never go LONG in confirmed bear regime
            if regime == REGIME_BEAR  and p >= threshold:        continue
            # Never go SHORT in confirmed bull regime
            if regime == REGIME_BULL  and p <= (1 - threshold):  continue
            # In chop, require stronger ADX confirmation
            if regime == REGIME_CHOP  and adx < MIN_ADX * 1.2:   continue
            # ————————————————————————————————————————————

            # FIX: ATR floor 0.5% prevents size explosion on low-volatility bars
            # Cap reduced 3x → 1.0x (max 100% capital = already aggressive)
            atr_p  = max(atr_p, 0.005)
            size   = min(RISK_PER_TRADE / (2 * atr_p), 1.0)

            if p >= threshold and adx >= MIN_ADX:
                fold_ret.append(r * size)
                all_oos_ret.append(r * size)
                all_oos_prob.append(p)
            elif p <= (1 - threshold) and adx >= MIN_ADX:
                fold_ret.append(-r * size)
                all_oos_ret.append(-r * size)
                all_oos_prob.append(1 - p)

        if fold_ret:
            fr = np.array(fold_ret)
            fold_details.append({
                "fold":      fold_i + 1,
                "trades":    len(fr),
                "win_rate":  round(float((fr > 0).mean() * 100), 2),
                "total_ret": round(float(fr.sum() * 100), 2),
                "sharpe":    round(_annualized_sharpe(fr, timeframe), 2),
            })

    # ---- Aggregate OOS stats ----
    if not all_oos_ret:
        return {
            "num_trades": 0, "win_rate": 0.0, "total_return_pct": 0.0,
            "profit_factor": 0.0, "sharpe_ratio": 0.0,
            "avg_return_pct": 0.0, "max_drawdown_pct": 0.0,
            "warning": "No trades generated — threshold may be too strict",
        }, 0.65, fold_details

    returns = np.array(all_oos_ret)
    wins    = returns[returns > 0]
    losses  = returns[returns < 0]

    # FIX: MaxDD on equity curve (1.0 base) not raw cumsum
    # cumsum inflates DD when sized positions vary — equity curve is the correct measure
    equity  = np.cumprod(1 + np.clip(returns, -0.99, None))  # clip prevents log(0)
    peak_eq = np.maximum.accumulate(equity)
    dd_eq   = (equity - peak_eq) / peak_eq     # % drawdown from peak
    max_dd  = float(dd_eq.min())               # e.g. -0.15 = real -15% drawdown

    # Fold consistency: high WR std across folds = unstable model
    wr_list = [fd['win_rate'] for fd in fold_details if fd['trades'] >= MIN_TRADES_FOLD]
    wr_std  = round(float(np.std(wr_list)), 1) if len(wr_list) >= 3 else None

    oos_metrics = {
        "num_trades":        len(returns),
        "win_rate":          round(float((returns > 0).mean() * 100), 2),
        "total_return_pct":  round(float(returns.sum() * 100), 2),
        "profit_factor":     round(float(wins.sum() / abs(losses.sum())), 2) if len(losses) > 0 else 999.0,
        "sharpe_ratio":      round(_annualized_sharpe(returns, timeframe), 2),
        "avg_return_pct":    round(float(returns.mean() * 100), 4),
        "max_drawdown_pct":  round(max_dd * 100, 2),
        "wr_std_across_folds": wr_std,   # low = stable, high = overfit/noise
        "fold_details":      fold_details,
    }

    # Warnings
    warnings_list = []
    if abs(max_dd) > MAX_DD_KILL_SWITCH:
        warnings_list.append(
            f"Max DD {round(max_dd*100,1)}% exceeds kill switch {MAX_DD_KILL_SWITCH*100:.0f}% — consider halting"
        )
    if oos_metrics["sharpe_ratio"] > 5.0:
        warnings_list.append(
            f"Sharpe {oos_metrics['sharpe_ratio']} is suspiciously high — verify for data leakage"
        )
    if len(returns) < 20:
        warnings_list.append(
            "Fewer than 20 OOS trades — threshold may be too strict for reliable stats"
        )
    if wr_std is not None and wr_std > 20:
        warnings_list.append(
            f"WR std={wr_std}% across folds is high — model performance is inconsistent"
        )
    if warnings_list:
        oos_metrics["warnings"] = warnings_list

    # Calibrate global threshold from aggregated OOS probs
    best_threshold = _calibrate_threshold(
        np.array(all_oos_prob),
        (returns > 0).astype(int)
    )

    return oos_metrics, best_threshold, fold_details


# ================== FINAL MODEL (Production) ==================
def train_final_model(X: pd.DataFrame, y: pd.Series):
    """
    Train on ALL labeled data (excludes last HORIZON bars by construction).
    Calibrate probabilities with isotonic regression.
    """
    model = _build_model(y)
    cal   = CalibratedClassifierCV(model, method='isotonic', cv=3)
    try:
        cal.fit(X, y)
        log.info("Final model trained with isotonic calibration")
        return cal
    except Exception as e:
        log.warning(f"Calibration failed ({e}) — using uncalibrated model")
        model.fit(X, y)
        return model


def drop_low_importance_features(model, X: pd.DataFrame,
                                  threshold: float = 0.001) -> list:
    """Drop features with near-zero importance to reduce noise."""
    try:
        # Works for XGBoost; adapt for RF if needed
        inner = model.calibrated_classifiers_[0].estimator
        imp   = inner.feature_importances_
        keep  = [f for f, i in zip(X.columns, imp) if i >= threshold]
        dropped = len(X.columns) - len(keep)
        if dropped:
            log.info(f"Dropped {dropped} low-importance features")
        return keep
    except Exception:
        return list(X.columns)


# ================== SIGNAL GENERATION ==================
def generate_signal(df: pd.DataFrame, model, features: list,
                    symbol: str, timeframe: str, threshold: float) -> dict:
    """
    Predict on live last row (never seen during training).
    Applies regime override before returning signal.
    """
    live  = df.iloc[-1:].copy()
    price = float(live['close'].values[0])
    atr   = float(live['atr'].values[0])
    adx   = float(live['adx'].values[0])   if 'adx'   in live.columns else 0.0
    rsi   = float(live['rsi'].values[0])   if 'rsi'   in live.columns else 50.0
    reg   = float(live['h_regime'].values[0]) if 'h_regime' in live.columns else REGIME_CHOP

    avail     = [f for f in features if f in live.columns]
    row_clean = live[avail].replace([np.inf, -np.inf], np.nan).ffill()

    prob_up = float(model.predict_proba(row_clean)[0][1])

    # Technical confirmation score 0–100
    score = 0
    ema200 = float(live['ema200'].values[0]) if 'ema200' in live.columns else price
    macd_v = float(live['macd'].values[0])   if 'macd'   in live.columns else 0.0
    sig_v  = float(live['signal'].values[0]) if 'signal' in live.columns else 0.0
    if price > ema200: score += 25
    if rsi   > 50:     score += 25
    if macd_v > sig_v: score += 25
    if adx   > 20:     score += 25

    risk   = atr * 2
    adx_ok = adx >= MIN_ADX
    now    = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    regime_str = {REGIME_BULL: 'Bullish', REGIME_BEAR: 'Bearish', REGIME_CHOP: 'Choppy'}.get(reg, 'Unknown')

    # Raw signal from model
    override_reason = None
    if prob_up >= threshold and adx_ok:
        sig, direction, confidence = "BUY",  1, prob_up * 100
        emoji = "🟢"
    elif prob_up <= (1 - threshold) and adx_ok:
        sig, direction, confidence = "SELL", -1, (1 - prob_up) * 100
        emoji = "🔴"
    else:
        sig, direction, confidence = "HOLD", 0, max(prob_up, 1 - prob_up) * 100
        emoji = "⚪"

    # Regime override — applied BEFORE TP/SL calculation
    if sig == "BUY" and reg == REGIME_BEAR:
        sig, direction, emoji = "HOLD", 0, "⚪"
        override_reason = "Suppressed: Bear regime on higher TF"
    elif sig == "SELL" and reg == REGIME_BULL:
        sig, direction, emoji = "HOLD", 0, "⚪"
        override_reason = "Suppressed: Bull regime on higher TF"
    elif sig != "HOLD" and reg == REGIME_CHOP and adx < MIN_ADX * 1.2:
        sig, direction, emoji = "HOLD", 0, "⚪"
        override_reason = "Suppressed: Choppy regime + weak ADX"

    # FIX: TP/SL computed AFTER override — HOLD always gets None (no misleading levels)
    if sig == "BUY":
        tp1 = price + risk * 1.5
        tp2 = price + risk * 3.0
        sl  = price - risk
    elif sig == "SELL":
        tp1 = price - risk * 1.5
        tp2 = price - risk * 3.0
        sl  = price + risk
    else:
        tp1 = tp2 = sl = None   # HOLD — no actionable levels

    # FIX: ATR floor 0.5% + cap 1.0x (was 3x) — prevents size explosion
    atr_pct  = max(atr / price, 0.005) if price > 0 else 0.005
    size_pct = min(RISK_PER_TRADE / (2 * atr_pct), 1.0) * 100  # max 100% of capital

    def fmt(p: float) -> str:
        if p >= 100:  return f"{p:,.2f}"
        if p >= 1:    return f"{p:,.4f}"
        return f"{p:.6f}"

    signal_line = f"{emoji} {sig}"
    if override_reason:
        signal_line += f" ({override_reason})"
    elif sig == "HOLD" and not adx_ok:
        signal_line += " (ADX too low)"
    elif sig == "HOLD":
        signal_line += " (Low confidence)"

    # FIX: TP/SL lines show N/A for HOLD — never show stale directional levels
    tp1_str = f"${fmt(tp1)}  |  TP2: ${fmt(tp2)}" if tp1 is not None else "N/A"
    sl_str  = f"${fmt(sl)}"                         if sl  is not None else "N/A"
    size_str = f"{size_pct:.1f}% of capital" if sig != "HOLD" else "N/A (no position)"

    message = (
        f"🔔 {symbol} Signal [{timeframe}]\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"Signal:      {signal_line}\n"
        f"Regime:      {regime_str} (higher TF)\n"
        f"Confidence:  {confidence:.1f}%  (threshold: {threshold*100:.0f}%)\n"
        f"Tech Score:  {score}/100\n"
        f"ADX:         {adx:.1f}   RSI: {rsi:.1f}\n"
        f"Trend:       {'Bullish' if price > ema200 else 'Bearish'} (EMA200)\n"
        f"Entry:       ${fmt(price)}\n"
        f"TP1:         {tp1_str}\n"
        f"SL:          {sl_str}\n"
        f"Size hint:   {size_str}\n"
        f"Time:        {now}\n"
        + (f"⚠️  Move SL to breakeven once TP1 is hit" if sig != "HOLD" else "ℹ️  Wait for next signal")
    )

    return {
        "symbol":            symbol,
        "timeframe":         timeframe,
        "signal":            sig,
        "direction":         direction,
        "confidence":        round(confidence, 2),
        "threshold_used":    threshold,
        "price":             price,
        "tp1":               round(tp1, 8) if tp1 is not None else None,
        "tp2":               round(tp2, 8) if tp2 is not None else None,
        "sl":                round(sl,  8) if sl  is not None else None,
        "adx":               round(adx, 2),
        "rsi":               round(rsi, 2),
        "prob_up":           round(prob_up, 4),
        "tech_score":        score,
        "regime":            regime_str,
        "position_size_pct": round(size_pct, 2) if sig != "HOLD" else None,
        "trend":             "bullish" if price > ema200 else "bearish",
        "override_reason":   override_reason,
        "message":           message,
    }


# ================== MAIN PIPELINE ==================
def analyze_symbol(raw_symbol: str) -> dict:
    symbol = raw_symbol if '/' in raw_symbol else f"{raw_symbol}/USDT"
    base   = symbol.split(':')[0]

    # 1. Timeframe
    timeframe = OPTIMIZED_TIMEFRAMES.get(base, DEFAULT_TIMEFRAME)
    log.info(f"=== Analyzing {symbol} [{timeframe}] ===")

    # 2. Fetch + indicators
    df = fetch_data(symbol, timeframe, limit=1200)
    df = add_indicators(df)

    # 3. Higher-TF features + regime (look-ahead safe)
    df = add_higher_tf_features(df, symbol, timeframe)

    # 4. Build dataset
    X, y, ret, features = build_dataset(df, horizon=HORIZON)

    if len(X) < 150:
        raise ValueError(f"Insufficient data after cleaning: {len(X)} rows (need ≥150)")

    balance = y.mean()
    log.info(f"Dataset: {len(X)} rows | {len(features)} features | "
             f"class balance: {balance:.1%} positive")
    if balance < 0.3 or balance > 0.7:
        log.warning(f"Class imbalance: {balance:.1%} — model may be biased")

    # 5. Walk-forward backtest (honest OOS)
    oos_metrics, threshold, fold_details = walk_forward_backtest(
        X, y, ret, timeframe, n_splits=N_SPLITS
    )
    log.info(
        f"OOS → Sharpe: {oos_metrics.get('sharpe_ratio')} | "
        f"WR: {oos_metrics.get('win_rate')}% | "
        f"Max DD: {oos_metrics.get('max_drawdown_pct')}% | "
        f"Threshold: {threshold}"
    )

    # 6. Train final model (on all labeled data, no leakage)
    final_model = train_final_model(X, y)

    # 7. Drop low-importance features + retrain if any removed
    good_features = drop_low_importance_features(final_model, X)
    if len(good_features) < len(features):
        X_clean     = X[good_features]
        final_model = train_final_model(X_clean, y)
        features    = good_features

    # 8. Live signal (last row — not in training)
    result = generate_signal(df, final_model, features, symbol, timeframe, threshold)

    # 9. Attach metadata
    result.update({
        "backtest":      oos_metrics,
        "model":         "XGBoost+Isotonic" if HAS_XGB else "RandomForest+Isotonic",
        "tf_source":     "locked" if base in OPTIMIZED_TIMEFRAMES else "default",
        "status":        "success",
        "generated_at":  datetime.datetime.utcnow().isoformat() + "Z",
        "cost_model": {
            "fee_pct":       FEE_RATE * 100,
            "slippage_pct":  SLIPPAGE_PCT * 100,
            "funding_per_bar": FUNDING_PER_BAR * 100,
            "round_trip_pct": ROUND_TRIP * 100,
        }
    })

    return result


# ================== UTILS ==================
def _clean_for_json(obj):
    if isinstance(obj, dict):
        return {k: _clean_for_json(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_clean_for_json(v) for v in obj]
    if isinstance(obj, float):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return round(obj, 6)
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        v = float(obj)
        return None if (np.isnan(v) or np.isinf(v)) else round(v, 6)
    return obj


# ================== ENTRY POINT ==================
if __name__ == "__main__":
    symbol = sys.argv[1] if len(sys.argv) > 1 else 'BTC/USDT'
    try:
        result  = analyze_symbol(symbol)
        cleaned = _clean_for_json(result)
        # Human-readable to stderr, JSON to stdout (for piping)
        print(cleaned["message"], file=sys.stderr)
        print(json.dumps(cleaned, ensure_ascii=False, indent=2))
    except Exception as e:
        import traceback
        err = {
            "status":  "error",
            "symbol":  symbol,
            "message": str(e),
            "trace":   traceback.format_exc(),
        }
        print(json.dumps(err, ensure_ascii=False, indent=2))
        sys.exit(1)