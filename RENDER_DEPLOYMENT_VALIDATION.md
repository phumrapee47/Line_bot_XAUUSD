# 🛠️ Render Deployment - Troubleshooting & Verification

## ⚡ Pre-Deployment Checklist

### **Local Testing (Before Render)**

- [ ] PostgreSQL running locally:
  ```bash
  psql -U postgres -d trading_bot
  \dt  # List tables
  ```

- [ ] Backend starts:
  ```bash
  cd backend && npm start
  ```

- [ ] API responds:
  ```bash
  curl http://localhost:3000/api/status
  ```

- [ ] Environment variables set:
  ```bash
  echo $DATABASE_URL
  echo $TELEGRAM_BOT_TOKEN
  ```

- [ ] No errors in `.git status`:
  ```bash
  git status  # Should show nothing
  ```

---

## 🔴 Critical Errors & Fixes

### **1️⃣ Error: "Cannot find module 'pg'"**

**When it appears**: During deployment build

**Root cause**: Didn't install dependencies

**Fix**:
```json
{
  "scripts": {
    "start": "node src/server.js"
  }
}
```

Verify in `backend/package.json`:
```json
{
  "pg": "^8.11.3",
  "pg-hstore": "^2.3.4"
}
```

**Command to verify**:
```bash
cd backend && npm ls pg
```

---

### **2️⃣ Error: "FATAL: password authentication failed"**

**When it appears**: When backend tries to connect to PostgreSQL

**Root cause**: DATABASE_URL missing or invalid

**Location**: Render Dashboard > xauusd-trading-bot > Environment

**Fix**:
1. Go to PostgreSQL service page
2. Copy entire DATABASE_URL
3. Paste to backend environment

Should look like:
```
postgresql://postgres:mypassword@dpg-xxx.c2.render.com:5432/trading_bot
```

**Verify**:
```bash
# Test connection
psql $DATABASE_URL
```

---

### **3️⃣ Error: "relation \"users\" does not exist"**

**When it appears**: After database connection, when accessing tables

**Root cause**: Tables not created | seed didn't run

**Fix**:
1. Backend > Settings > Build Command
2. Verify it says:
   ```
   cd backend && npm install && node seeds/seedTradingPairs.js
   ```

3. Manual rebuild:
   - Click "Manual Deploy"
   - Watch logs for "Adding trading pair..."
   - Wait for "✅ Seeding complete"

---

### **4️⃣ Error: "UnknownDatabaseError: ECONNREFUSED"**

**When it appears**: Server starts but cannot reach database

**Root cause**: 
- PostgreSQL service not ready yet
- Wrong host/port

**Fix**:
1. Check render.yaml `depends_on`:
   ```yaml
   services:
     - type: web
       depends_on:
         - trading-bot-db
   ```

2. Wait 30-60 seconds after deploy before testing
3. Verify DATABASE_URL has been auto-filled

---

### **5️⃣ Error: "Error: listen EADDRINUSE :::3000"**

**When it appears**: Backend won't start

**Root cause**: Port 3000 already in use | Service timeout

**Fix**:
1. Verify start command:
   ```
   cd backend && npm start
   ```

2. In backend/src/server.js:
   ```javascript
   const PORT = process.env.PORT || 3000;
   ```

---

### **6️⃣ Error: "Build command timed out"**

**When it appears**: After 30 minutes of building

**Root cause**: Seeding taking too long | Too many dependencies

**Fix**:
1. For large installs, split build:
   ```
   cd backend && npm install
   ```
   Then in start:
   ```
   node seeds/seedTradingPairs.js && npm start
   ```

2. Or move seed to manual trigger:
   ```bash
   npm start
   ```

---

### **7️⃣ Error: "Service out of memory"**

**When it appears**: After 5-10 minutes running

**Root cause**: 0.5 GB Free tier limit reached

**Fix**:
1. Upgrade to Starter: $7/month
   - Upgrade in dashboard
   - Auto redeploy with 2 GB RAM

2. Or optimize Node:
   ```bash
   NODE_OPTIONS=--max-old-space-size=256 npm start
   ```

---

## ✅ Verification Steps

### **After Deployment (Wait 2-5 minutes)**

**Step 1: Check Service Status**
```
Render Dashboard → xauusd-trading-bot → Status
```

**Expected**: 🟢 Live | Not 🟡 Deploying or 🔴 Failed

---

**Step 2: View Logs**
```
Render Dashboard → xauusd-trading-bot → Logs
```

**Expected to see**:
```
✅ Database connection established successfully
Server started on port 3000
Listening on port 3000
```

---

**Step 3: Test API**
```bash
curl https://xauusd-trading-bot.onrender.com/api/status
```

**Expected response**:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

**Step 4: Check Database**
```bash
psql $DATABASE_URL
\dt  # List tables
```

**Expected tables**:
```
 trading_pairs
 users
 user_notification_preferences
 user_trading_pairs
 user_trading_parameters
 telegram_subscribers
```

Count rows:
```sql
SELECT COUNT(*) FROM trading_pairs;  -- Should be 7
```

---

**Step 5: Test Telegram Integration**
```bash
curl -X POST https://xauusd-trading-bot.onrender.com/api/telegram/subscribe \
  -H "Content-Type: application/json" \
  -d '{"telegramUserId": "123456789", "firstName": "Test"}'
```

**Expected response**:
```json
{
  "success": true,
  "message": "Subscribed successfully"
}
```

---

## 📊 Monitoring Commands

### **Check Backend Health**
```bash
curl https://xauusd-trading-bot.onrender.com/api/status -v
```

### **Check Database Connection**
```bash
psql $DATABASE_URL -c "SELECT version();"
```

### **View Recent Logs**
```bash
# In terminal
render logs xauusd-trading-bot --tail 100
```

### **Count Active Subscribers**
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM telegram_subscribers WHERE \"isActive\" = true;"
```

---

## 🔄 Common Workflows

### **Scenario 1: Deploy Update**

```bash
# 1. Make changes locally
git add .
git commit -m "Update trading parameters"

# 2. Push to GitHub
git push origin main

# 3. Render auto-deploys (2 min)
# No action needed!

# 4. Verify
curl https://xauusd-trading-bot.onrender.com/api/status
```

---

### **Scenario 2: Database Issue**

```bash
# 1. Check logs
Render Dashboard → See error

# 2. Manual rebuild
Render Dashboard → Manual Deploy button

# 3. Monitor
Render Dashboard → Logs tab

# 4. If still broken, check:
psql $DATABASE_URL
\dt  # Are tables there?
```

---

### **Scenario 3: Add New User**

```bash
# Via API:
curl -X POST https://xauusd-trading-bot.onrender.com/api/telegram/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "telegramUserId": "123456789",
    "firstName": "John",
    "username": "johndoe"
  }'

# Verify in database:
psql $DATABASE_URL -c "SELECT * FROM telegram_subscribers LIMIT 1;"
```

---

## 📋 Deployment Status Summary

| Component | Status | Check Command |
|-----------|--------|--------------|
| Backend | 🟢 Live | `curl /api/status` |
| Database | 🟢 Connected | `psql $DATABASE_URL` |
| Tables | 🟢 Created | `\dt` in psql |
| Trading Pairs | 🟢 Seeded | `SELECT COUNT(*) FROM trading_pairs;` |
| Telegram | 🟢 Working | `/api/telegram/status` |

---

## 🚨 If Everything Fails

**Nuclear Reset Option:**

1. Delete current deployment:
   ```
   Render Dashboard → Service → Settings → Delete Service
   ```

2. Delete PostgreSQL:
   ```
   Render Dashboard → Database → Settings → Delete Database
   ```

3. Start fresh:
   ```
   Deploy Backend → Deploy PostgreSQL → Let auto-seed run
   ```

---

## 📞 Quick Support

| Issue | Solution | Time |
|-------|----------|------|
| Deploy fail | Check logs | 1 min |
| Connection fail | Verify DATABASE_URL | 2 min |
| Tables missing | Manual rebuild | 3 min |
| Out of memory | Upgrade tier | 5 min |

---

## ✨ Final Checklist

- [ ] Backend deployed successfully
- [ ] PostgreSQL connected
- [ ] Tables created (7 trading pairs visible)
- [ ] API responding at `/api/status`
- [ ] Telegram notifications working
- [ ] Logs showing no errors
- [ ] Can access from outside network
- [ ] Database backups configured (optional)
