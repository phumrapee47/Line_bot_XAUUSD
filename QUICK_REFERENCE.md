QUICK REFERENCE - XAUUSD TRADING BOT
================================================================================

CURRENT STATUS: 95% COMPLETE - TEXT DELIVERY WORKING ✅
Generated: 2026-01-18

================================================================================
QUICK FACTS
================================================================================

Current Status: ✅ WORKING
Last Prediction: $4566.98 (2026-01-18)
Graph Generated: xauusd_graph_20260118.png (1083 candles)
LINE Delivery: ✅ HTTP 200 OK - Text working
Image Delivery: ⏳ Pending (need Imgur Client ID)
Daily Schedule: 08:00 AM Thailand Time
Broadcast: ✅ Sending to ALL followers


================================================================================
QUICK START COMMANDS
================================================================================

TEST EVERYTHING NOW:
  cd c:\Users\Asus\Documents\line_bot_XAUUSD\ml-models
  python send_to_line.py
  
  ⏳ Wait ~15 seconds...
  ✅ Check your LINE for message


RUN DAILY (08:00 AM AUTOMATIC):
  cd c:\Users\Asus\Documents\line_bot_XAUUSD\ml-models
  python scheduler.py
  
  (Keep this terminal open - or deploy as Windows Service)


GENERATE PREDICTION:
  python model_price_prediction_genarating_img.py


GENERATE CHART:
  python graph_xauusd_model.py


RUN FULL PIPELINE:
  python daily_trading_pipeline.py


================================================================================
FILES THAT MATTER
================================================================================

📁 Core Scripts:
  └─ ml-models/
      ├─ send_to_line.py ..................... [MAIN] Send signals to LINE
      ├─ scheduler.py ........................ [DAILY] Auto-run at 08:00 AM
      ├─ daily_trading_pipeline.py ........... [FULL] All 4 steps
      ├─ model_price_prediction_genarating_img.py [LSTM] Price prediction
      ├─ graph_xauusd_model.py ............... [CHART] Technical analysis
      └─ gemini_api_price_prediction.py ..... [AI] Analyze images

📁 Output Files (Generated Daily):
  └─ backend/data/
      ├─ predictions/
      │   └─ xauusd_prediction_YYYYMMDD.png [LSTM chart]
      └─ graphs/
          └─ xauusd_graph_YYYYMMDD.png [Technical chart]

📁 Configuration:
  ├─ .env ............................... [SETTINGS] API keys, tokens
  ├─ logs/scheduler.log ................. [SCHEDULE] Daily run history
  └─ logs/combined.log .................. [ERRORS] System logs


================================================================================
WHAT HAPPENS IN EACH STEP
================================================================================

STEP 1: LSTM PREDICTION (Python → TensorFlow)
  Input: Historical gold prices (2011-2019)
  Process: 2-layer LSTM neural network predicts tomorrow's price
  Output: xauusd_prediction_YYYYMMDD.png (chart image)
  Time: ~5 seconds
  Accuracy: RMSE 10.05 (very accurate)

STEP 2: TECHNICAL CHART (Python → matplotlib)
  Input: Last 1083 hours of XAUUSD prices from yfinance
  Process: Calculate EMA50, EMA200, MACD indicators
  Output: xauusd_graph_YYYYMMDD.png (technical chart)
  Time: ~3 seconds
  Features: Candlesticks + 3 indicators + trend lines

STEP 3: GEMINI AI ANALYSIS (Google API)
  Input: 2 PNG images (prediction + chart)
  Process: Gemini AI analyzes images, generates Thai signals
  Output: Trading recommendation (TP, SL, Entry, Trend, RR)
  Time: ~2 seconds
  Language: Thai

STEP 4: SEND TO LINE (LINE Bot API)
  Input: Gemini analysis text
  Process: Format message, upload images (if enabled), send broadcast
  Output: Message appears on all LINE followers' phones
  Time: <1 second
  Status: ✅ HTTP 200 OK


================================================================================
SIGNAL CONTENT (WHAT LINE RECEIVES)
================================================================================

Each message includes:

1️⃣ TREND SIGNAL
   Example: UPTREND / DOWNTREND / NEUTRAL

2️⃣ TAKE PROFIT (TP)
   Example: 4520-4530 (target sell price)

3️⃣ STOP LOSS (SL)
   Example: 4480-4490 (risk management level)

4️⃣ ENTRY POINT
   Example: Market or 4500 (when to buy)

5️⃣ RISK-REWARD (RR)
   Example: 1:3 (can win 3x what you risk)

6️⃣ CONTEXT
   • Economic calendar info
   • News impact
   • Confidence level


================================================================================
CONFIGURATION CHECKLIST
================================================================================

✅ REQUIRED (Already Set Up):

[✅] LINE_CHANNEL_ACCESS_TOKEN
     Status: Valid (172 chars)
     Purpose: Send messages to LINE

[✅] LINE_CHANNEL_SECRET
     Status: Valid
     Purpose: Webhook security

[✅] GEMINI_API_KEY
     Status: Valid (39 chars)
     Purpose: AI analysis engine

[✅] USE_BROADCAST
     Status: true
     Effect: Send to ALL followers

⏳ OPTIONAL (For Image Display):

[⏳] IMGUR_CLIENT_ID
     Current: "your_imgur_client_id_here"
     Purpose: Host images on HTTPS (required by LINE)
     Action: Get real ID from https://imgur.com/register/api
     Impact: Without this, images won't show (text only)


================================================================================
NEXT STEPS
================================================================================

TODAY (5 minutes):
  1. Run: python send_to_line.py
  2. Check LINE for message
  3. Verify format looks good

THIS WEEK (Optional but Recommended):
  1. Get Imgur Client ID (5 minutes)
     └─ https://imgur.com/register/api
  2. Add to .env file
  3. Re-run: python send_to_line.py
  4. Images should now appear

THIS MONTH (Production Deployment):
  1. Deploy scheduler as Windows Service
     └─ Use NSSM (see PROJECT_SUMMARY.md)
  2. Runs automatically every day at 08:00 AM
  3. Monitor logs/scheduler.log


================================================================================
TROUBLESHOOTING
================================================================================

Problem: send_to_line.py fails to run
  Fix 1: pip install requests google-generativeai python-dotenv
  Fix 2: Verify .env file exists: ls .env
  Fix 3: Check current directory: pwd (should be ml-models folder)

Problem: No message appears on LINE
  Fix 1: Check token is valid: grep LINE_CHANNEL_ACCESS_TOKEN .env
  Fix 2: Check USE_BROADCAST=true (not false)
  Fix 3: Verify you're in the LINE channel

Problem: Images not showing on LINE
  Fix 1: Add Imgur Client ID to .env
  Fix 2: Run: python send_to_line.py
  Fix 3: Look for: [OK] Uploaded: https://imgur.com/...

Problem: Scheduler not running at 08:00 AM
  Fix 1: Keep terminal open OR deploy as Windows Service
  Fix 2: Check logs: type logs/scheduler.log
  Fix 3: Verify time zone matches Thailand (UTC+7)

Problem: "No module named" error
  Fix 1: pip install tensorflow keras scikit-learn pandas numpy
  Fix 2: pip install yfinance matplotlib mplfinance
  Fix 3: pip install google-generativeai requests python-dotenv apscheduler


================================================================================
KEY NUMBERS
================================================================================

Prediction Accuracy: RMSE 10.05 (Gold price prediction error)
Data Points: 1083 hourly candles (last 45 days)
Training Data: 1000+ prices from 2011-2019
API Response Time: ~2 seconds (Gemini analysis)
Total Pipeline Time: ~11 seconds
Execution Frequency: 1x per day at 08:00 AM
Broadcast Recipients: ALL followers in LINE channel (no limit)
File Sizes:
  - Prediction chart: 74.7 KB
  - Technical chart: 136.5 KB


================================================================================
FILE LOCATIONS
================================================================================

Project Root: c:\Users\Asus\Documents\line_bot_XAUUSD\

Key Folders:
  ml-models/ ...................... Python scripts
  backend/data/predictions/ ....... LSTM output charts
  backend/data/graphs/ ............ Technical analysis charts
  logs/ ........................... Run history and errors
  .env ............................ Configuration (API keys)

Output Files (Today):
  - backend/data/predictions/xauusd_prediction_20260118.png
  - backend/data/graphs/xauusd_graph_20260118.png


================================================================================
WHO TO CONTACT IF SOMETHING BREAKS
================================================================================

Error in prediction: Check logs/combined.log or error.log
Error in chart: Check yfinance connection (internet issue)
Error in analysis: Check GEMINI_API_KEY is valid
Error in LINE delivery: Check LINE_CHANNEL_ACCESS_TOKEN
Error in scheduler: Check logs/scheduler.log

Quick diagnostic:
  cd c:\Users\Asus\Documents\line_bot_XAUUSD\ml-models
  python -c "import tensorflow; import yfinance; import google.generativeai; print('[OK] All imports successful')"


================================================================================
REMEMBER
================================================================================

⏰ DAILY SCHEDULE: 08:00 AM Thailand Time (UTC+7)
📍 BROADCAST: Goes to ALL followers (not individual)
🔐 SECURITY: Never share .env file (contains API keys)
🐛 LOGS: Check logs/ folder when something doesn't work
✅ TEST: Always run python send_to_line.py before deploying to production


================================================================================
END OF QUICK REFERENCE
================================================================================
