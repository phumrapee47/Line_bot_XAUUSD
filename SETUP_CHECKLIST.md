## 📋 Setup Checklist

Use this to verify everything is ready:

### ✅ Files Created
- [x] `.env` - Environment configuration
- [x] `.gitignore` - Git ignore rules
- [x] `README.md` - Full documentation
- [x] `QUICKSTART.md` - 5-minute setup guide
- [x] `package.json` - Node.js dependencies
- [x] `setup.bat` - Windows setup script
- [x] `setup.sh` - Linux/Mac setup script
- [x] `ml-models/requirements.txt` - Python dependencies
- [x] `backend/logs/` - Log directory

### ✅ Backend Files
- [x] `src/server.js` - Express server (READY)
- [x] `src/config/config.js` - Configuration (READY)
- [x] `src/utils/logger.js` - Logging (READY)
- [x] `src/models/pythonBridge.js` - Python execution (READY)
- [x] `src/services/tradingSignal.js` - Main logic (READY)
- [x] `src/services/technicalAnalysis.js` - Technical module (READY)
- [x] `src/services/newsAnalysis.js` - News module (READY)
- [x] `src/services/lineNotifier.js` - LINE notifications (READY)

### ✅ ML Models
- [x] `news_model.py` - News sentiment analysis (READY)
- [x] `technical_model.py` - XGBoost predictions (READY)

### ⚠️ TODO - Manual Steps

1. **Get ML Model File**
   - [ ] Train XGBoost model or download pre-trained
   - [ ] Save as `ml-models/gold_ml_model_selected.pkl`
   - [ ] This file is NOT included (too large for repo)

2. **Configure LINE Token**
   - [ ] Visit https://notify-bot.line.me/
   - [ ] Generate personal notification token
   - [ ] Add to `.env`: `LINE_NOTIFY_TOKEN=your_token`

3. **Install Dependencies**
   ```bash
   # Option A: Run setup script
   setup.bat          # Windows
   bash setup.sh      # macOS/Linux
   
   # Option B: Manual install
   cd backend
   npm install
   cd ../ml-models
   pip install -r requirements.txt
   ```

4. **Start Bot**
   ```bash
   cd backend
   npm start          # Production
   npm run dev        # Development (with auto-reload)
   ```

### 📊 System Architecture

```
User/Mobile (LINE)
        ↓
   LINE Notify API
        ↓
   Node.js Server (3000)
   ├─ POST /api/check-signal
   ├─ GET /api/status
   └─ GET /health
        ↓ (spawns child processes)
   Python Scripts
   ├─ technical_model.py → XGBoost prediction
   └─ news_model.py → Sentiment analysis
        ↓
   External APIs
   ├─ yfinance (Gold data)
   ├─ FXStreet RSS (News)
   └─ feedparser (News parsing)
```

### 🔧 Configuration Options

Edit `.env` to customize:

```env
# Notification
LINE_NOTIFY_TOKEN=required

# Model weights (must sum to 1.0)
TECHNICAL_WEIGHT=0.6    # 60% technical analysis
NEWS_WEIGHT=0.4         # 40% news sentiment

# Trading thresholds
BUY_THRESHOLD=0.60      # Score > 60% = BUY
SELL_THRESHOLD=0.40     # Score < 40% = SELL
                        # Between = HOLD

# Scheduler
CHECK_INTERVAL_MINUTES=60

# Server
PORT=3000
NODE_ENV=development
```

### 📈 What the Bot Does

1. **Every 60 minutes (configurable):**
   - Fetch last 90 days gold hourly data
   - Calculate 6 technical indicators
   - XGBoost predicts price direction (0-1 probability)
   - Fetch latest gold news from FXStreet
   - Sentiment analysis on news (0-1 score)

2. **Combine signals:**
   - Final Score = (Tech × 0.6) + (News × 0.4)
   - If Score > 0.60 → Send BUY signal
   - If Score < 0.40 → Send SELL signal
   - Else → HOLD (no notification)

3. **Send LINE notification with:**
   - Signal (BUY/SELL/HOLD)
   - Confidence percentage
   - Take Profit level
   - Stop Loss level
   - Current price

### 🐛 If Something Goes Wrong

**Check logs first:**
```bash
tail -f backend/logs/combined.log
```

**Common errors:**

| Error | Fix |
|-------|-----|
| `Cannot find module 'express'` | Run `npm install` in backend/ |
| `Python3 not found` | Install Python 3.8+ |
| `gold_ml_model_selected.pkl not found` | Provide trained model file |
| `LINE notification failed` | Check token in .env |
| `yfinance rate limit` | Wait 1 minute, try again |

### 🚀 Ready to Go?

Once you've completed the TODO section above, run:

```bash
cd backend
npm start
```

Bot will start checking gold prices and sending signals to your LINE! 🥇

---

**Next:** Follow QUICKSTART.md for detailed setup instructions.
