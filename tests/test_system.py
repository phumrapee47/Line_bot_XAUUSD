import unittest
import os
import sys
from pathlib import Path

# Add project root and ml-models to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.append(str(PROJECT_ROOT))
sys.path.append(str(PROJECT_ROOT / 'ml-models'))

class TestXAUUSDBot(unittest.TestCase):
    
    def test_environment_variables(self):
        """Test if core environment variables are present"""
        from dotenv import load_dotenv
        load_dotenv(PROJECT_ROOT / '.env')
        
        self.assertIsNotNone(os.getenv('LINE_CHANNEL_ACCESS_TOKEN'), "LINE token is missing")
        self.assertIsNotNone(os.getenv('GEMINI_API_KEY'), "Gemini API key is missing")

    def test_yfinance_connection(self):
        """Test if we can download data from yfinance"""
        import yfinance as yf
        ticker = 'GC=F'
        try:
            data = yf.download(ticker, period='5d', interval='1h', progress=False)
            self.assertFalse(data.empty, "Yahoo Finance returned empty dataframe")
            self.assertIn('Close', data.columns, "Dataframe missing Close column")
        except Exception as e:
            self.fail(f"yfinance download failed: {e}")

    def test_prediction_output_dir(self):
        """Test if prediction output directory exists or can be created"""
        output_dir = PROJECT_ROOT / 'backend' / 'data' / 'predictions'
        os.makedirs(output_dir, exist_ok=True)
        self.assertTrue(output_dir.exists())

    def test_graph_output_dir(self):
        """Test if graph output directory exists or can be created"""
        output_dir = PROJECT_ROOT / 'backend' / 'data' / 'graphs'
        os.makedirs(output_dir, exist_ok=True)
        self.assertTrue(output_dir.exists())

if __name__ == '__main__':
    unittest.main()
