# 🚀 Quick Start Guide

## 5-Minute Setup

### 1. Get LINE Notify Token
1. Go to https://notify-bot.line.me/
2. Click "Log in with LINE"
3. Click "Generate Token"
4. Copy the token

### 2. Configure
```bash
# Windows: Open .env in your editor and fill in:
LINE_NOTIFY_TOKEN=your_token_here

# Or use this command:
# echo LINE_NOTIFY_TOKEN=your_token_here >> .env
```

### 3. Install Dependencies
```bash
# Windows
setup.bat

# macOS/Linux
bash setup.sh
```

### 4. Start
```bash
cd backend
npm start
```

You should see:
```
✅ Server started on port 3000
🚀 Gold Trading System Started!
Scheduled to run every 60 minutes
```

## Test It

### Check Health
```bash
curl http://localhost:3000/health
```

### Trigger Manual Check
```bash
curl -X POST http://localhost:3000/api/check-signal
```

### Check Status
```bash
curl http://localhost:3000/api/status
```

## Expected Output

When a trading signal is triggered, you'll receive a LINE message:
```
🔔 Gold Trading Signal 🔔
━━━━━━━━━━━━━━━━━━
Signal: 🟢 BUY
Confidence: 72.50%

📊 Technical Score: 75.00%
📰 News Score: 65.00%

💰 Current Price: $2045.50
🎯 Take Profit: $2050.20
🛡️ Stop Loss: $2040.80

⏰ Time: 2025-12-20 10:30:00
━━━━━━━━━━━━━━━━━━
```

## Troubleshooting

### Error: "gold_ml_model_selected.pkl not found"
- You need to train the XGBoost model or download a pre-trained one
- The model should be placed in `ml-models/` directory
- It predicts gold price direction from technical indicators

### Error: "LINE notification failed"
- Verify token is correct in `.env`
- Make sure token hasn't expired
- Check your internet connection

### Error: "Python not found"
- Install Python 3.8+: https://www.python.org/downloads/
- Add to PATH: `python --version` should work in terminal

### Error: "yfinance can't fetch data"
- Network issue or rate limit
- Wait a few minutes and try again
- Check if yfinance service is up

## Next Steps

1. **Wait for signals**: Bot runs every 60 minutes by default
2. **Monitor logs**: Check `backend/logs/combined.log`
3. **Customize**: Edit `.env` to adjust thresholds and intervals
4. **Improve**: Train your own ML model with better data

## Customize Settings

Edit `.env`:
```env
# More frequent checks (every 30 min)
CHECK_INTERVAL_MINUTES=30

# More strict BUY signal (higher confidence needed)
BUY_THRESHOLD=0.70

# More lenient SELL signal
SELL_THRESHOLD=0.30

# Favor technical analysis more
TECHNICAL_WEIGHT=0.7
NEWS_WEIGHT=0.3
```

## Deploy to Cloud

### Heroku
```bash
heroku login
heroku create your-gold-bot
git push heroku main
heroku config:set LINE_NOTIFY_TOKEN=your_token
heroku logs -t
```

### Railway
1. Connect GitHub repo
2. Add environment variables in Dashboard
3. Deploy!

### AWS Lambda + API Gateway
- Wrap server.js for serverless
- Use CloudWatch for scheduling

## Support

Check logs:
```bash
tail -f backend/logs/combined.log
```

Common issues are logged with details. Share logs (without token) for help.

---
Happy trading! 🚀
