# 🌐 Render.com Deployment Guide (PostgreSQL)

## 📊 Architecture

```
┌─────────────────────────────────────────┐
│        Render.com Deployment             │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐  │
│  │ PostgreSQL Database             │  │
│  │ (trading-bot-db)                │  │
│  │ Free Plan: 1 GB                 │  │
│  └─────────────────────────────────┘  │
│                 ▲                      │
│                 │                      │
│  ┌─────────────────────────────────┐  │
│  │ Node.js Backend                 │  │
│  │ (xauusd-trading-bot)            │  │
│  │ PORT: 3000                      │  │
│  │ npm start                       │  │
│  └─────────────────────────────────┘  │
│                 ▲                      │
│                 │                      │
│  ┌─────────────────────────────────┐  │
│  │ Python Scheduler (Background)   │  │
│  │ (xauusd-python-scheduler)       │  │
│  │ Runs: python scheduler.py       │  │
│  └─────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🚀 Step-by-Step Deployment

### **ขั้นตอนที่ 1: Push Code to GitHub**

```bash
git add .
git commit -m "Migrate to PostgreSQL and update Render config"
git push origin main
```

---

### **ขั้นตอนที่ 2: Create Render Account**

1. ไป https://render.com
2. Click `Sign up` (ใช้ GitHub account)
3. Authorize Render to access GitHub

---

### **ขั้นตอนที่ 3: Connect GitHub Repository**

1. ใน Render Dashboard
2. Click `New +` > `Web Service`
3. Select GitHub repository
4. Connect

---

### **ขั้นตอนที่ 4: Configure Backend Service**

**Name**: xauusd-trading-bot

**Build Settings:**
- Runtime: Node
- Build Command: `cd backend && npm install && node seeds/seedTradingPairs.js`
- Start Command: `cd backend && npm start`
- Plan: **Free** (or Starter if you prefer)

**Auto-deploy**: ON

---

### **ขั้นตอนที่ 5: Configure PostgreSQL Database**

1. ใน Render Dashboard
2. Click `New +` > `PostgreSQL`
3. ตั้งค่า:
   - **Name**: trading-bot-db
   - **Database**: trading_bot
   - **User**: postgres
   - **Region**: Singapore (recommended for Thailand)
   - **Plan**: Free
   - **Billing**: ยื่นปุ่ม Turn off auto backup

---

### **ขั้นตอนที่ 6: Set Environment Variables**

ใน Backend Service > Environment:

```
DATABASE_URL=postgresql://[auto-filled]

TELEGRAM_BOT_TOKEN=8591121449:AAGUxvbHon29QiTz0MqZqMiYkSbwuwToONI
TELEGRAM_USER_ID=123456789
TELEGRAM_ENABLED=true

LINE_CHANNEL_ACCESS_TOKEN=xxxxx
LINE_CHANNEL_SECRET=xxxxx
USE_BROADCAST=true

NODE_ENV=production
```

**Auto-filled by Render:**
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`

---

### **ขั้นตอนที่ 7: Deploy Backend**

1. Click `Deploy`
2. Watch logs:

```
Building...
npm install OK
Migrations...
✅ Database connection established successfully
Server started on port 3000
```

✅ Backend deployed!

---

### **ขั้นตอนที่ 8: Setup Python Scheduler (Optional)**

1. ใน Render Dashboard
2. Click `New +` > `Background Worker`
3. Select GitHub repo
4. ตั้งค่า:
   - **Name**: xauusd-python-scheduler
   - **Runtime**: Python 3.11
   - **Build**: `pip install -r ml-models/requirements.txt`
   - **Start**: `cd ml-models && python scheduler.py`

---

## 🔗 Environment Variables Mapping

| Key | Source | Sets |
|-----|--------|------|
| DATABASE_URL | Auto from PostgreSQL | Connection string |
| DB_HOST | Auto from PostgreSQL | Host address |
| DB_PORT | Auto | 5432 |
| DB_NAME | Manual | trading_bot |
| DB_USER | Manual | postgres |
| DB_PASSWORD | Manual | Your password |

---

## 📊 Free Tier Limits

| Resource | Limit |
|----------|-------|
| Web Service | 0.5 GB RAM |
| PostgreSQL | 1 GB storage |
| Connections | 100 concurrent |
| Background Worker | 750 hours/month |

---

## ✅ Post-Deployment Checklist

- [ ] Backend deployed successfully
- [ ] Database tables created
- [ ] Trading pairs seeded
- [ ] Can access `/api/status`
- [ ] Telegram notifications working
- [ ] Python scheduler running (if enabled)
- [ ] No errors in Render logs

---

## 🔍 Monitor Deployments

### **View Logs:**
1. Render Dashboard
2. Select Service
3. Logs tab

### **Common Logs:**

✅ Success:
```
✅ Database connection established successfully
Server started on port 3000
```

❌ Database error:
```
FATAL: password authentication failed
```

**Fix**: Check DATABASE_URL in environment

---

## 🚨 Troubleshooting

### ❌ Error: DATABASE_URL is invalid

```
Problem: Connection string format wrong
Solution: Copy exact URL from PostgreSQL service
```

### ❌ Error: ECONNREFUSED 127.0.0.1:5432

```
Problem: Trying to use localhost
Solution: DATABASE_URL auto-set by Render (use that)
```

### ❌ Error: relation "users" does not exist

```
Problem: Tables not created
Solution: Rebuild + seed:
  - Click Manual Deploy
  - Check buildCommand includes seed
```

### ❌ Error: Out of memory (Free tier)

```
Problem: 0.5 GB not enough
Solution: Upgrade to Starter tier ($7/month)
```

---

## 📈 Upgrade Path

| Tier | Cost | RAM | Storage | Connections |
|------|------|-----|---------|-------------|
| Free | $0 | 0.5 GB | 1 GB | 100 |
| Starter | $7 | 2 GB | 20 GB | 1000 |
| Standard | $12 | 4 GB | 100 GB | 5000 |

---

## 🔄 CI/CD Flow

```
┌─────────────────────────┐
│  Git Push to Main       │
│  (GitHub)               │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  GitHub Webhook         │
│  → Render              │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Auto Deploy            │
│  1. npm install         │
│  2. Seed database       │
│  3. Start server        │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  ✅ Live!               │
│  https://service-name...│
└─────────────────────────┘
```

---

## 💾 Backup Database

### **Manual Backup:**

```bash
# Get database URL
DATABASE_URL=postgresql://...

# Dump to file
pg_dump $DATABASE_URL > backup.sql

# Restore from file
psql $DATABASE_URL < backup.sql
```

### **Auto Backup (Paid Plans):**

- Starter: 7 days retention
- Standard: 30 days retention

---

## 📝 render.yaml Overview

```yaml
services:
  - type: pserv                    # PostgreSQL Service
    name: trading-bot-db
    
  - type: web                      # Node.js Backend
    name: xauusd-trading-bot
    depends_on:
      - trading-bot-db             # Only starts after DB ready
    
  - type: background_worker        # Python Scheduler
    name: xauusd-python-scheduler
```

---

## 🌍 Access Your App

**Frontend URL:**
```
https://xauusd-trading-bot.onrender.com
```

**API Endpoint:**
```
https://xauusd-trading-bot.onrender.com/api/status
```

**Database (from Render):**
```
postgresql://postgres:xxx@dpg-xxx.c2.render.com:5432/trading_bot
```

---

## 🔐 Security

1. ✅ Never commit .env
2. ✅ Use Render's sync: false for secrets
3. ✅ Enable SSL (automatic)
4. ✅ Rotate passwords monthly

---

## 📞 Support

- **Render Docs**: https://render.com/docs
- **PostgreSQL on Render**: https://render.com/docs/databases
- **Status Page**: https://status.render.com

---

## ✨ Summary

```
Git Push
    ↓
Render Auto-Deploy
    ↓
PostgreSQL DB Ready
    ↓
Backend Running
    ↓
✅ Live in ~2 minutes!
```

---

## 💡 Next Steps

1. ✅ Deploy to Render
2. ⏳ Setup custom domain
3. ⏳ Enable monitoring
4. ⏳ Setup automated backups (paid tier)
