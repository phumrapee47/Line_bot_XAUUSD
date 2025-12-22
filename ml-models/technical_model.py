#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Technical Analysis Model - Simplified Version
ใช้ yfinance ดึงข้อมูลทองคำและทำนายแนวโน้ม
"""

import yfinance as yf
import pandas as pd
import json
import sys

def calculate_rsi(data, period=14):
    """Calculate RSI indicator"""
    delta = data.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def get_technical_prediction():
    try:
        # Fetch gold data
        gold = yf.Ticker("GC=F")
        df = gold.history(period="60d", interval="1d")
        
        if df.empty or len(df) < 14:
            return {
                "probability": 0.5,
                "price": 0,
                "tp": 0,
                "sl": 0,
                "error": "Insufficient data"
            }
        
        # Calculate simple technical indicators
        df['return'] = df['Close'].pct_change()
        
        # RSI
        df['rsi'] = calculate_rsi(df['Close'], 14)
        
        # Moving Averages
        df['sma_20'] = df['Close'].rolling(window=20).mean()
        df['sma_50'] = df['Close'].rolling(window=50).mean()
        
        # ATR (simple version)
        df['high_low'] = df['High'] - df['Low']
        df['high_close'] = abs(df['High'] - df['Close'].shift())
        df['low_close'] = abs(df['Low'] - df['Close'].shift())
        df['tr'] = df[['high_low', 'high_close', 'low_close']].max(axis=1)
        df['atr'] = df['tr'].rolling(window=14).mean()
        
        # Remove NaN
        df = df.dropna()
        
        if df.empty:
            return {
                "probability": 0.5,
                "price": 0,
                "tp": 0,
                "sl": 0,
                "error": "No data after calculations"
            }
        
        # Get latest values
        last = df.iloc[-1]
        price = float(last['Close'])
        rsi = float(last['rsi'])
        sma20 = float(last['sma_20'])
        sma50 = float(last['sma_50'])
        atr = float(last['atr']) if not pd.isna(last['atr']) else price * 0.01
        
        # Simple prediction logic
        rsi_signal = (rsi - 50) / 50
        sma_signal = 0
        if price > sma20 and sma20 > sma50:
            sma_signal = 0.5
        elif price < sma20 and sma20 < sma50:
            sma_signal = -0.5
        
        # Combine signals
        prob_up = 0.5 + (rsi_signal * 0.3) + (sma_signal * 0.2)
        prob_up = max(0.0, min(1.0, prob_up))
        
        # Calculate TP/SL
        if prob_up > 0.5:
            tp = price + 3.0 * atr
            sl = price - 1.5 * atr
        else:
            tp = price - 3.0 * atr
            sl = price + 1.5 * atr
        
        return {
            "probability": prob_up,
            "price": price,
            "tp": tp,
            "sl": sl
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
    result = get_technical_prediction()
    print(json.dumps(result))
    sys.stdout.flush()
