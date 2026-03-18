#!/usr/bin/env python3
"""
Test: Run crypto model and send result to Telegram
"""
import subprocess, json, os, sys, requests
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(r"C:\Users\Asus\Documents\line_bot_XAUUSD")
load_dotenv(PROJECT_ROOT / "backend" / ".env")

TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_USER_ID = os.getenv("TELEGRAM_USER_ID")
MODEL = str(PROJECT_ROOT / "ml-models" / "cryptomodel" / "technical_model.py")

SYMBOLS = ["BTC/USDT", "XRP/USDT", "BNB/USDT"]

def send_telegram(message):
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    r = requests.post(url, json={"chat_id": TELEGRAM_USER_ID, "text": message, "parse_mode": "HTML"}, timeout=10)
    return r.json().get("ok", False)

for symbol in SYMBOLS:
    print(f"\n=== Running model for {symbol} ===")
    result = subprocess.run(
        [sys.executable, MODEL, symbol],
        capture_output=True, text=True, timeout=120,
        encoding='utf-8', errors='replace'
    )
    # Locate the JSON block in stdout (starts with '{' and ends with '}')
    json_str = result.stdout[result.stdout.find('{') : result.stdout.rfind('}') + 1]
    
    try:
        json_line = json.loads(json_str)
    except:
        json_line = None
        
    if json_line and json_line.get("status") == "success":
        msg = json_line.get("message", "")
        ok = send_telegram(msg)
        print(f"  Telegram send: {'OK' if ok else 'FAILED'}")
        print(f"  Signal: {json_line.get('signal')} | Price: {json_line.get('price')}")
    else:
        print(f"  Model error: {result.stderr[-300:] if result.stderr else 'unknown'}")

print("\nDone!")
