#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
XAUUSD Signal Engine — Production v3
Timeframe: 1H only (สำหรับ cron job)
Output: เหมือนเดิมทุก field (probability, price, tp, sl + extras)

Engine: v3 (RSI + MACD + SMA + ADX + BB + S/R)
Filters: Trend (SMA200) + Session (London/NY) + ADX + BB + EMA cross
Risk: Trailing stop logic, min R:R 1.8, signal threshold 0.63
"""

import pandas as pd
import numpy as np
import json
import sys
import os
import time
import sqlite3
import logging
from datetime import datetime
from dataclasses import dataclass, asdict
from typing import Optional
from twelvedata import TDClient
from dotenv import load_dotenv

load_dotenv()
TWELVEDATA_API_KEY = os.getenv("TWELVEDATA_API_KEY")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stderr),
        logging.FileHandler("xauusd_signals.log", encoding="utf-8")
    ]
)
logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# DEFAULT PARAMETERS
# ──────────────────────────────────────────────

DEFAULT_PARAMS = {
    # Indicators
    "rsi_period": 14,
    "sma_short": 20,
    "sma_long": 50,
    "atr_period": 14,
    "macd_fast": 12,
    "macd_slow": 26,
    "macd_signal": 9,
    "ema_fast": 9,
    "ema_slow": 21,
    "adx_period": 14,
    "bb_period": 20,
    "bb_std": 2.0,
    "sr_lookback": 50,
    "sr_proximity_pct": 0.003,

    # Signal weights
    "rsi_weight":  0.20,
    "macd_weight": 0.20,
    "sma_weight":  0.15,
    "sr_weight":   0.15,
    "adx_weight":  0.15,
    "bb_weight":   0.15,

    # Signal gates
    "signal_threshold": 0.63,
    "min_rr_ratio": 1.8,

    # TP/SL
    "tp_multiplier": 2.5,
    "sl_multiplier": 1.0,

    # Filter thresholds
    "adx_threshold": 20,
    "bb_squeeze_pct": 0.05,
    "trend_sma_period": 200,
    "london_open": 7,
    "london_close": 16,
    "ny_open": 13,
    "ny_close": 21,
}

# ──────────────────────────────────────────────
# OUTPUT DATACLASS — เหมือนเดิมทุก field
# ──────────────────────────────────────────────

@dataclass
class SignalResult:
    # ── Original fields (ไม่เปลี่ยนแปลง) ──
    timestamp: str
    pair: str
    signal: str        # BUY / SELL / NEUTRAL
    probability: float
    price: float
    tp: float
    sl: float
    rr_ratio: float
    confidence: str    # HIGH / MEDIUM / LOW
    timeframe_agreement: bool
    indicators: dict
    sr_levels: dict
    notes: list
    params_used: dict

# ──────────────────────────────────────────────
# DATABASE — USER PARAMETERS
# ──────────────────────────────────────────────

def load_user_params_from_db(line_user_id: str = "default") -> dict:
    db_path = os.path.join(os.path.dirname(__file__), "../../data/trading_bot.db")
    try:
        if not os.path.exists(db_path):
            return DEFAULT_PARAMS.copy()
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE lineUserId = ?", (line_user_id,))
        user = cur.fetchone()
        if not user:
            conn.close()
            return DEFAULT_PARAMS.copy()
        cur.execute(
            """SELECT rsiPeriod, smaShort, smaLong, atrPeriod,
                      macdFast, macdSlow, macdSignal,
                      rsiWeight, macdWeight, smaWeight, srWeight,
                      tpMultiplier, slMultiplier, minRRRatio, signalThreshold
               FROM trading_parameters WHERE userId = ?""",
            (user[0],)
        )
        row = cur.fetchone()
        conn.close()
        if row:
            keys = [
                "rsi_period", "sma_short", "sma_long", "atr_period",
                "macd_fast", "macd_slow", "macd_signal",
                "rsi_weight", "macd_weight", "sma_weight", "sr_weight",
                "tp_multiplier", "sl_multiplier", "min_rr_ratio", "signal_threshold"
            ]
            return {**DEFAULT_PARAMS, **dict(zip(keys, row))}
    except Exception as e:
        logger.warning(f"Could not load user params from DB: {e}")
    return DEFAULT_PARAMS.copy()

# ──────────────────────────────────────────────
# INDICATORS
# ──────────────────────────────────────────────

def calc_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0).ewm(com=period - 1, adjust=False).mean()
    loss = (-delta.clip(upper=0)).ewm(com=period - 1, adjust=False).mean()
    rs = gain / loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))

def calc_macd(series, fast, slow, signal):
    ema_f = series.ewm(span=fast, adjust=False).mean()
    ema_s = series.ewm(span=slow, adjust=False).mean()
    macd = ema_f - ema_s
    sig  = macd.ewm(span=signal, adjust=False).mean()
    return macd, sig, macd - sig

def calc_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    hl = df["high"] - df["low"]
    hc = (df["high"] - df["close"].shift()).abs()
    lc = (df["low"]  - df["close"].shift()).abs()
    tr = pd.concat([hl, hc, lc], axis=1).max(axis=1)
    return tr.ewm(span=period, adjust=False).mean()

def calc_adx(df: pd.DataFrame, period: int = 14) -> tuple:
    high, low = df["high"], df["low"]
    plus_dm  = high.diff().clip(lower=0)
    minus_dm = (-low.diff()).clip(lower=0)
    plus_dm  = plus_dm.where(plus_dm > minus_dm, 0)
    minus_dm = minus_dm.where(minus_dm > plus_dm, 0)
    atr_s    = calc_atr(df, period)
    plus_di  = 100 * plus_dm.ewm(span=period, adjust=False).mean() / atr_s.replace(0, np.nan)
    minus_di = 100 * minus_dm.ewm(span=period, adjust=False).mean() / atr_s.replace(0, np.nan)
    dx  = (100 * (plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan))
    adx = dx.ewm(span=period, adjust=False).mean()
    return adx, plus_di, minus_di

def calc_bb(series, period=20, std_dev=2.0):
    mid   = series.rolling(period).mean()
    std   = series.rolling(period).std()
    upper = mid + std_dev * std
    lower = mid - std_dev * std
    bw    = (upper - lower) / mid.replace(0, np.nan)
    return upper, mid, lower, bw

# ──────────────────────────────────────────────
# SCORING
# ──────────────────────────────────────────────

def score_rsi(rsi: float) -> float:
    if rsi < 20:    return  1.0
    elif rsi < 30:  return  0.85
    elif rsi < 40:  return  0.5
    elif rsi < 45:  return  0.2
    elif rsi <= 55: return  0.0
    elif rsi <= 60: return -0.2
    elif rsi <= 70: return -0.5
    elif rsi <= 80: return -0.85
    else:           return -1.0

def score_macd(macd_val, sig_val, hist, prev_hist) -> float:
    score = 0.4 if macd_val > sig_val else -0.4
    if   hist > 0 and hist > prev_hist:   score += 0.6
    elif hist > 0:                         score += 0.2
    elif hist < 0 and hist < prev_hist:   score -= 0.6
    elif hist < 0:                         score -= 0.2
    return max(-1.0, min(1.0, score))

def score_sma(price, sma_s, sma_l) -> float:
    score  = 0.3 if price > sma_s else -0.3
    score += 0.2 if price > sma_l else -0.2
    score += 0.5 if sma_s > sma_l else -0.5
    return max(-1.0, min(1.0, score))

def score_adx(adx, plus_di, minus_di) -> float:
    if   adx < 20: strength = 0.0
    elif adx < 25: strength = 0.3
    elif adx < 35: strength = 0.7
    else:          strength = 1.0
    direction = 1 if plus_di > minus_di else -1
    return max(-1.0, min(1.0, strength * direction * 0.8))

def score_bb(price, upper, lower, mid, bw, squeeze_pct=0.05) -> float:
    band_range = upper - lower
    if band_range <= 0: return 0.0
    pos   = (price - lower) / band_range
    score = 1.0 - (2.0 * pos)
    if bw < squeeze_pct:
        score = max(-1.0, min(1.0, score * 1.5))
    return score

def score_sr(price, support, resistance, prox=0.003) -> float:
    rng = resistance - support
    if rng <= 0: return 0.0
    pos   = (price - support) / rng
    score = 1.0 - (2.0 * pos)
    if abs(price - support)    / price < prox: score = min(1.0,  score + 0.4)
    if abs(price - resistance) / price < prox: score = max(-1.0, score - 0.4)
    return score

# ──────────────────────────────────────────────
# SUPPORT / RESISTANCE
# ──────────────────────────────────────────────

def find_support_resistance(df: pd.DataFrame, lookback: int = 50) -> dict:
    recent = df.tail(lookback).copy()
    price  = float(df["close"].iloc[-1])
    highs, lows = [], []

    for i in range(2, len(recent) - 2):
        h = recent["high"].iloc[i]
        l = recent["low"].iloc[i]
        if h > recent["high"].iloc[i-1] and h > recent["high"].iloc[i-2] \
           and h > recent["high"].iloc[i+1] and h > recent["high"].iloc[i+2]:
            highs.append(h)
        if l < recent["low"].iloc[i-1]  and l < recent["low"].iloc[i-2] \
           and l < recent["low"].iloc[i+1]  and l < recent["low"].iloc[i+2]:
            lows.append(l)

    def cluster(levels, tol=0.002):
        if not levels: return []
        levels = sorted(levels)
        cls = [[levels[0]]]
        for v in levels[1:]:
            if (v - cls[-1][-1]) / cls[-1][-1] < tol: cls[-1].append(v)
            else: cls.append([v])
        return [np.mean(c) for c in cls]

    res = sorted([r for r in cluster(highs) if r > price])
    sup = sorted([s for s in cluster(lows)  if s < price], reverse=True)

    return {
        "nearest_support":    round(sup[0] if sup else price * 0.995, 2),
        "nearest_resistance": round(res[0] if res else price * 1.005, 2),
        "all_supports":       [round(s, 2) for s in sup[:3]],
        "all_resistances":    [round(r, 2) for r in res[:3]],
    }

# ──────────────────────────────────────────────
# DATA FETCH
# ──────────────────────────────────────────────

def fetch_ohlcv(symbol: str, interval: str, outputsize: int = 150,
                max_retries: int = 3, retry_delay: float = 5.0) -> pd.DataFrame:
    td = TDClient(apikey=TWELVEDATA_API_KEY)
    for attempt in range(1, max_retries + 1):
        try:
            time.sleep(1.5)
            df = td.time_series(symbol=symbol, interval=interval,
                                outputsize=outputsize).as_pandas().iloc[::-1].copy()
            for col in ["open", "high", "low", "close"]:
                df[col] = df[col].astype(float)
            if "volume" in df.columns:
                df["volume"] = df["volume"].astype(float)
            return df
        except Exception as e:
            logger.warning(f"Fetch attempt {attempt}/{max_retries} failed: {e}")
            if attempt < max_retries:
                time.sleep(retry_delay * attempt)
            else:
                raise RuntimeError(f"Failed to fetch {symbol} {interval}: {e}")

# ──────────────────────────────────────────────
# FILTERS
# ──────────────────────────────────────────────

def is_in_session(ts, lo=7, lc=16, no=13, nc=21) -> bool:
    if not hasattr(ts, "hour"): return True
    h = ts.hour
    return (lo <= h < lc) or (no <= h < nc)

# ──────────────────────────────────────────────
# MAIN SIGNAL ENGINE
# ──────────────────────────────────────────────

def get_signal(pair_code: str = "XAUUSD",
               line_user_id: str = "default") -> SignalResult:

    params = load_user_params_from_db(line_user_id)
    p      = params
    notes  = []
    now    = datetime.utcnow().isoformat() + "Z"

    symbol_map = {"XAUUSD": "XAU/USD", "BTCUSD": "BTC/USD"}
    symbol = symbol_map.get(pair_code, "XAU/USD")

    if not TWELVEDATA_API_KEY:
        raise EnvironmentError("TWELVEDATA_API_KEY not set in .env")

    logger.info(f"Fetching {symbol} 1H...")
    df = fetch_ohlcv(symbol, "1h", outputsize=250)

    # ── Calculate all indicators ──
    df["rsi"]       = calc_rsi(df["close"], p["rsi_period"])
    df["sma_short"] = df["close"].rolling(p["sma_short"]).mean()
    df["sma_long"]  = df["close"].rolling(p["sma_long"]).mean()
    df["ema_fast"]  = df["close"].ewm(span=p["ema_fast"], adjust=False).mean()
    df["ema_slow"]  = df["close"].ewm(span=p["ema_slow"], adjust=False).mean()
    df["macd"], df["macd_sig"], df["macd_hist"] = calc_macd(
        df["close"], p["macd_fast"], p["macd_slow"], p["macd_signal"]
    )
    df["atr"] = calc_atr(df, p["atr_period"])
    df["adx"], df["plus_di"], df["minus_di"] = calc_adx(df, p["adx_period"])
    df["bb_upper"], df["bb_mid"], df["bb_lower"], df["bb_bw"] = calc_bb(
        df["close"], p["bb_period"], p["bb_std"]
    )
    df["sma200"] = df["close"].rolling(p["trend_sma_period"]).mean()
    df = df.bfill().ffill()

    # ── Latest values ──
    last = df.iloc[-1]
    prev = df.iloc[-2]

    price     = float(last["close"])
    rsi       = float(last["rsi"])
    sma_s     = float(last["sma_short"])
    sma_l     = float(last["sma_long"])
    ema_f     = float(last["ema_fast"])
    ema_s_val = float(last["ema_slow"])
    macd_val  = float(last["macd"])
    macd_sig  = float(last["macd_sig"])
    macd_hist = float(last["macd_hist"])
    prev_hist = float(prev["macd_hist"])
    atr       = float(last["atr"])
    adx       = float(last["adx"])
    plus_di   = float(last["plus_di"])
    minus_di  = float(last["minus_di"])
    bb_upper  = float(last["bb_upper"])
    bb_lower  = float(last["bb_lower"])
    bb_mid    = float(last["bb_mid"])
    bb_bw     = float(last["bb_bw"])
    sma200    = float(last["sma200"])

    # ── S/R ──
    sr = find_support_resistance(df, p["sr_lookback"])

    # ── Scores ──
    s_rsi  = score_rsi(rsi)
    s_macd = score_macd(macd_val, macd_sig, macd_hist, prev_hist)
    s_sma  = score_sma(price, sma_s, sma_l)
    s_adx  = score_adx(adx, plus_di, minus_di)
    s_bb   = score_bb(price, bb_upper, bb_lower, bb_mid, bb_bw, p["bb_squeeze_pct"])
    s_sr   = score_sr(price, sr["nearest_support"], sr["nearest_resistance"],
                      p["sr_proximity_pct"])

    # ── Composite score ──
    total_w = (p["rsi_weight"] + p["macd_weight"] + p["sma_weight"] +
               p["sr_weight"]  + p["adx_weight"]  + p["bb_weight"])
    raw_score = (
        s_rsi  * p["rsi_weight"]  +
        s_macd * p["macd_weight"] +
        s_sma  * p["sma_weight"]  +
        s_sr   * p["sr_weight"]   +
        s_adx  * p["adx_weight"]  +
        s_bb   * p["bb_weight"]
    ) / total_w

    prob_up = float(np.clip(0.5 + raw_score * 0.5, 0.0, 1.0))

    # ── Filters ──
    thr = p["signal_threshold"]

    # Trend filter (SMA200)
    trend_bull = price > sma200 * 1.003
    trend_bear = price < sma200 * 0.997

    # EMA cross
    ema_bull = ema_f > ema_s_val

    # ADX filter
    adx_ok = adx >= p["adx_threshold"]

    # BB filter
    near_lower = price <= bb_lower * 1.005
    near_upper = price >= bb_upper * 0.995
    squeeze    = bb_bw < p["bb_squeeze_pct"]

    # Session filter
    try:
        ts = df.index[-1]
        if hasattr(ts, "to_pydatetime"):
            ts = ts.to_pydatetime()
        session_ok = is_in_session(ts, p["london_open"], p["london_close"],
                                   p["ny_open"], p["ny_close"])
    except Exception:
        session_ok = True

    # ── Determine signal ──
    raw_signal = "NEUTRAL"
    if prob_up >= thr:
        raw_signal = "BUY"
    elif prob_up <= (1 - thr):
        raw_signal = "SELL"

    # Apply filters
    signal = raw_signal
    filter_notes = []

    if signal == "BUY":
        if not trend_bull:
            signal = "NEUTRAL"
            filter_notes.append("⚠️ BUY blocked: price below SMA200 (downtrend)")
        elif not ema_bull:
            signal = "NEUTRAL"
            filter_notes.append("⚠️ BUY blocked: EMA9 < EMA21 (bearish momentum)")
        elif not adx_ok:
            signal = "NEUTRAL"
            filter_notes.append(f"⚠️ BUY blocked: ADX {round(adx,1)} < {p['adx_threshold']} (weak trend)")
        elif not (near_lower or squeeze):
            signal = "NEUTRAL"
            filter_notes.append("⚠️ BUY blocked: price not near BB lower or squeeze")
        elif not session_ok:
            signal = "NEUTRAL"
            filter_notes.append("⚠️ BUY blocked: outside London/NY session")

    elif signal == "SELL":
        if not trend_bear:
            signal = "NEUTRAL"
            filter_notes.append("⚠️ SELL blocked: price above SMA200 (uptrend)")
        elif ema_bull:
            signal = "NEUTRAL"
            filter_notes.append("⚠️ SELL blocked: EMA9 > EMA21 (bullish momentum)")
        elif not adx_ok:
            signal = "NEUTRAL"
            filter_notes.append(f"⚠️ SELL blocked: ADX {round(adx,1)} < {p['adx_threshold']} (weak trend)")
        elif not (near_upper or squeeze):
            signal = "NEUTRAL"
            filter_notes.append("⚠️ SELL blocked: price not near BB upper or squeeze")
        elif not session_ok:
            signal = "NEUTRAL"
            filter_notes.append("⚠️ SELL blocked: outside London/NY session")

    notes.extend(filter_notes)

    # ── TP / SL ──
    if signal == "BUY":
        tp = price + p["tp_multiplier"] * atr
        sl = price - p["sl_multiplier"] * atr
    elif signal == "SELL":
        tp = price - p["tp_multiplier"] * atr
        sl = price + p["sl_multiplier"] * atr
    else:
        tp = price + p["tp_multiplier"] * atr
        sl = price - p["sl_multiplier"] * atr

    # Snap TP to nearest S/R
    if signal == "BUY"  and sr["nearest_resistance"] < tp:
        notes.append(f"ℹ️ TP snapped to resistance {sr['nearest_resistance']}")
        tp = sr["nearest_resistance"]
    if signal == "SELL" and sr["nearest_support"] > tp:
        notes.append(f"ℹ️ TP snapped to support {sr['nearest_support']}")
        tp = sr["nearest_support"]

    # ── R:R validation ──
    risk   = abs(price - sl)
    reward = abs(tp - price)
    rr     = round(reward / risk, 2) if risk > 0 else 0.0

    if rr < p["min_rr_ratio"] and signal != "NEUTRAL":
        notes.append(f"⚠️ R:R {rr} ต่ำกว่า minimum {p['min_rr_ratio']} — signal ยังคงส่งแต่ควรระวัง")

    # ── Confidence ──
    abs_score = abs(raw_score)
    if adx_ok and abs_score > 0.4:
        confidence = "HIGH"
    elif abs_score > 0.25:
        confidence = "MEDIUM"
    else:
        confidence = "LOW"

    # ── Extreme warnings ──
    if rsi > 75:
        notes.append("⚠️ RSI 1H Overbought — BUY risk สูง")
    elif rsi < 25:
        notes.append("⚠️ RSI 1H Oversold — SELL risk สูง")
    if adx < 20:
        notes.append("ℹ️ ADX ต่ำ — trend อ่อน signal อาจ noise")

    # timeframe_agreement: ใช้ ADX direction agreement แทน 4H (1H only mode)
    # plus_di > minus_di = bullish trend ตรงกับ signal หรือเปล่า
    tf_agree = (signal == "BUY"  and plus_di > minus_di) or \
               (signal == "SELL" and minus_di > plus_di) or \
               (signal == "NEUTRAL")

    result = SignalResult(
        timestamp=now,
        pair=pair_code,
        signal=signal,
        probability=round(prob_up, 4),
        price=round(price, 2),
        tp=round(float(tp), 2),
        sl=round(float(sl), 2),
        rr_ratio=rr,
        confidence=confidence,
        timeframe_agreement=tf_agree,
        indicators={
            "1H": {
                "rsi":         round(rsi, 2),
                "sma_short":   round(sma_s, 2),
                "sma_long":    round(sma_l, 2),
                "sma200":      round(sma200, 2),
                "ema_fast":    round(ema_f, 2),
                "ema_slow":    round(ema_s_val, 2),
                "macd":        round(macd_val, 4),
                "macd_signal": round(macd_sig, 4),
                "macd_hist":   round(macd_hist, 4),
                "atr":         round(atr, 4),
                "adx":         round(adx, 2),
                "plus_di":     round(plus_di, 2),
                "minus_di":    round(minus_di, 2),
                "bb_upper":    round(bb_upper, 2),
                "bb_lower":    round(bb_lower, 2),
                "bb_bw":       round(bb_bw, 4),
                "scores": {
                    "rsi":  round(s_rsi,  3),
                    "macd": round(s_macd, 3),
                    "sma":  round(s_sma,  3),
                    "adx":  round(s_adx,  3),
                    "bb":   round(s_bb,   3),
                    "sr":   round(s_sr,   3),
                }
            }
        },
        sr_levels={"1H": sr},
        notes=notes,
        params_used=params,
    )

    logger.info(
        f"[{pair_code}] {signal} | prob={round(prob_up,3)} | "
        f"price={round(price,2)} TP={round(float(tp),2)} SL={round(float(sl),2)} "
        f"R:R={rr} | conf={confidence} | adx={round(adx,1)} | "
        f"filters_passed={len(filter_notes)==0}"
    )

    return result

# ──────────────────────────────────────────────
# ENTRY POINT
# ──────────────────────────────────────────────

if __name__ == "__main__":
    pair        = sys.argv[1] if len(sys.argv) > 1 else "XAUUSD"
    line_user_id = sys.argv[2] if len(sys.argv) > 2 else "default"

    try:
        result = get_signal(pair, line_user_id)
        
        # Convert dataclass to dict and fix NaN values (which are invalid in standard JSON)
        res_dict = asdict(result)
        
        def fix_nan(obj):
            if isinstance(obj, float) and np.isnan(obj):
                return None
            elif isinstance(obj, dict):
                return {k: fix_nan(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [fix_nan(x) for x in obj]
            return obj
            
        print(json.dumps(fix_nan(res_dict), indent=2, ensure_ascii=False))
    except Exception as e:
        logger.error(f"Fatal: {e}", exc_info=True)
        print(json.dumps({"error": str(e)}, ensure_ascii=False))

    sys.stdout.flush()

