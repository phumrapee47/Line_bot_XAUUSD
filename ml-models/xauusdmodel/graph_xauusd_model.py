import yfinance as yf
import pandas as pd
import mplfinance as mpf
import os
from datetime import datetime
import time

# Download data for Gold Futures (GC=F)
ticker = 'GC=F'  # Gold Futures
interval = '60m' # 1-hour timeframe
period = '60d'   # Get data for the last 60 days to ensure enough data for EMA200

print(f"Downloading {ticker} data with retry logic...")

# Retry logic with exponential backoff
max_retries = 3
retry_count = 0
df = None

while retry_count < max_retries:
    try:
        print(f"Attempt {retry_count + 1}/{max_retries}...")
        df = yf.download(ticker, interval=interval, period=period, progress=False)
        
        if df.empty or df is None:
            raise ValueError(f"No data returned for {ticker}")
        
        print(f"[OK] Successfully downloaded data")
        break
        
    except Exception as e:
        retry_count += 1
        print(f"[FAIL] Download failed: {str(e)[:100]}")
        
        if retry_count < max_retries:
            wait_time = 2 ** retry_count  # exponential backoff: 2, 4, 8 seconds
            print(f"  Retrying in {wait_time} seconds...")
            time.sleep(wait_time)
        else:
            print(f"[FAIL] Failed after {max_retries} attempts")
            df = None

# Check if data was downloaded successfully
if df is None or df.empty:
    print(f"\n[WARNING] ERROR: Could not download data for {ticker}")
    print("Possible causes:")
    print("  1. Internet connection is not stable")
    print("  2. Yahoo Finance server is temporarily unavailable")
    print("  3. Rate limiting from Yahoo Finance API")
    print("\nTrying alternative data source or using cached data...")
    
    # Try creating a simple fallback chart with dummy data
    # Or exit gracefully
    import sys
    sys.exit(1)
else:
    # Flatten MultiIndex columns if they exist. yfinance usually returns MultiIndex
    # where the first level is the metric (Open, Close, etc.) and the second level is the ticker symbol.
    if isinstance(df.columns, pd.MultiIndex):
        # Drop the second level (index 1), which is typically the ticker symbol for a single ticker
        df.columns = df.columns.droplevel(1)
        # Ensure 'Close' column exists, sometimes 'Adj Close' is provided by yfinance
        if 'Adj Close' in df.columns and 'Close' not in df.columns:
            df.rename(columns={'Adj Close': 'Close'}, inplace=True)

    print(f"\nSuccessfully downloaded {len(df)} rows of data.")
    print("Data preview (last 5 rows):")
    print(df.tail())


# Calculate EMA50 and EMA200
try:
    df['EMA50'] = df['Close'].ewm(span=50, adjust=False).mean()
    df['EMA200'] = df['Close'].ewm(span=200, adjust=False).mean()

    # Calculate MACD
    exp1 = df['Close'].ewm(span=12, adjust=False).mean()
    exp2 = df['Close'].ewm(span=26, adjust=False).mean()
    df['MACD'] = exp1 - exp2
    df['Signal'] = df['MACD'].ewm(span=9, adjust=False).mean()
    df['MACD_Hist'] = df['MACD'] - df['Signal']

    print("\n[OK] Indicators calculated successfully")
except Exception as e:
    print(f"\n[ERROR] ERROR calculating indicators: {e}")
    import sys
    sys.exit(1)

# Prepare `addplot` for EMAs
add_plots = [
    mpf.make_addplot(df['EMA50'], color='blue', panel=0, type='line', ylabel='Price'),
    mpf.make_addplot(df['EMA200'], color='red', panel=0, type='line')
]

# Prepare `addplot` for MACD. MACD needs its own panel (panel=1)
# MACD Line
add_plots.append(mpf.make_addplot(df['MACD'], color='green', panel=1, type='line', ylabel='MACD'))
# Signal Line
add_plots.append(mpf.make_addplot(df['Signal'], color='orange', panel=1, type='line'))
# MACD Histogram
# We'll use `scatter` for histogram bars by setting `type='bar'` and `width`
macd_hist_colors = ['green' if x > 0 else 'red' for x in df['MACD_Hist']]
add_plots.append(mpf.make_addplot(df['MACD_Hist'], type='bar', width=0.7, panel=1, color=macd_hist_colors, alpha=0.7))

# สร้าง output directory
import os
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
output_dir = os.path.join(project_root, 'backend', 'data', 'graphs')
os.makedirs(output_dir, exist_ok=True)

output_filename = f"xauusd_graph_{datetime.now().strftime('%Y%m%d')}.png"
output_path = os.path.join(output_dir, output_filename)

# Plot the chart with error handling
try:
    print(f"\nGenerating chart...")
    fig, axes = mpf.plot(df,
                         type='candle',
                         style='yahoo',
                         title=f"XAUUSD (GC=F) 1-Hour Chart with EMA and MACD - {datetime.now().strftime('%Y-%m-%d')}",
                         ylabel='Price',
                         addplot=add_plots,
                         panel_ratios=(3,1), # Ratio of main chart to MACD panel
                         figscale=1.5,
                         figratio=(16,9),
                         savefig=output_path,
                         returnfig=True)

    # Customize MACD panel Y-label for better readability
    axes[2].set_ylabel('MACD/Signal/Hist') # axes[2] is the y-axis for panel 1 (MACD)

    fig.tight_layout()
    
    print(f"[OK] Graph saved successfully at: {output_path}")

except Exception as e:
    print(f"\n[ERROR] ERROR generating chart: {e}")
    import sys
    sys.exit(1)

# Return file path
if __name__ == "__main__":
    print(f"\n[OK] Output file path: {output_path}")