#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Technical Analysis Model - Supports User Parameters from SQL Database
ใช้ yfinance ดึงข้อมูลทองคำและทำนายแนวโน้ม ตามพารามิเตอร์ของผู้ใช้งานจาก SQL
"""

import pandas as pd
import json
import sys
import os
import sqlite3
from twelvedata import TDClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

TWELVEDATA_API_KEY = os.getenv("TWELVEDATA_API_KEY")

def logger_info(msg):
    print(f"INFO: {msg}", file=sys.stderr)

# Default parameters
DEFAULT_PARAMS = {
    "rsi_period": 14,
    "sma_short": 20,
    "sma_long": 50,
    "atr_period": 7,
    "rsi_weight": 0.3,
    "sma_weight": 0.2,
    "tp_multiplier": 2.0,
    "sl_multiplier": 1.0,
    "history_period": "60d"
}

def load_user_parameters_from_db(line_user_id="default"):
    """โหลด User Parameters จาก SQL Database"""
    db_path = os.path.join(
        os.path.dirname(__file__), 
        '../../data/trading_bot.db'
    )
    
    try:
        if not os.path.exists(db_path):
            return DEFAULT_PARAMS.copy()
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Query user
        cursor.execute('''
            SELECT id FROM users WHERE lineUserId = ?
        ''', (line_user_id,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return DEFAULT_PARAMS.copy()
        
        user_id = user[0]
        
        # Query trading parameters
        cursor.execute('''
            SELECT rsiPeriod, smaShort, smaLong, atrPeriod,
                   rsiWeight, smaWeight, tpMultiplier, slMultiplier, historyPeriod
            FROM trading_parameters WHERE userId = ?
        ''', (user_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                "rsi_period": row[0],
                "sma_short": row[1],
                "sma_long": row[2],
                "atr_period": row[3],
                "rsi_weight": row[4],
                "sma_weight": row[5],
                "tp_multiplier": row[6],
                "sl_multiplier": row[7],
                "history_period": row[8]
            }
        
        return DEFAULT_PARAMS.copy()
    
    except Exception as e:
        print(f"Warning: Could not load user parameters from DB: {e}", file=sys.stderr)
        return DEFAULT_PARAMS.copy()

def load_user_parameters(user_id="default"):
    """โหลด User Parameters จากไฟล์ JSON (fallback)"""
    params_file = os.path.join(
        os.path.dirname(__file__), 
        '../../data/user_parameters.json'
    )
    
    try:
        if os.path.exists(params_file):
            with open(params_file, 'r', encoding='utf-8') as f:
                all_params = json.load(f)
                if user_id in all_params:
                    # Merge with defaults
                    return {**DEFAULT_PARAMS, **all_params[user_id]}
    except Exception as e:
        print(f"Warning: Could not load user parameters: {e}", file=sys.stderr)
    
    return DEFAULT_PARAMS.copy()

def calculate_rsi(data, period=14):
    """Calculate RSI indicator"""
    delta = data.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def get_technical_prediction(pair_code="XAUUSD"):
    """Get technical prediction based on TwelveData data"""
    params = DEFAULT_PARAMS.copy()
    
    try:
        if not TWELVEDATA_API_KEY or "your_twelvedata_api_key" in TWELVEDATA_API_KEY:
            return {
                "probability": 0.5,
                "price": 0,
                "tp": 0,
                "sl": 0,
                "error": "TWELVEDATA_API_KEY not configured"
            }

        # Map pair_code to TwelveData symbol
        symbol_map = {
            "XAUUSD": "XAU/USD",
            "BTCUSD": "BTC/USD",
        }
        symbol = symbol_map.get(pair_code, "XAU/USD")
        
        logger_info(f"Analyzing {pair_code} using TwelveData symbol {symbol}")

        # Initialize TwelveData client
        td = TDClient(apikey=TWELVEDATA_API_KEY)
        ts = td.time_series(
            symbol=symbol,
            interval="1day",
            outputsize=100
        )
        
        # Convert to pandas DataFrame
        df = ts.as_pandas()
        
        if df.empty:
            return {
                "probability": 0.5,
                "price": 0,
                "tp": 0,
                "sl": 0,
                "error": "No data received from TwelveData"
            }
        
        # TwelveData returns most recent data first, need to reverse it for rolling calcs
        df = df.iloc[::-1]
        
        # Calculate simple technical indicators
        df['close'] = df['close'].astype(float)
        df['high'] = df['high'].astype(float)
        df['low'] = df['low'].astype(float)
        
        # RSI - use user's period
        df['rsi'] = calculate_rsi(df['close'], params['rsi_period'])
        
        # Moving Averages - use user's periods
        df['sma_short'] = df['close'].rolling(window=params['sma_short']).mean()
        df['sma_long'] = df['close'].rolling(window=params['sma_long']).mean()
        
        # ATR calculation
        df['high_low'] = df['high'] - df['low']
        df['high_close'] = abs(df['high'] - df['close'].shift())
        df['low_close'] = abs(df['low'] - df['close'].shift())
        df['tr'] = df[['high_low', 'high_close', 'low_close']].max(axis=1)
        df['atr'] = df['tr'].rolling(window=params['atr_period']).mean()
        
        # Fill NaN values
        df['rsi'] = df['rsi'].fillna(50)
        df['sma_short'] = df['sma_short'].bfill().ffill()
        df['sma_long'] = df['sma_long'].bfill().ffill()
        df['atr'] = df['atr'].fillna(df['tr'].mean())
        
        # Get latest values
        last = df.iloc[-1]
        price = float(last['close'])
        rsi = float(last['rsi'])
        sma_short = float(last['sma_short'])
        sma_long = float(last['sma_long'])
        atr = float(last['atr'])
        
        # Signal calculation
        rsi_signal = (rsi - 50) / 50
        sma_signal = 0
        if price > sma_short and sma_short > sma_long:
            sma_signal = 0.5
        elif price < sma_short and sma_short < sma_long:
            sma_signal = -0.5
        
        # Combine signals
        prob_up = 0.5 + (rsi_signal * params['rsi_weight']) + (sma_signal * params['sma_weight'])
        prob_up = max(0.0, min(1.0, prob_up))
        
        # Calculate TP/SL
        if prob_up > 0.5:
            tp = price + (params['tp_multiplier'] * atr)
            sl = price - (params['sl_multiplier'] * atr)
        else:
            tp = price - (params['tp_multiplier'] * atr)
            sl = price + (params['sl_multiplier'] * atr)
        
        return {
            "probability": prob_up,
            "price": price,
            "tp": float(tp),
            "sl": float(sl),
            "used_params": params
        }
    
    except Exception as e:
        return {
            "probability": 0.5,
            "price": 0,
            "tp": 0,
            "sl": 0,
            "error": str(e)
        }

if __name__ == "__main__":
    line_user_id = sys.argv[1] if len(sys.argv) > 1 else "default"
    result = get_technical_prediction(line_user_id)
    print(json.dumps(result, indent=2))
    sys.stdout.flush()