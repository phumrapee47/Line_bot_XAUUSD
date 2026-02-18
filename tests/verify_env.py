import os
from pathlib import Path
from dotenv import load_dotenv

def verify_env():
    print("="*80)
    print("Environment Variable Verification")
    print("="*80)
    
    project_root = Path(__file__).parent.parent
    dotenv_path = project_root / '.env'
    
    if not dotenv_path.exists():
        print(f"❌ .env file not found at {dotenv_path}")
        return False
    
    load_dotenv(dotenv_path)
    print(f"✅ Loaded .env file from {dotenv_path}")
    
    required_vars = [
        'LINE_CHANNEL_ACCESS_TOKEN',
        'GEMINI_API_KEY',
    ]
    
    optional_vars = [
        'TELEGRAM_BOT_TOKEN',
        'TELEGRAM_USER_ID',
        'LINE_USER_ID'
    ]
    
    missing_required = []
    for var in required_vars:
        if not os.getenv(var):
            missing_required.append(var)
            print(f"❌ Missing required variable: {var}")
        else:
            # Mask the value for security
            val = os.getenv(var)
            masked = val[:5] + "..." + val[-5:] if len(val) > 10 else "***"
            print(f"✅ FOUND: {var} = {masked}")
            
    for var in optional_vars:
        if not os.getenv(var):
            print(f"⚠️ Missing optional variable: {var}")
        else:
            val = os.getenv(var)
            masked = val[:5] + "..." + val[-5:] if len(val) > 10 else "***"
            print(f"✅ FOUND: {var} = {masked}")
            
    if missing_required:
        print("\n❌ VERIFICATION FAILED: Some required environment variables are missing.")
        return False
    
    print("\n✅ VERIFICATION SUCCESSFUL: All core environment variables are set.")
    return True

if __name__ == "__main__":
    verify_env()
