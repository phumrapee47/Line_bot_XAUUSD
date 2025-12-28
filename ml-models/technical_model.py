#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Technical Analysis Model - Supports User Parameters from SQL Database
ใช้ yfinance ดึงข้อมูลทองคำและทำนายแนวโน้ม ตามพารามิเตอร์ของผู้ใช้งานจาก SQL
"""

import yfinance as yf
import pandas as pd
import json
import sys
import os
import sqlite3

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
        '../data/trading_bot.db'
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
        '../data/user_parameters.json'
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

def get_technical_prediction(line_user_id="default"):
    """Get technical prediction based on user parameters from database"""
    # Try to load from database first, fallback to JSON file
    params = load_user_parameters_from_db(line_user_id)
    if params == DEFAULT_PARAMS:
        # Fallback to JSON if database doesn't have user
        params_json = load_user_parameters(line_user_id)
        if params_json != DEFAULT_PARAMS:
            params = params_json
    
    try:
        # Fetch gold data
        gold = yf.Ticker("GC=F")
        df = gold.history(period=params['history_period'], interval="1d")
        
        if df.empty or len(df) < params['rsi_period']:
            return {
                "probability": 0.5,
                "price": 0,
                "tp": 0,
                "sl": 0,
                "error": "Insufficient data"
            }
        
        # Calculate simple technical indicators
        df['return'] = df['Close'].pct_change()
        
        # RSI - use user's period
        df['rsi'] = calculate_rsi(df['Close'], params['rsi_period'])
        
        # Moving Averages - use user's periods
        df['sma_short'] = df['Close'].rolling(window=params['sma_short']).mean()
        df['sma_long'] = df['Close'].rolling(window=params['sma_long']).mean()
        
        # ATR - use user's period
        df['high_low'] = df['High'] - df['Low']
        df['high_close'] = abs(df['High'] - df['Close'].shift())
        df['low_close'] = abs(df['Low'] - df['Close'].shift())
        df['tr'] = df[['high_low', 'high_close', 'low_close']].max(axis=1)
        df['atr'] = df['tr'].rolling(window=params['atr_period']).mean()
        
        # Fill NaN values instead of dropping them
        df['rsi'] = df['rsi'].fillna(50)  # Default to neutral
        df['sma_short'] = df['sma_short'].bfill().ffill()
        df['sma_long'] = df['sma_long'].bfill().ffill()
        df['atr'] = df['atr'].fillna(df['tr'].mean())  # Use mean if NaN
        
        # Remove only if still completely empty
        if df.empty or len(df) == 0:
            return {
                "probability": 0.5,
                "price": 0,
                "tp": 0,
                "sl": 0,
                "error": "No valid data"
            }
        
        # Get latest values
        last = df.iloc[-1]
        price = float(last['Close'])
        rsi = float(last['rsi']) if pd.notna(last['rsi']) else 50
        sma_short = float(last['sma_short']) if pd.notna(last['sma_short']) else price
        sma_long = float(last['sma_long']) if pd.notna(last['sma_long']) else price
        atr = float(last['atr']) if pd.notna(last['atr']) else price * 0.01
        
        # Signal calculation with user weights
        rsi_signal = (rsi - 50) / 50
        sma_signal = 0
        if price > sma_short and sma_short > sma_long:
            sma_signal = 0.5
        elif price < sma_short and sma_short < sma_long:
            sma_signal = -0.5
        
        # Combine signals using user's weights
        prob_up = 0.5 + (rsi_signal * params['rsi_weight']) + (sma_signal * params['sma_weight'])
        prob_up = max(0.0, min(1.0, prob_up))
        
        # Calculate TP/SL using user's multipliers
        if prob_up > 0.5:
            tp = price + params['tp_multiplier'] * atr
            sl = price - params['sl_multiplier'] * atr
        else:
            tp = price - params['tp_multiplier'] * atr
            sl = price + params['sl_multiplier'] * atr
        
        return {
            "probability": prob_up,
            "price": price,
            "tp": tp,
            "sl": sl,
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