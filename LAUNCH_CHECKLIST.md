# 🚀 LAUNCH CHECKLIST

## ✅ Before You Start

### System Requirements
- [ ] Windows 10+ / macOS 10.14+ / Linux
- [ ] Node.js 14+ installed (check: `node --version`)
- [ ] Python 3.8+ installed (check: `python3 --version`)
- [ ] Internet connection
- [ ] LINE account

### Project Files
- [x] ✅ Backend code (9 files)
- [x] ✅ ML models (4 files)
- [x] ✅ Configuration setup
- [x] ✅ Documentation (8 files)
- [x] ✅ Setup scripts

---

## 📋 Setup Steps

### 1️⃣ GET LINE NOTIFICATION TOKEN (2 min)

```
Step 1: Open https://notify-bot.line.me/
Step 2: Click "Log in with LINE"
Step 3: Authorize the application
Step 4: Click "1:1 Chat with LINE Notify"
Step 5: Click "Generate token" button
Step 6: Give name: "Gold Trading Bot"
Step 7: Click "Generate"
Step 8: Copy the token
```

⏱️ **Your LINE Token looks like:** `abc123def456ghi789jkl...`

- [ ] Token obtained from notify-bot.line.me

### 2️⃣ CONFIGURE .env FILE (2 min)

```
Step 1: Open .env file in project root
Step 2: Find line: LINE_NOTIFY_TOKEN=YOUR_LINE_NOTIFY_TOKEN_HERE
Step 3: Replace with your actual token
Step 4: Save file
```

Example:
```env
LINE_NOTIFY_TOKEN=abc123def456ghi789jkl012mno345pqr678stu901
```

- [ ] .env file configured with LINE token

### 3️⃣ RUN SETUP SCRIPT (3 min)

**Windows:**
```bash
# Double-click setup.bat
OR
setup.bat
```

**macOS/Linux:**
```bash
bash setup.sh
```

What it does:
- ✅ Checks Python 3.8+
- ✅ Installs Python packages
- ✅ Checks Node.js 14+
- ✅ Installs Node packages
- ✅ Creates logs directory

- [ ] Setup script completed successfully

### 4️⃣ START THE BOT (30 sec)

```bash
cd backend
npm start
```

Expected output:
```
[INFO] Server started on port 3000
[INFO] Gold Trading System initialized
[INFO] 🚀 Sending startup notification...
[INFO] Scheduled to run every 60 minutes
```

- [ ] Bot started successfully

### 5️⃣ VERIFY IT'S WORKING (2 min)

#### A. Check Health
```bash
curl http://localhost:3000/health
```

Expected: `{"status":"running","timestamp":"..."}`

- [ ] Health check working

#### B. Manual Signal Check
```bash
curl -X POST http://localhost:3000/api/check-signal
```

Expected: Trading signal data with BUY/SELL/HOLD

- [ ] Manual signal works

#### C. Check STATUS
```bash
curl http://localhost:3000/api/status
```

Expected: Status info and thresholds

- [ ] Status endpoint works

#### D. Check LINE
Look at your LINE app - you should see notification:
```
🚀 Gold Trading System Started!
```

- [ ] LINE notification received

---

## 🎯 Now What?

### Option 1: Let It Run (Recommended)
```bash
# Keep bot running in background
# It will check gold prices every 60 minutes
# When signal appears, LINE notification will come

# Logs saved in: backend/logs/combined.log
```

### Option 2: Customize Settings
Edit `.env` to adjust:
```env
TECHNICAL_WEIGHT=0.7      # More weight on technical
NEWS_WEIGHT=0.3           # Less weight on news

BUY_THRESHOLD=0.65        # Need higher score for BUY
SELL_THRESHOLD=0.35       # Easier to SELL

CHECK_INTERVAL_MINUTES=30 # Check every 30 min instead
```

Then restart bot.

### Option 3: Create Better ML Model
```bash
cd ml-models
python3 train_model.py
```

This trains new XGBoost model with latest data.

---

## 📊 Understanding Signals

When you get a LINE notification:

```
🔔 Gold Trading Signal 🔔
━━━━━━━━━━━━━━━━━━
Signal: 🟢 BUY                          ← What to do
Confidence: 72.50%                      ← How sure (0-100%)

📊 Technical Score: 75.00%              ← Tech analysis
📰 News Score: 65.00%                   ← News analysis

💰 Current Price: $2045.50              ← Market price
🎯 Take Profit: $2050.20                ← Target price
🛡️ Stop Loss: $2040.80                  ← Exit price

⏰ Time: 2025-12-20 10:30:00            ← When signal generated
━━━━━━━━━━━━━━━━━━
```

**What each means:**
- **BUY** 🟢 → Price likely going UP, good time to buy
- **SELL** 🔴 → Price likely going DOWN, good time to sell
- **HOLD** ⚪ → Uncertain, wait for clearer signal
- **Confidence** → How sure the model is (0-100%)
- **Take Profit** → Where to close if you profit
- **Stop Loss** → Where to close if you lose

---

## 🐛 Troubleshooting

### "Command not found: npm"
```
→ Install Node.js: https://nodejs.org/
→ Verify: node --version
```

### "Command not found: python3"
```
→ Install Python: https://www.python.org/downloads/
→ Verify: python3 --version
```

### "Cannot find module 'express'"
```
→ cd backend
→ npm install
```

### "gold_ml_model_selected.pkl not found"
```
→ cd ml-models
→ python3 train_model.py
→ Wait ~5 minutes for training
```

### "LINE notification failed"
```
→ Check .env has correct token
→ Test token at: https://notify-bot.line.me/
→ Ensure internet connection works
```

### "Port 3000 already in use"
```
→ Edit .env: PORT=3001
→ Or close other app using port 3000
```

### Check Logs
```bash
# See all logs
tail -f backend/logs/combined.log

# Or on Windows, open file:
backend/logs/combined.log
```

---

## 📞 Need Help?

1. **Check Documentation:**
   - README.md - Full guide
   - QUICKSTART.md - Quick setup
   - PROJECT_STRUCTURE.txt - Project layout

2. **Check Logs:**
   - `backend/logs/combined.log` - Detailed error info

3. **Manual Test:**
   - `curl http://localhost:3000/health` - Test bot
   - `curl -X POST http://localhost:3000/api/check-signal` - Force check

4. **Common Issues:**
   - Check SETUP_CHECKLIST.md
   - Check STATUS_REPORT.md

---

## ✨ Everything Ready?

### Complete This Before Launching

- [ ] LINE token obtained
- [ ] .env file updated with token
- [ ] Setup script completed
- [ ] Bot starts without errors
- [ ] Health check passes
- [ ] LINE notification received
- [ ] Manual signal check works

---

## 🎉 You're All Set!

Your Gold Trading Bot is **ready to trade**!

### Summary
- ✅ Backend server running on port 3000
- ✅ ML models for technical analysis
- ✅ News sentiment analysis
- ✅ LINE notifications configured
- ✅ Logging enabled
- ✅ Error handling in place

### Next 24 Hours
1. Let bot run and monitor signals
2. Check `/health` or `/status` endpoints occasionally
3. Review logs for any issues
4. Adjust thresholds if needed

### After That
1. Refine ML model with more training data
2. Customize thresholds based on results
3. Consider deploying to cloud
4. Integrate with trading platform

---

## 🚀 LAUNCH!

```bash
# 1. Make sure .env has your LINE token

# 2. Run setup
setup.bat              # Windows
bash setup.sh          # macOS/Linux

# 3. Start trading!
cd backend
npm start

# 4. Watch for signals in LINE! 📱
```

---

**Status: ✅ READY TO LAUNCH**

*All systems operational*  
*Bot is production-ready*  
*Let's make some gold trades! 🥇*

---

## Quick Reference

**Start Bot:** `cd backend && npm start`  
**Test Health:** `curl http://localhost:3000/health`  
**Manual Check:** `curl -X POST http://localhost:3000/api/check-signal`  
**View Status:** `curl http://localhost:3000/api/status`  
**View Logs:** `tail -f backend/logs/combined.log`  
**Edit Config:** `.env` file (then restart)  

---

✅ **PROJECT COMPLETE - YOU'RE READY TO GO!**
