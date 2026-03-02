#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
XGBoost Model Training Script for Gold (XAUUSD) Price Prediction
วิธีสร้าง Model เพื่อทำนายราคาทองคำ

This script requires historical OHLC data. If you don't have it, use yfinance to fetch:
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import joblib
import xgboost as xgb
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from twelvedata import TDClient
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

TWELVEDATA_API_KEY = os.getenv("TWELVEDATA_API_KEY")

def fetch_gold_data(period='2y', interval='1d'):
    """ดึงข้อมูลทองคำจาก TwelveData"""
    print(f"📥 Fetching gold data from TwelveData...")
    
    if not TWELVEDATA_API_KEY or "your_twelvedata_api_key" in TWELVEDATA_API_KEY:
        raise ValueError("TWELVEDATA_API_KEY not configured in .env")

    symbol = "XAU/USD"
    # Map yfinance period to outputsize roughly
    # 2y 1d ~ 500 rows
    outputsize = 1000 if period == '2y' else 500
    
    td = TDClient(apikey=TWELVEDATA_API_KEY)
    ts = td.time_series(
        symbol=symbol,
        interval="1day",
        outputsize=outputsize
    )
    df = ts.as_pandas()
    
    if df.empty:
        raise ValueError("No data received from TwelveData")
    
    # Reverse to chronological order
    df = df.iloc[::-1]
    
    # Capitalize columns to match expectations in calculate_indicators
    df.columns = [col.capitalize() for col in df.columns]
    for col in ['Open', 'High', 'Low', 'Close']:
        df[col] = pd.to_numeric(df[col])
        
    print(f"✅ Fetched {len(df)} candles")
    return df

def calculate_indicators(df):
    """คำนวณ Technical Indicators"""
    print("📊 Calculating technical indicators...")
    
    # Price change
    df['return'] = df['Close'].pct_change()
    
    # Moving Averages
    df['ema_10'] = ta.ema(df['Close'], 10)
    df['ema_20'] = ta.ema(df['Close'], 20)
    df['ema_50'] = ta.ema(df['Close'], 50)
    df['ema_200'] = ta.ema(df['Close'], 200)
    
    # RSI (Relative Strength Index)
    df['rsi_7'] = ta.rsi(df['Close'], 7)
    df['rsi_14'] = ta.rsi(df['Close'], 14)
    df['rsi_21'] = ta.rsi(df['Close'], 21)
    
    # MACD (Moving Average Convergence Divergence)
    macd = ta.macd(df['Close'])
    df['macd'] = macd['MACD_12_26_9']
    df['macd_hist'] = macd['MACDh_12_26_9']
    
    # Bollinger Bands
    bb = ta.bbands(df['Close'], length=20)
    df['bb_upper'] = bb['BBU_20_2.0']
    df['bb_lower'] = bb['BBL_20_2.0']
    df['bb_basis'] = bb['BBM_20_2.0']
    
    # ATR (Average True Range)
    df['atr'] = ta.atr(df['High'], df['Low'], df['Close'])
    
    # STOCH (Stochastic)
    stoch = ta.stoch(df['High'], df['Low'], df['Close'])
    if stoch is not None:
        df['stoch_k'] = stoch['STOCHk_14_3_3']
        df['stoch_d'] = stoch['STOCHd_14_3_3']
    
    # Remove NaN values
    df = df.dropna()
    
    print(f"✅ Calculated indicators for {len(df)} samples")
    return df

def create_target(df, lookforward=1):
    """สร้าง Target variable (0 = Price down, 1 = Price up)"""
    print(f"🎯 Creating target variable (look forward {lookforward} candles)...")
    
    # Shift price forward to see if price goes up or down
    future_price = df['Close'].shift(-lookforward)
    df['target'] = (future_price > df['Close']).astype(int)
    
    # Remove last N rows where we don't have future price
    df = df[:-lookforward]
    
    print(f"✅ Target distribution: {df['target'].value_counts().to_dict()}")
    return df

def select_features(df):
    """เลือก Features ที่สำคัญ"""
    feature_cols = [
        'return', 'rsi_14', 'rsi_7', 'ema_10', 'macd', 'rsi_21',
        'ema_20', 'ema_50', 'ema_200', 'atr', 'macd_hist'
    ]
    
    # Only use features that exist
    feature_cols = [col for col in feature_cols if col in df.columns]
    
    print(f"📋 Selected {len(feature_cols)} features: {feature_cols}")
    return feature_cols

def train_model(df, feature_cols, test_size=0.2):
    """ฝึก XGBoost Model"""
    print("\n🤖 Training XGBoost Model...")
    
    # Prepare data
    X = df[feature_cols].fillna(0)
    y = df['target']
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=42, shuffle=True
    )
    
    print(f"📊 Train set: {len(X_train)} | Test set: {len(X_test)}")
    
    # Train model
    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        eval_metric='logloss',
        n_jobs=-1
    )
    
    print("⏳ Training... (this may take a minute)")
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False
    )
    
    # Evaluate
    y_pred_train = model.predict(X_train)
    y_pred_test = model.predict(X_test)
    
    print("\n📈 Model Performance:")
    print(f"  Train Accuracy: {accuracy_score(y_train, y_pred_train):.4f}")
    print(f"  Test Accuracy:  {accuracy_score(y_test, y_pred_test):.4f}")
    print(f"  Test Precision: {precision_score(y_test, y_pred_test):.4f}")
    print(f"  Test Recall:    {recall_score(y_test, y_pred_test):.4f}")
    print(f"  Test F1-Score:  {f1_score(y_test, y_pred_test):.4f}")
    
    # Feature importance
    importance_df = pd.DataFrame({
        'feature': feature_cols,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\n🌟 Top 5 Important Features:")
    for idx, row in importance_df.head(5).iterrows():
        print(f"  {row['feature']}: {row['importance']:.4f}")
    
    return model

def save_model(model, feature_cols, filename='gold_ml_model_selected.pkl'):
    """Save model to file"""
    print(f"\n💾 Saving model to {filename}...")
    
    # Save both model and feature names
    joblib.dump({
        'model': model,
        'features': feature_cols
    }, filename)
    
    print(f"✅ Model saved! File size: {joblib.dump(model, '/dev/null') / 1024:.2f} KB")

def main():
    print("=" * 60)
    print("🥇 Gold (XAUUSD) ML Model Training Script")
    print("=" * 60)
    print()
    
    try:
        # Fetch data
        df = fetch_gold_data(period='2y', interval='1d')
        
        # Calculate indicators
        df = calculate_indicators(df)
        
        # Create target
        df = create_target(df, lookforward=1)
        
        # Select features
        feature_cols = select_features(df)
        
        # Train model
        model = train_model(df, feature_cols)
        
        # Save model
        save_model(model, feature_cols)
        
        print("\n" + "=" * 60)
        print("✅ Training Complete!")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Copy 'gold_ml_model_selected.pkl' to ml-models/ folder")
        print("2. Start the bot: npm start")
        print("\nYour bot will now use this model for predictions! 🚀")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        print("\nCommon issues:")
        print("- yfinance rate limited: Wait 1 minute and try again")
        print("- Missing packages: pip install xgboost scikit-learn pandas-ta")

if __name__ == "__main__":
    main()
