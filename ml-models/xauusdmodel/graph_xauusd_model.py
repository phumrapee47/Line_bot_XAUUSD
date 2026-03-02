import pandas as pd
import mplfinance as mpf
import os
from datetime import datetime
import time
from twelvedata import TDClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

TWELVEDATA_API_KEY = os.getenv("TWELVEDATA_API_KEY")

# Symbol for Gold in TwelveData
symbol = 'XAU/USD'
interval = '1h' # 1-hour timeframe
outputsize = 500 # Sufficient for indicators (EMA200, etc.)

print(f"Downloading {symbol} data from TwelveData...")

if not TWELVEDATA_API_KEY or "your_twelvedata_api_key" in TWELVEDATA_API_KEY:
    print("\n[ERROR] TWELVEDATA_API_KEY not configured in .env")
    import sys
    sys.exit(1)

# Retry logic with exponential backoff
max_retries = 3
retry_count = 0
df = None

while retry_count < max_retries:
    try:
        print(f"Attempt {retry_count + 1}/{max_retries}...")
        td = TDClient(apikey=TWELVEDATA_API_KEY)
        ts = td.time_series(
            symbol=symbol,
            interval=interval,
            outputsize=outputsize
        )
        df = ts.as_pandas()
        
        if df.empty or df is None:
            raise ValueError(f"No data returned for {symbol}")
        
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

# Check if data was downloaded successfully
if df is None or df.empty:
    print(f"\n[WARNING] ERROR: Could not download data for {symbol}")
    import sys
    sys.exit(1)
else:
    # Reverse to chronological order (TwelveData returns most recent first)
    df = df.iloc[::-1]
    
    # Capitalize columns for mplfinance
    df.columns = [col.capitalize() for col in df.columns]
    
    # Ensure numeric types
    for col in ['Open', 'High', 'Low', 'Close']:
        df[col] = pd.to_numeric(df[col])

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