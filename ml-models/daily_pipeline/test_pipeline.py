#!/usr/bin/env python3
"""
Quick test: Run prediction model for XAUUSD only, then call backend upload API.
"""
import sys, io, os, subprocess, json, requests
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

ML_DIR       = Path(__file__).parent
PROJECT_ROOT = ML_DIR.parent.parent
DATA_DIR     = PROJECT_ROOT / 'backend' / 'data'
RESULTS_DIR  = DATA_DIR / 'daily_results'
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

PRED_SCRIPT  = str(ML_DIR / 'price_prediction_model.py')
GRAPH_SCRIPT = str(ML_DIR / 'technical_graph_model.py')

BACKEND_URL  = os.getenv('BACKEND_URL', 'http://localhost:3000')

def run_script(script, args):
    """Run script and capture OUTPUT_PATH from stdout."""
    cmd = [sys.executable, script] + args
    print(f"\n>>> Running: {' '.join(cmd)}\n")
    result = subprocess.run(cmd, cwd=str(ML_DIR), capture_output=True,
                            text=True, encoding='utf-8', errors='replace', timeout=600)
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print("[STDERR]:", result.stderr[:500])
    if result.returncode != 0:
        print(f"ERROR: Script exited with code {result.returncode}")
        return None
    for line in result.stdout.splitlines():
        if line.startswith('OUTPUT_PATH:'):
            return line.split('OUTPUT_PATH:')[1].strip()
    return None

print("="*60)
print("TEST: XAUUSD Prediction + Supabase Upload")
print("="*60)

# Step 1: Prediction model
print("\n[1/3] Running LightGBM prediction model...")
pred_path = run_script(PRED_SCRIPT, ['XAU/USD', 'XAUUSD'])
if not pred_path or not Path(pred_path).exists():
    print(f"FAIL: Prediction image not found. Got: {pred_path}")
    sys.exit(1)
print(f"OK: Prediction image -> {pred_path}")

# Step 2: Graph model
print("\n[2/3] Running technical graph model...")
graph_path = run_script(GRAPH_SCRIPT, ['XAU/USD', 'XAUUSD'])
if not graph_path or not Path(graph_path).exists():
    print(f"WARNING: Graph image not found. Got: {graph_path}")
    graph_path = None
else:
    print(f"OK: Graph image -> {graph_path}")

# Save result JSON for the backend to pick up
from datetime import datetime
result = {
    'pairCode': 'XAUUSD',
    'symbol': 'XAU/USD',
    'predictionImage': pred_path,
    'graphImage': graph_path,
    'analysis': '[TEST] This is a test analysis from the pipeline.',
    'timestamp': datetime.now().isoformat()
}
result_file = RESULTS_DIR / 'XAUUSD_result.json'
with open(str(result_file), 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
print(f"\nResult JSON saved: {result_file}")

# Step 3: Call backend upload endpoint
print(f"\n[3/3] Calling backend upload endpoint: {BACKEND_URL}/api/daily-analysis/upload")
try:
    resp = requests.post(f"{BACKEND_URL}/api/daily-analysis/upload", timeout=60)
    print(f"Status: {resp.status_code}")
    print(f"Response: {json.dumps(resp.json(), ensure_ascii=False, indent=2)}")
    if resp.status_code == 200 and resp.json().get('processed', 0) > 0:
        print("\n✅ SUCCESS: Image uploaded to Supabase and saved to DB!")
    else:
        print("\n⚠️ WARNING: Backend responded but no items were processed.")
except Exception as e:
    print(f"ERROR calling backend: {e}")
    print("Make sure the backend is running on port 3000 (node src/server.js)")
    print("You can check the result file was created and call the endpoint manually.")

print("\n" + "="*60)
