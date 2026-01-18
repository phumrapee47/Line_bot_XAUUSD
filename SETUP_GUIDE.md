# Environment Setup Guide

## 📌 Quick Setup

### 1. Create `.env` file in project root

```bash
cd c:\Users\Asus\Documents\line_bot_XAUUSD
```

Create file `.env` with this content:

```env
# Gemini API Configuration
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
```

### 2. Get API Keys

#### Gemini API Key
1. Visit: https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key and paste to `.env`

#### LINE Channel Access Token
1. Go to: https://developers.line.biz/console/
2. Create a channel or select existing
3. Copy "Channel Access Token" to `.env`
4. Get your "User ID" from LINE Developer Console

### 3. Install Dependencies

```bash
cd ml-models

# Install Python packages
pip install -r requirements.txt
pip install APScheduler
pip install google-generativeai

# Verify installation
python -c "import tensorflow; import yfinance; print('✓ All dependencies installed')"
```

### 4. Create Required Directories

```bash
# These will be created automatically by scripts
mkdir -p backend/data/predictions
mkdir -p backend/data/graphs
mkdir -p backend/logs
```

### 5. Test the System

```bash
# Run manual test
cd ml-models
python daily_trading_pipeline.py

# Check outputs
ls -la ../backend/data/predictions/
ls -la ../backend/data/graphs/
```

---

## 🚀 Run the Scheduler

### Option A: Manual Run (Testing)
```bash
python daily_trading_pipeline.py
```

### Option B: Scheduled Run (Automatic)
```bash
python scheduler.py
# Press Ctrl+C to stop
```

---

## 🔧 Troubleshooting

### Issue: "No module named 'tensorflow'"
```bash
pip install tensorflow
```

### Issue: "No module named 'mplfinance'"
```bash
pip install mplfinance
```

### Issue: "GEMINI_API_KEY not found"
- Verify `.env` file exists in project root
- Check the key is correct
- Try: `echo $GEMINI_API_KEY` (to verify environment variable is set)

### Issue: "yfinance download timeout"
- Check internet connection
- Retry the command
- yfinance sometimes has rate limiting

---

## 📊 System Outputs

After running, check these directories:

```
backend/
├── data/
│   ├── predictions/
│   │   └── xauusd_prediction_20260118.png     ← LSTM model output
│   ├── graphs/
│   │   └── xauusd_graph_20260118.png          ← Technical chart output
│   └── pipeline_summary.json                   ← Daily execution log
└── logs/
    ├── scheduler.log                           ← Scheduler logs
    └── app.log                                 ← Application logs
```

---

## 📝 Example Workflow

```
08:00 AM → Scheduler triggers
    ↓
Step 1: LSTM Price Prediction
    ├─ Download historical data (2011-2019)
    ├─ Train LSTM model
    ├─ Generate prediction chart
    └─ Save: backend/data/predictions/xauusd_prediction_YYYYMMDD.png
    ↓
Step 2: Technical Analysis Chart
    ├─ Download last 60 days data
    ├─ Calculate EMA50, EMA200, MACD
    ├─ Generate candlestick chart
    └─ Save: backend/data/graphs/xauusd_graph_YYYYMMDD.png
    ↓
Step 3: Gemini AI Analysis
    ├─ Load both images
    ├─ Send to Gemini API
    ├─ Receive trading recommendation
    └─ Parse analysis text
    ↓
Step 4: LINE Notification
    ├─ Format message
    ├─ Send to LINE
    └─ Log execution
    ↓
08:30 AM → Complete!
```

---

## 🎯 Testing Each Component

### Test Model 1: LSTM Prediction
```bash
cd ml-models
python model_price_prediction_genarating_img.py
# Check: backend/data/predictions/xauusd_prediction_*.png
```

### Test Model 2: Technical Chart
```bash
cd ml-models
python graph_xauusd_model.py
# Check: backend/data/graphs/xauusd_graph_*.png
```

### Test Model 3: Gemini Analysis
```bash
cd ml-models
python gemini_api_price_prediction.py
# Should print: Analysis text
```

### Test Pipeline: Full Flow
```bash
cd ml-models
python daily_trading_pipeline.py
# Should complete all 3 steps and send LINE notification
```

---

## 🔔 Setting Up Windows Service (Optional)

### Using NSSM (Non-Sucking Service Manager)

1. Download NSSM from: https://nssm.cc/download
2. Extract and add to PATH

```bash
# Install service
nssm install XAUUSDTradingBot "C:\Python39\python.exe" "C:\path\to\scheduler.py"

# Start service
nssm start XAUUSDTradingBot

# Check status
nssm status XAUUSDTradingBot

# View logs
nssm get XAUUSDTradingBot AppDirectory
nssm get XAUUSDTradingBot AppStdout

# Stop service
nssm stop XAUUSDTradingBot

# Remove service
nssm remove XAUUSDTradingBot confirm
```

---

## 📋 Final Verification Checklist

- [ ] `.env` file created with all required keys
- [ ] All Python packages installed (`pip install -r requirements.txt`)
- [ ] Can run: `python daily_trading_pipeline.py` successfully
- [ ] Images are generated in `backend/data/`
- [ ] LINE notification is received
- [ ] Scheduler can start without errors
- [ ] Logs are being written to `backend/logs/`

---

## ✅ You're Ready!

Your XAUUSD Trading Bot is now set up and running. 
The system will automatically:
- ✓ Generate predictions daily
- ✓ Analyze technical indicators
- ✓ Send recommendations via LINE
- ✓ Log all activities

Happy Trading! 📈
