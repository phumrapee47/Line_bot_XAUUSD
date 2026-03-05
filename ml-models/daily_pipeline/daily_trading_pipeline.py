#!/usr/bin/env python3
"""
Universal Daily Trading Analysis Pipeline
==========================================
Runs for all configured trading pairs:
1. Generate LightGBM price prediction image
2. Generate technical analysis chart
3. Analyze both images with Gemini AI
4. Save result JSON for backend to pick up and upload to Supabase
"""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import os
import subprocess
import json
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# =============================================================================
# CONFIG
# =============================================================================
ML_MODELS_DIR  = Path(__file__).parent
PROJECT_ROOT   = ML_MODELS_DIR.parent.parent
DATA_DIR       = PROJECT_ROOT / 'backend' / 'data'
PREDICTIONS_DIR= DATA_DIR / 'predictions'
GRAPHS_DIR     = DATA_DIR / 'graphs'
RESULTS_DIR    = DATA_DIR / 'daily_results'

PREDICTIONS_DIR.mkdir(parents=True, exist_ok=True)
GRAPHS_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

PREDICTION_SCRIPT = str(ML_MODELS_DIR / 'price_prediction_model.py')
GRAPH_SCRIPT      = str(ML_MODELS_DIR / 'technical_graph_model.py')

# Pairs to run: (twelvedata_symbol, safe_pair_code)
# pair_code must be safe for filenames (no '/' or ':')
PAIRS = [
    ('XAU/USD',   'XAUUSD'),
    ('BTC/USD',   'BTC_USDT'),
    ('ETH/USD',   'ETH_USDT'),
    ('BNB/USD',   'BNB_USDT'),
    ('SOL/USD',   'SOL_USDT'),
    ('XRP/USD',   'XRP_USDT'),
    ('DOGE/USD',  'DOGE_USDT'),
]

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)

def run_script(script_path, args, timeout=600):
    """Run a python script and capture OUTPUT_PATH from stdout."""
    cmd = [sys.executable, script_path] + args
    try:
        result = subprocess.run(
            cmd, cwd=str(ML_MODELS_DIR),
            capture_output=True, text=True,
            encoding='utf-8', errors='replace',
            timeout=timeout
        )
        if result.stdout:
            print(result.stdout, end='')
        if result.stderr:
            print(result.stderr, end='', file=sys.stderr)

        if result.returncode != 0:
            log(f"ERROR: Script failed (code {result.returncode})")
            return None

        # Parse OUTPUT_PATH from stdout
        for line in result.stdout.splitlines():
            if line.startswith('OUTPUT_PATH:'):
                return line.split('OUTPUT_PATH:')[1].strip()
        return None
    except subprocess.TimeoutExpired:
        log("ERROR: Script timed out")
        return None
    except Exception as e:
        log(f"ERROR: {e}")
        return None

def run_gemini_analysis(prediction_image_path, graph_image_path, pair_code):
    """Call Gemini API with both images."""
    try:
        import google.generativeai as genai
        import PIL.Image

        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY not set")

        genai.configure(api_key=api_key)
        gemini = genai.GenerativeModel('gemini-2.5-flash')

        pred_img  = PIL.Image.open(prediction_image_path)
        graph_img = PIL.Image.open(graph_image_path)

        today = datetime.now().strftime("%d %B %Y")
        prompt = f"""
วิเคราะห์รูปภาพกราฟพยากรณ์ราคา {pair_code} โดยวิเคราะห์ร่วมกับรูป timeframe ที่แนบมา:
วันที่ปัจจุบัน: {today}

1. สรุปแนวโน้มในอนาคต (ขึ้น/ลง/คงที่)
2. บอก signal tp/sl ของวันนี้และใช้ RR ให้เหมาะสม (ขอสั้นๆ)
3. ให้คำแนะนำสั้นๆ หรือคาดการณ์จากข่าวที่จะเกิดขึ้นในแหล่งข่าวจริงๆ ณ วันนั้น แบบสรุป

**สำคัญ**: ใช้ ค.ศ. (Common Era) ในการระบุวันที่ ตอบเป็นภาษาทางการและรวบรัดเข้าใจง่าย
"""
        log(f"  Sending to Gemini...")
        response = gemini.generate_content([prompt, pred_img, graph_img])
        return response.text
    except Exception as e:
        log(f"  Gemini error: {e}")
        return None

def process_pair(symbol, pair_code):
    """Run full pipeline for one pair."""
    log(f"{'='*60}")
    log(f"Processing {pair_code} ({symbol})")
    log(f"{'='*60}")

    # Step 1: Prediction model
    log(f"  [1/3] Running prediction model...")
    pred_path = run_script(PREDICTION_SCRIPT, [symbol, pair_code])
    if not pred_path or not Path(pred_path).exists():
        log(f"  ERROR: Prediction image not found for {pair_code}")
        return None
    log(f"  Prediction image: {pred_path}")

    # Step 2: Graph model
    log(f"  [2/3] Running graph model...")
    graph_path = run_script(GRAPH_SCRIPT, [symbol, pair_code])
    if not graph_path or not Path(graph_path).exists():
        log(f"  WARNING: Graph image not found, skipping Gemini")
        return {
            'pairCode': pair_code,
            'symbol': symbol,
            'predictionImage': pred_path,
            'graphImage': None,
            'analysis': None,
            'timestamp': datetime.now().isoformat()
        }
    log(f"  Graph image: {graph_path}")

    # Step 3: Gemini analysis
    log(f"  [3/3] Gemini analysis...")
    analysis = run_gemini_analysis(pred_path, graph_path, pair_code)
    if analysis:
        log(f"  Gemini analysis received ({len(analysis)} chars)")
    else:
        log(f"  WARNING: No Gemini analysis received")

    return {
        'pairCode': pair_code,
        'symbol': symbol,
        'predictionImage': pred_path,
        'graphImage': graph_path,
        'analysis': analysis,
        'timestamp': datetime.now().isoformat()
    }

def main():
    print("\n" + "="*60)
    print("Universal Daily Trading Analysis Pipeline")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)

    results = []
    success_count = 0

    for symbol, pair_code in PAIRS:
        try:
            result = process_pair(symbol, pair_code)
            if result:
                results.append(result)
                # Save individual result file (backend picks this up)
                result_file = RESULTS_DIR / f'{pair_code}_result.json'
                with open(str(result_file), 'w', encoding='utf-8') as f:
                    json.dump(result, f, ensure_ascii=False, indent=2)
                log(f"  Result saved: {result_file}")
                success_count += 1
        except Exception as e:
            log(f"FATAL ERROR for {pair_code}: {e}")

    print(f"\n{'='*60}")
    print(f"Pipeline complete: {success_count}/{len(PAIRS)} pairs succeeded")
    print(f"{'='*60}")

    # Save summary
    summary = {
        'timestamp': datetime.now().isoformat(),
        'total': len(PAIRS),
        'success': success_count,
        'results': results
    }
    summary_path = DATA_DIR / 'pipeline_summary.json'
    with open(str(summary_path), 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    log(f"Summary saved: {summary_path}")

    return success_count > 0

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        log("Pipeline interrupted")
        sys.exit(130)
    except Exception as e:
        log(f"FATAL: {e}")
        sys.exit(1)
