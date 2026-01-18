#!/usr/bin/env python3
"""
Quick Start Script for XAUUSD Trading Bot
==========================================
This script provides a simple interface to run the trading analysis system.
"""

import os
import sys
import subprocess
from pathlib import Path

def print_header(text):
    """Print formatted header"""
    print("\n" + "="*80)
    print(f"  {text}")
    print("="*80 + "\n")

def print_menu():
    """Display main menu"""
    print_header("XAUUSD TRADING BOT - MAIN MENU")
    print("1. ✅ Run Configuration Check")
    print("2. 📊 Run Manual Analysis (Pipeline)")
    print("3. ⏰ Start Daily Scheduler (8:00 AM)")
    print("4. 📁 Open Data Folder")
    print("5. 📜 View Logs")
    print("6. 📖 View Documentation")
    print("0. ❌ Exit")
    print()

def run_config_check():
    """Run configuration check"""
    print_header("RUNNING CONFIGURATION CHECK")
    root = Path(__file__).parent
    result = subprocess.run(
        [sys.executable, str(root / 'check_config.py')],
        cwd=str(root)
    )
    return result.returncode == 0

def run_pipeline():
    """Run the trading pipeline"""
    print_header("RUNNING TRADING ANALYSIS PIPELINE")
    root = Path(__file__).parent
    ml_models = root / 'ml-models'
    
    result = subprocess.run(
        [sys.executable, str(ml_models / 'daily_trading_pipeline.py')],
        cwd=str(ml_models)
    )
    
    if result.returncode == 0:
        print("\n✅ Pipeline completed successfully!")
        print("\nGenerated files:")
        
        predictions = sorted((root / 'backend' / 'data' / 'predictions').glob('*.png'), 
                            key=lambda x: x.stat().st_mtime, reverse=True)
        if predictions:
            print(f"  📊 Prediction: {predictions[0].name}")
        
        graphs = sorted((root / 'backend' / 'data' / 'graphs').glob('*.png'),
                       key=lambda x: x.stat().st_mtime, reverse=True)
        if graphs:
            print(f"  📈 Graph: {graphs[0].name}")
    else:
        print("\n❌ Pipeline failed. Check logs for details.")
    
    return result.returncode == 0

def run_scheduler():
    """Run the daily scheduler"""
    print_header("STARTING DAILY SCHEDULER")
    print("Scheduler will run trading analysis every day at 8:00 AM")
    print("Press Ctrl+C to stop the scheduler\n")
    
    root = Path(__file__).parent
    ml_models = root / 'ml-models'
    
    try:
        subprocess.run(
            [sys.executable, str(ml_models / 'scheduler.py')],
            cwd=str(ml_models)
        )
    except KeyboardInterrupt:
        print("\n\nScheduler stopped.")
    
    return True

def open_data_folder():
    """Open the data folder in explorer/finder"""
    print_header("OPENING DATA FOLDER")
    root = Path(__file__).parent
    data_path = root / 'backend' / 'data'
    
    try:
        if sys.platform == 'win32':
            os.startfile(str(data_path))
        elif sys.platform == 'darwin':
            subprocess.run(['open', str(data_path)])
        else:
            subprocess.run(['xdg-open', str(data_path)])
        print(f"Opened: {data_path}")
    except Exception as e:
        print(f"Error opening folder: {e}")

def view_logs():
    """Display recent log entries"""
    print_header("VIEWING LOGS")
    root = Path(__file__).parent
    log_files = {
        'Scheduler': root / 'backend' / 'logs' / 'scheduler.log',
        'Application': root / 'backend' / 'logs' / 'app.log',
        'Pipeline': root / 'backend' / 'data' / 'pipeline_summary.json'
    }
    
    for name, path in log_files.items():
        if path.exists():
            print(f"\n📄 {name} ({path})")
            print("-" * 80)
            with open(path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                # Show last 20 lines
                for line in lines[-20:]:
                    print(line.rstrip())
        else:
            print(f"\n📄 {name} - Not found yet")
    
    print()

def view_documentation():
    """Display documentation menu"""
    print_header("DOCUMENTATION")
    print("1. README_SYSTEM.md - System Overview & Features")
    print("2. SETUP_GUIDE.md - Installation & Configuration Guide")
    print("0. Back to main menu")
    print()
    
    choice = input("Select option: ").strip()
    
    if choice == '1':
        os.system('type ml-models/README_SYSTEM.md' if sys.platform == 'win32' 
                 else 'cat ml-models/README_SYSTEM.md')
    elif choice == '2':
        os.system('type SETUP_GUIDE.md' if sys.platform == 'win32' 
                 else 'cat SETUP_GUIDE.md')

def main():
    """Main menu loop"""
    while True:
        print_menu()
        choice = input("Select option (0-6): ").strip()
        
        if choice == '0':
            print("Goodbye! 👋\n")
            break
        elif choice == '1':
            if run_config_check():
                input("\nPress Enter to continue...")
        elif choice == '2':
            if run_pipeline():
                input("\nPress Enter to continue...")
        elif choice == '3':
            run_scheduler()
        elif choice == '4':
            open_data_folder()
            input("\nPress Enter to continue...")
        elif choice == '5':
            view_logs()
            input("Press Enter to continue...")
        elif choice == '6':
            view_documentation()
        else:
            print("❌ Invalid option. Please try again.")
            input("\nPress Enter to continue...")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nProgram interrupted. Goodbye! 👋\n")
        sys.exit(0)
