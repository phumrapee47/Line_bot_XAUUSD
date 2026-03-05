import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import pandas as pd
import mplfinance as mpf
import os
from datetime import datetime
import time
from pathlib import Path
from twelvedata import TDClient
from dotenv import load_dotenv

load_dotenv()

# =============================================================================
# CONFIG — CLI args: python graph_xauusd_model.py <SYMBOL> <PAIR_CODE>
# e.g. python graph_xauusd_model.py XAU/USD XAUUSD
#      python graph_xauusd_model.py BTC/USD BTC_USDT
# =============================================================================
SYMBOL    = sys.argv[1] if len(sys.argv) > 1 else 'XAU/USD'
PAIR_CODE = sys.argv[2] if len(sys.argv) > 2 else 'XAUUSD'
interval  = '1h'    # 1-hour timeframe
outputsize = 500

TWELVEDATA_API_KEY = os.getenv("TWELVEDATA_API_KEY") or '6004b1b7fcaf4f9d8e0027fb1c818716'

print(f"Downloading {SYMBOL} ({PAIR_CODE}) data from TwelveData...")

# Retry logic
max_retries = 3
retry_count = 0
df = None

while retry_count < max_retries:
    try:
        print(f"Attempt {retry_count + 1}/{max_retries}...")
        td = TDClient(apikey=TWELVEDATA_API_KEY)
        ts = td.time_series(symbol=SYMBOL, interval=interval, outputsize=outputsize)
        df = ts.as_pandas()

        if df.empty or df is None:
            raise ValueError(f"No data returned for {SYMBOL}")

        print(f"[OK] Successfully downloaded data")
        break

    except Exception as e:
        retry_count += 1
        print(f"[FAIL] Download failed: {str(e)[:100]}")

        if retry_count < max_retries:
            wait_time = 2 ** retry_count
            print(f"  Retrying in {wait_time} seconds...")
            time.sleep(wait_time)
        else:
            print(f"[FAIL] Failed after {max_retries} attempts")
            df = None

if df is None or df.empty:
    print(f"\n[ERROR] Could not download data for {SYMBOL}")
    sys.exit(1)

# Reverse to chronological order
df = df.iloc[::-1]
df.columns = [col.capitalize() for col in df.columns]
for col in ['Open', 'High', 'Low', 'Close']:
    df[col] = pd.to_numeric(df[col])

print(f"\nSuccessfully downloaded {len(df)} rows of data.")

# Calculate EMA50 and EMA200
try:
    df['EMA50']  = df['Close'].ewm(span=50, adjust=False).mean()
    df['EMA200'] = df['Close'].ewm(span=200, adjust=False).mean()

    exp1 = df['Close'].ewm(span=12, adjust=False).mean()
    exp2 = df['Close'].ewm(span=26, adjust=False).mean()
    df['MACD']      = exp1 - exp2
    df['Signal']    = df['MACD'].ewm(span=9, adjust=False).mean()
    df['MACD_Hist'] = df['MACD'] - df['Signal']

    print("[OK] Indicators calculated successfully")
except Exception as e:
    print(f"[ERROR] Calculating indicators: {e}")
    sys.exit(1)

# Build mplfinance addplots
add_plots = [
    mpf.make_addplot(df['EMA50'],  color='blue',   panel=0, type='line', ylabel='Price'),
    mpf.make_addplot(df['EMA200'], color='red',    panel=0, type='line'),
    mpf.make_addplot(df['MACD'],   color='green',  panel=1, type='line', ylabel='MACD'),
    mpf.make_addplot(df['Signal'], color='orange', panel=1, type='line'),
]
macd_hist_colors = ['green' if x > 0 else 'red' for x in df['MACD_Hist']]
add_plots.append(mpf.make_addplot(df['MACD_Hist'], type='bar', width=0.7,
                                   panel=1, color=macd_hist_colors, alpha=0.7))

# Output path
project_root = Path(__file__).parent.parent.parent
output_dir   = project_root / 'backend' / 'data' / 'graphs'
output_dir.mkdir(parents=True, exist_ok=True)

output_filename = f"{PAIR_CODE}_graph_{datetime.now().strftime('%Y%m%d')}.png"
output_path     = str(output_dir / output_filename)

try:
    print(f"\nGenerating chart to: {output_path}")
    fig, axes = mpf.plot(
        df, type='candle', style='yahoo',
        title=f"{SYMBOL} 1H Chart — EMA & MACD — {datetime.now().strftime('%Y-%m-%d')}",
        ylabel='Price', addplot=add_plots,
        panel_ratios=(3, 1), figscale=1.5, figratio=(16, 9),
        savefig=output_path, returnfig=True
    )
    axes[2].set_ylabel('MACD/Signal/Hist')
    fig.tight_layout()
    print(f"[OK] Graph saved: {output_path}")
except Exception as e:
    print(f"[ERROR] Generating chart: {e}")
    sys.exit(1)

# Print the path so the pipeline can capture it
print(f"OUTPUT_PATH: {output_path}")