#!/usr/bin/env python3
"""
Gemini Analysis Wrapper - Find and analyze the latest images
"""

import os
import sys
from pathlib import Path
from datetime import datetime

# Get project root
project_root = Path(__file__).parent.parent
predictions_dir = project_root / 'backend' / 'data' / 'predictions'
graphs_dir = project_root / 'backend' / 'data' / 'graphs'

print("="*80)
print("XAUUSD Trading Analysis using Gemini AI")
print("="*80)

# Find latest prediction image
print("\n[1] Looking for prediction image...")
prediction_files = sorted(predictions_dir.glob('xauusd_prediction_*.png'), key=lambda x: x.stat().st_mtime, reverse=True)
if not prediction_files:
    print(f"[ERROR] No prediction images found in {predictions_dir}")
    sys.exit(1)

prediction_img = str(prediction_files[0])
print(f"[OK] Found: {prediction_img}")

# Find latest graph image
print("\n[2] Looking for graph image...")
graph_files = sorted(graphs_dir.glob('xauusd_graph_*.png'), key=lambda x: x.stat().st_mtime, reverse=True)
if not graph_files:
    print(f"[ERROR] No graph images found in {graphs_dir}")
    sys.exit(1)

graph_img = str(graph_files[0])
print(f"[OK] Found: {graph_img}")

# Import and run Gemini analysis
print("\n[3] Sending images to Gemini API...")
try:
    from gemini_api_price_prediction import main as gemini_main
    
    analysis = gemini_main(prediction_img, graph_img)
    
    if analysis:
        print("\n" + "="*80)
        print("[RESULT] GEMINI AI ANALYSIS")
        print("="*80)
        print(analysis)
        print("="*80)
    else:
        print("[ERROR] Failed to get analysis from Gemini")
        sys.exit(1)
        
except Exception as e:
    print(f"[ERROR] {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
