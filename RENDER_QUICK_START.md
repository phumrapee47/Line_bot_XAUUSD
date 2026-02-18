# 📋 Render Deployment - Quick Reference

## 🔥 Deploy in 10 Steps (5 minutes)

### **Step 1: Verify Local Setup**
```bash
cd backend
npm install
npm start
# Should say: "✅ Database connection established successfully"
```

### **Step 2: Commit & Push**
```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

### **Step 3: Create Render Account**
- Go: https://render.com
- Sign with GitHub
- Authorize Render

### **Step 4: Deploy Backend**
1. Click: `New +` → `Web Service`
2. Select: GitHub repo
3. Name: `xauusd-trading-bot`
4. **Build Command**: `cd backend && npm install && node seeds/seedTradingPairs.js`
5. **Start Command**: `cd backend && npm start`
6. Plan: `Free`
7. Click: `Deploy`

### **Step 5: Create PostgreSQL**
1. Click: `New +` → `PostgreSQL`
2. Name: `trading-bot-db`
3. Region: Singapore
4. Plan: Free
5. Click: `Create Database`

### **Step 6: Get Database URL**
1. PostgreSQL service
2. Copy: `Internal Database URL`
3. Paste to Backend Environment

### **Step 7: Add Environment Variables**

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Paste from Step 6 |
| `TELEGRAM_BOT_TOKEN` | 8591121449:AAGUxvbHon29QiTz0MqZqMiYkSbwuwToONI |
| `TELEGRAM_ENABLED` | true |
| `NODE_ENV` | production |

### **Step 8: Verify Deployment**
Wait 2-5 minutes, then check logs:
```
Render Dashboard → xauusd-trading-bot → Logs
```

Look for:
```
✅ Database connection established successfully
Server started on port 3000
```

### **Step 9: Test API**
```bash
curl https://xauusd-trading-bot.onrender.com/api/status
```

Should return:
```json
{ "status": "ok", "database": "connected" }
```

### **Step 10: Test Telegram**
```bash
curl -X POST https://xauusd-trading-bot.onrender.com/api/telegram/subscribe \
  -H "Content-Type: application/json" \
  -d '{"telegramUserId": "123456789", "firstName": "Test"}'
```

---

## 🐛 Troubleshooting 3-Step

**Problem 1: Build fails**
```
✅ Check: npm install locally works
cd backend && npm install
```

**Problem 2: Database connection fails**
```
✅ Check: DATABASE_URL is set
Render Dashboard → Backend → Environment → DATABASE_URL (should have value)
```

**Problem 3: Tables not found**
```
✅ Check: Seed ran
Manual Deploy → Watch for "Adding trading pair..."
If not there, rebuild
```

---

## 📊 Architecture

```
Your GitHub Repo
       ↓ (git push)
   Webhook
       ↓
Render.com
├─ PostgreSQL Database
├─ Node.js Backend (port 3000)
└─ Python Scheduler (optional)
       ↓
   Live on internet! 🎉
```

---

## 🌍 Your Live URLs

**After deployment, access:**

- Frontend: `https://xauusd-trading-bot.onrender.com`
- API: `https://xauusd-trading-bot.onrender.com/api/status`
- Database: From `DATABASE_URL` environment variable

---

## ⚙️ Key Files Modified

| File | Change |
|------|--------|
| `backend/package.json` | Added `pg`, `pg-hstore` |
| `backend/src/config/database.js` | PostgreSQL config |
| `render.yaml` | Added PostgreSQL service |
| `backend/seeds/seedTradingPairs.js` | Auto-populate 7 pairs |

---

## 🔒 Security Checklist

- ✅ Never commit `.env` file
- ✅ Render auto-injects environment variables
- ✅ Used GitHub OAuth (no password needed)
- ✅ SSL automatic (https enabled)
- ✅ Database password auto-generated

---

## 💡 After Deployment

### **What to Do Next:**

1. **Frontend Settings UI** (Coming)
   - User can select trading pairs
   - Adjust notification preferences
   - Change technical parameters

2. **Backend Multi-Pair Logic** (Coming)
   - Apply user preferences
   - Send signals to correct users
   - Per-pair thresholds

3. **Monitoring** (Coming)
   - Setup alerts
   - Monitor database size
   - Watch subscription growth

---

## 📞 Common Commands

### **View Live Logs**
```
Render Dashboard → Service → Logs
```

### **Restart Service**
```
Render Dashboard → Service → Manual Deploy
```

### **Check Database**
```bash
# Get connection URL from Render
psql $DATABASE_URL

# In psql:
\dt              # List tables
SELECT COUNT(*) FROM trading_pairs;
\q              # Exit
```

### **View All Subscribers**
```bash
curl https://xauusd-trading-bot.onrender.com/api/telegram/list
```

---

## 💰 Costs (Free Tier)

| Service | Limit |
|---------|-------|
| Backend | 0.5 GB RAM |
| PostgreSQL | 1 GB storage |
| Both running 24/7 | ✅ Free (auto-sleep after 15 min inactivity) |

**Upgrade to Starter: $7/month** if you need 24/7 uptime

---

## 🎯 Status Indicators

- 🟢 **Live** = Ready to use
- 🟡 **Deploying** = Wait 2-5 minutes
- 🔴 **Failed** = Check render logs & fix error

---

## ❌ If Stuck

1. Check Backend logs: `curl https://your-service.onrender.com/api/status`
2. Check Database: `psql $DATABASE_URL -c "\dt"`
3. Manual rebuild: Render Dashboard → Manual Deploy
4. Nuke & restart: Delete service, delete DB, redeploy

---

## ✨ Quick Wins

✅ Takes 5 minutes
✅ Zero manual setup (auto-seeding)
✅ No credit card needed
✅ Auto-scales to load
✅ Automatic SSL
✅ Git-based CI/CD

---

## 📎 Useful Links

- Render Console: https://dashboard.render.com
- PostgreSQL Docs: https://render.com/docs/databases
- Node.js on Render: https://render.com/docs/deploy-node
- Python on Render: https://render.com/docs/deploy-python

---

**Ready? Go deploy! 🚀**
