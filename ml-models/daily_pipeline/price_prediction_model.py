import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import os, math, time
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
from pathlib import Path
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error
from twelvedata import TDClient
import lightgbm as lgb
import warnings
from dotenv import load_dotenv
load_dotenv()
warnings.filterwarnings('ignore')


# =============================================================================
# CONFIG — CLI args: python model.py <SYMBOL> <PAIR_CODE>
# e.g. python model.py XAU/USD XAUUSD
#      python model.py BTC/USD BTC_USDT
# =============================================================================
SYMBOL             = sys.argv[1] if len(sys.argv) > 1 else 'XAU/USD'
PAIR_CODE          = sys.argv[2] if len(sys.argv) > 2 else 'XAUUSD'
TWELVEDATA_API_KEY = os.getenv('TWELVEDATA_API_KEY', '6004b1b7fcaf4f9d8e0027fb1c818716')
OUTPUT_DIR         = Path(__file__).parent.parent.parent / 'backend' / 'data' / 'predictions'
OUTPUTSIZE         = 2000   # days of history to fetch
print(f"Symbol: {SYMBOL} | Pair Code: {PAIR_CODE}")

# =============================================================================
# [1] Download data
# =============================================================================
print("Downloading data...")
td = TDClient(apikey=TWELVEDATA_API_KEY)

def fetch(symbol):
    try:
        df = td.time_series(symbol=symbol, interval="1day",
                            outputsize=OUTPUTSIZE).as_pandas()
        if df.empty:
            return None
        df = df.iloc[::-1].copy()
        df = df[[c for c in ['open','high','low','close'] if c in df.columns]].astype(float)
        return df
    except Exception as e:
        print(f"  {symbol}: skipped ({e})")
        return None

df = fetch(SYMBOL)
if df is None:
    print(f"ERROR: Cannot fetch {SYMBOL}"); sys.exit(1)
print(f"  {PAIR_CODE}: {len(df)} rows  ({df.index[0].date()} to {df.index[-1].date()})")

# S&P500 as external feature (free plan)
spx = fetch('SPY')
if spx is not None:
    df = df.join(spx['close'].rename('SPX'), how='left').ffill(limit=3)
    print(f"  SPX   : {len(spx)} rows — added")

df.dropna(inplace=True)

# =============================================================================
# [2] Feature Engineering (all stationary / normalised)
# =============================================================================
def build_features(df_in):
    df  = df_in.copy()
    c   = df['close']; h = df['high']; l = df['low']; o = df['open']

    # Return lags
    for lag in [1, 2, 3, 5, 10, 20]:
        df[f'ret_{lag}'] = c.pct_change(lag)

    # Normalised rolling stats
    for w in [5, 10, 20, 60]:
        ma = c.rolling(w).mean()
        df[f'dist_ma_{w}']  = (c - ma) / ma
        df[f'std_norm_{w}'] = c.rolling(w).std() / ma
        df[f'hh_dist_{w}']  = (h.rolling(w).max() - c) / c
        df[f'll_dist_{w}']  = (c - l.rolling(w).min()) / c

    # RSI 14
    delta = c.diff()
    gain  = delta.clip(lower=0).rolling(14).mean()
    loss  = (-delta.clip(upper=0)).rolling(14).mean()
    df['rsi_14'] = 100 - (100 / (1 + gain / (loss + 1e-9)))

    # MACD (normalised)
    ema12 = c.ewm(span=12, adjust=False).mean()
    ema26 = c.ewm(span=26, adjust=False).mean()
    df['macd_norm']      = (ema12 - ema26) / c
    df['macd_sig_norm']  = df['macd_norm'].ewm(span=9, adjust=False).mean()
    df['macd_hist_norm'] = df['macd_norm'] - df['macd_sig_norm']

    # Bollinger Band position
    bb_mid   = c.rolling(20).mean()
    bb_std   = c.rolling(20).std()
    bb_upper = bb_mid + 2 * bb_std
    bb_lower = bb_mid - 2 * bb_std
    df['bb_pos']   = (c - bb_lower) / (bb_upper - bb_lower + 1e-9)
    df['bb_width'] = (bb_upper - bb_lower) / (bb_mid + 1e-9)

    # ATR normalised
    tr = pd.concat([h-l, (h-c.shift(1)).abs(), (l-c.shift(1)).abs()], axis=1).max(axis=1)
    df['atr_norm'] = tr.rolling(14).mean() / c

    # Stochastic %K/%D
    low14  = l.rolling(14).min()
    high14 = h.rolling(14).max()
    stk    = 100 * (c - low14) / (high14 - low14 + 1e-9)
    df['stoch_k'] = stk
    df['stoch_d'] = stk.rolling(3).mean()

    # Candle geometry
    df['body']     = (c - o) / c
    df['hl_range'] = (h - l) / c

    # SPX features (if available)
    if 'SPX' in df.columns:
        s = df['SPX']
        for lag in [1, 3, 5]:
            df[f'spx_ret_{lag}'] = s.pct_change(lag)
        for w in [5, 20]:
            mu  = s.rolling(w).mean()
            sig = s.rolling(w).std() + 1e-9
            df[f'spx_zscore_{w}'] = (s - mu) / sig
        df['gold_vs_spx_ret5'] = c.pct_change(5) - s.pct_change(5)

    # Target: next-day return
    df['target'] = c.pct_change(1).shift(-1)
    df.dropna(inplace=True)
    return df

df_feat   = build_features(df)
feat_cols = [c for c in df_feat.columns
             if c not in ('target', 'open', 'high', 'low', 'close', 'SPX')]
X_all     = df_feat[feat_cols].values
y_all     = df_feat['target'].values          # next-day returns
prices    = df_feat['close'].values           # actual close prices
dates     = df_feat.index
print(f"  Features: {len(feat_cols)}  |  Rows: {len(X_all)}")

# =============================================================================
# [3] Train / test split (80/20)
# =============================================================================
split      = round(len(X_all) * 0.8)
X_tr, X_te = X_all[:split], X_all[split:]
y_tr, y_te = y_all[:split], y_all[split:]
p_tr, p_te = prices[:split], prices[split:]   # close prices aligned to X

y_te_price = prices[split+1:split+1+len(X_te)]   # actual next-day prices
test_dates = dates[split:split+len(y_te_price)]

# Trim to same length
n = min(len(X_te), len(y_te_price))
X_te, y_te, p_te = X_te[:n], y_te[:n], p_te[:n]
y_te_price = y_te_price[:n]
test_dates = test_dates[:n]

# =============================================================================
# [4] Train LightGBM
# =============================================================================
print("Training LightGBM...")
scaler   = StandardScaler()
X_tr_sc  = scaler.fit_transform(X_tr)
X_te_sc  = scaler.transform(X_te)

t0 = time.time()
model = lgb.LGBMRegressor(
    n_estimators=500, learning_rate=0.02, num_leaves=15,
    subsample=0.7, colsample_bytree=0.7,
    min_child_samples=20, reg_alpha=0.1, reg_lambda=1.0,
    random_state=42, verbose=-1
)
model.fit(X_tr_sc, y_tr,
          eval_set=[(X_te_sc, y_te)],
          callbacks=[lgb.early_stopping(50, verbose=False),
                     lgb.log_evaluation(period=-1)])
train_time = time.time() - t0

# Evaluate: convert predicted returns → predicted prices
pred_returns = model.predict(X_te_sc)
pred_prices  = p_te * (1 + pred_returns)
rmse         = math.sqrt(mean_squared_error(y_te_price, pred_prices))
print(f"  Train time : {train_time:.2f}s")
print(f"  Test RMSE  : {rmse:.2f}")

# =============================================================================
# [5] Predict next-day price
# =============================================================================
x_latest      = scaler.transform(X_all[-1].reshape(1, -1))
pred_ret_next = model.predict(x_latest)[0]
last_price    = prices[-1]
predicted     = last_price * (1 + pred_ret_next)
last_date     = dates[-1]
pred_date     = last_date + timedelta(days=1)

print(f"\n  Last actual  : ${last_price:.2f}  ({last_date.date()})")
print(f"  Predicted    : ${predicted:.2f}  ({pred_date.date()})")
print(f"  Change       : {pred_ret_next*100:+.2f}%")

# =============================================================================
# [6] Plot — 2 subplots: test fit + recent prediction
# =============================================================================
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 10))
fig.suptitle(
    f'{PAIR_CODE} Next-Day Prediction  |  LightGBM  |  RMSE={rmse:.2f}\n'
    f'Predicted {pred_date.date()}: ${predicted:.2f}  ({pred_ret_next*100:+.2f}%)',
    fontsize=13, fontweight='bold'
)

# Test set fit
ax1.plot(test_dates, y_te_price,  label='Actual',    color='black',      linewidth=1.8)
ax1.plot(test_dates, pred_prices, label=f'Predicted (RMSE={rmse:.1f})',
         color='#2ecc71', linewidth=1.3, alpha=0.85)
ax1.set_title('Test Set: Actual vs Predicted', fontsize=11, fontweight='bold')
ax1.set_ylabel('Price (USD)'); ax1.legend(fontsize=10); ax1.grid(True, alpha=0.3)
plt.setp(ax1.xaxis.get_majorticklabels(), rotation=30)

# Recent 90 days + next-day dot
recent      = df_feat['close'].tail(90)
ax2.plot(recent.index, recent.values, label='Recent Actual',
         color='steelblue', linewidth=2)
ax2.plot([pred_date], [predicted], 'o',
         label=f'Predicted: ${predicted:.2f}',
         color='red', markersize=12, zorder=5)
ax2.axvline(x=last_date, color='gray', linestyle='--', alpha=0.5, linewidth=1)
ax2.set_title('Recent 90 Days + Next-Day Prediction', fontsize=11, fontweight='bold')
ax2.set_ylabel('Price (USD)'); ax2.legend(fontsize=10); ax2.grid(True, alpha=0.3)
plt.setp(ax2.xaxis.get_majorticklabels(), rotation=30)

plt.tight_layout()

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
out = OUTPUT_DIR / f'{PAIR_CODE}_{datetime.now().strftime("%Y%m%d")}.png'
plt.savefig(str(out), dpi=100, bbox_inches='tight')
plt.close()
# Print the path so the pipeline can capture it
print(f"OUTPUT_PATH: {out}")
