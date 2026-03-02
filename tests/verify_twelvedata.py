import os
import pandas as pd
from twelvedata import TDClient
from dotenv import load_dotenv

load_dotenv()

def test_twelvedata():
    api_key = os.getenv("TWELVEDATA_API_KEY")
    if not api_key or "your_twelvedata_api" in api_key:
        print("❌ TWELVEDATA_API_KEY is not set or is still a placeholder.")
        return False
        
    print(f"Testing TwelveData with API Key: {api_key[:5]}...")
    
    try:
        td = TDClient(apikey=api_key)
        ts = td.time_series(
            symbol="XAU/USD",
            interval="1day",
            outputsize=5
        )
        df = ts.as_pandas()
        
        if df.empty:
            print("❌ No data received from TwelveData.")
            return False
            
        print("✅ Successfully fetched data from TwelveData!")
        print(df)
        return True
    except Exception as e:
        print(f"❌ Error during TwelveData test: {e}")
        return False

if __name__ == "__main__":
    test_twelvedata()
