#!/usr/bin/env python3
"""
Configuration Helper for XAUUSD Trading Bot
============================================
This script helps you set up and verify the configuration.
"""

import os
import sys
from pathlib import Path

def check_env_file():
    """Check if .env file exists"""
    env_path = Path(os.path.dirname(__file__)) / '.env'
    
    print("\n" + "="*80)
    print("CHECKING .env FILE")
    print("="*80)
    
    if env_path.exists():
        print(f"✅ .env file found at: {env_path}")
        
        # Check for required keys
        required_keys = [
            'GEMINI_API_KEY',
            'LINE_CHANNEL_ACCESS_TOKEN'
        ]
        
        with open(env_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        missing_keys = []
        for key in required_keys:
            if key in content:
                print(f"   ✅ {key} is defined")
            else:
                print(f"   ❌ {key} is MISSING")
                missing_keys.append(key)
        
        if missing_keys:
            print(f"\n⚠️  Missing keys: {', '.join(missing_keys)}")
            print("Please add these to your .env file")
            return False
        else:
            print("\n✅ All required keys are present")
            return True
    else:
        print(f"❌ .env file NOT found at: {env_path}")
        print("\nCreating template .env file...")
        
        template = """# Gemini API Configuration
GEMINI_API_KEY=your_actual_gemini_api_key_here

# LINE Configuration
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_USER_ID=your_user_id_for_notifications

# (Optional) Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=trading_bot
"""
        
        with open(env_path, 'w') as f:
            f.write(template)
        
        print(f"📄 Template created at: {env_path}")
        print("Please edit this file and add your API keys")
        return False

def check_directories():
    """Check if required directories exist"""
    print("\n" + "="*80)
    print("CHECKING DIRECTORIES")
    print("="*80)
    
    dirs = [
        'backend/data/predictions',
        'backend/data/graphs',
        'backend/logs',
        'ml-models'
    ]
    
    root = Path(os.path.dirname(__file__))
    
    for dir_path in dirs:
        full_path = root / dir_path
        if full_path.exists():
            print(f"✅ {dir_path}")
        else:
            print(f"📁 Creating {dir_path}")
            full_path.mkdir(parents=True, exist_ok=True)
            print(f"   ✅ Created")
    
    return True

def check_python_packages():
    """Check if required Python packages are installed"""
    print("\n" + "="*80)
    print("CHECKING PYTHON PACKAGES")
    print("="*80)
    
    required_packages = {
        'tensorflow': 'TensorFlow',
        'sklearn': 'Scikit-learn',
        'pandas': 'Pandas',
        'numpy': 'NumPy',
        'matplotlib': 'Matplotlib',
        'yfinance': 'yfinance',
        'requests': 'Requests',
        'google.generativeai': 'Google Generative AI',
        'PIL': 'Pillow',
        'mplfinance': 'mplfinance',
        'apscheduler': 'APScheduler'
    }
    
    missing = []
    for package, name in required_packages.items():
        try:
            __import__(package)
            print(f"✅ {name}")
        except ImportError:
            print(f"❌ {name} (missing)")
            missing.append(package)
    
    if missing:
        print(f"\n⚠️  Missing packages: {', '.join(missing)}")
        print("\nInstall with:")
        print(f"pip install {' '.join(missing)}")
        return False
    else:
        print("\n✅ All required packages are installed")
        return True

def check_ml_models():
    """Check if ML model scripts exist"""
    print("\n" + "="*80)
    print("CHECKING ML MODEL SCRIPTS")
    print("="*80)
    
    scripts = [
        'ml-models/model_price_prediction_genarating_img.py',
        'ml-models/graph_xauusd_model.py',
        'ml-models/gemini_api_price_prediction.py',
        'ml-models/daily_trading_pipeline.py',
        'ml-models/scheduler.py'
    ]
    
    root = Path(os.path.dirname(__file__))
    
    for script in scripts:
        full_path = root / script
        if full_path.exists():
            print(f"✅ {script}")
        else:
            print(f"❌ {script} (missing)")
    
    return all((root / script).exists() for script in scripts)

def main():
    """Run all checks"""
    print("\n" + "="*80)
    print("XAUUSD TRADING BOT - CONFIGURATION CHECKER")
    print("="*80)
    
    results = {
        '.env file': check_env_file(),
        'Directories': check_directories(),
        'Python packages': check_python_packages(),
        'ML model scripts': check_ml_models()
    }
    
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    
    for check_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{check_name}: {status}")
    
    all_passed = all(results.values())
    
    print("\n" + "="*80)
    if all_passed:
        print("✅ ALL CHECKS PASSED - SYSTEM IS READY!")
        print("\nYou can now run:")
        print("  python ml-models/daily_trading_pipeline.py    # Manual run")
        print("  python ml-models/scheduler.py                 # Automated daily")
    else:
        print("❌ SOME CHECKS FAILED - PLEASE FIX AND TRY AGAIN")
    print("="*80 + "\n")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
