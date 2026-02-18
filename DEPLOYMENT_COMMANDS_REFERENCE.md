# 🔧 Deployment Commands Reference

## 📦 Prepare for Deployment

### **1. Verify All Changes**

```bash
# Check git status
git status

# Should show:
# - frontend/liff-enhanced-settings.html (new)
# - frontend/package.json (modified)
# - frontend/vercel.json (new)
# - backend/vercel.json (new)
# - backend/src/routes/userSettingsRoutes.js (new)
# - backend/src/server.js (modified)
# - Documentation files (new)
```

### **2. Commit Changes**

```bash
git add .
git commit -m "
feat: Implement frontend settings UI with separate deployment

- Create enhanced LIFF settings page with 3-tab interface
- Add trading pairs selection (per-user configuration)
- Add notification preferences management
- Add technical parameters adjustment (RSI, SMA, ATR, TP/SL)
- Implement userSettingsRoutes API endpoints
- Add CORS middleware for frontend access
- Setup Vercel deployment for frontend
- Setup Render deployment for backend
- Add deployment documentation and guides

Frontend Features:
  - Tab 1: Select trading pairs (XAUUSD, EURUSD, GBPUSD, BTCUSD, ETHUSD, USDJPY, NIFTY50)
  - Tab 2: Configure notifications (LINE/Telegram, signal types, quiet hours)
  - Tab 3: Adjust technical parameters (RSI/SMA periods, weights, TP/SL)

Backend Improvements:
  - New API routes for user settings management
  - Support for per-user trading pair selection
  - Support for per-user notification preferences
  - Database-backed user preferences
  - CORS configured for separate frontend deployment

Deployment:
  - Frontend: Vercel (separate)
  - Backend: Render (separate)
  - Database: PostgreSQL on Render
  - Independent scaling and updates
"

git push origin main
```

---

## 🚀 Backend Deployment (Render)

### **Using Render Dashboard**

```bash
# After git push, Render will auto-detect changes

# Manual steps if needed:
1. Go to: https://dashboard.render.com/services
2. Select: xauusd-trading-bot-backend (or create new)
3. Click: Manual Deploy
4. Monitor: Logs tab

# Expected log output:
# npm install
# node seeds/seedTradingPairs.js
# ✅ Database connection established successfully
# ✅ Seeding complete
# Server started on port 3000
# Listening on port 3000
```

### **Environment Variables to Set**

```bash
# In Render Dashboard → Service → Environment

DATABASE_URL=postgresql://[auto-filled from PostgreSQL]
TELEGRAM_BOT_TOKEN=8591121449:AAGUxvbHon29QiTz0MqZqMiYkSbwuwToONI
TELEGRAM_ENABLED=true
NODE_ENV=production
FRONTEND_URL=https://xauusd-trading-bot-frontend-[random].vercel.app
```

### **Test Backend After Deploy**

```bash
# Check if service is live
curl https://xauusd-trading-bot-backend.onrender.com/api/status

# Expected response:
# {
#   "status": "ok",
#   "database": "connected",
#   "lastSignal": {...},
#   "notifiers": {...}
# }

# Check if trading pairs seeded
curl https://xauusd-trading-bot-backend.onrender.com/api/trading-pairs

# Expected: List of 7 trading pairs
```

---

## 🎭 Frontend Deployment (Vercel)

### **Using Vercel Dashboard**

```bash
# After git push to main branch

# Option 1: Auto-deploy (recommended)
# Vercel automatically detects changes and deploys
# No additional commands needed
# Monitor at: https://vercel.com/dashboard

# Option 2: Vercel CLI
npm install -g vercel

vercel --prod \
  --scope [your-vercel-team] \
  --name xauusd-trading-bot-frontend

# Vercel will prompt for:
# - Project name
# - Framework (select: Other)
# - Root directory: ./frontend
# - Environment variables
```

### **Environment Variables to Set**

```bash
# In Vercel Dashboard → Settings → Environment Variables

VUE_APP_API_URL=https://xauusd-trading-bot-backend.onrender.com
```

### **Test Frontend After Deploy**

```bash
# Open in browser
https://xauusd-trading-bot-frontend-[random].vercel.app

# Should see:
# - Loading spinner (briefly)
# - "⚙️ ตั้งค่า Trading Bot" header
# - 3 tabs: 📊 คู่เงิน, 🔔 การแจ้งเตือน, ⚙️ พารามิเตอร์
# - 7 trading pairs listed
# - Save button and Reset button
```

---

## 🔗 Connect Services

### **Step 1: Get Frontend URL**

```bash
# After Vercel deployment
# Copy URL from: https://vercel.com/dashboard

FRONTEND_URL = https://xauusd-trading-bot-frontend-xyz123.vercel.app
```

### **Step 2: Update Backend Environment**

```bash
# Render Dashboard → Backend → Environment

Add/Update Variable:
Name: FRONTEND_URL
Value: [paste frontend URL from step 1]

Manual Deploy: Click Deploy button
Wait for: ✅ Live indicator
```

### **Step 3: Test Connection**

```bash
# From browser console (on frontend)
fetch('https://xauusd-trading-bot-backend.onrender.com/api/trading-pairs')
  .then(r => r.json())
  .then(data => console.log('✓ Connected!', data))
  .catch(e => console.error('✗ Error:', e))

# Should output:
# ✓ Connected! {success: true, data: [{...pairs...}]}
```

---

## 🔄 Update Frontend (After Deployment)

```bash
# Make changes to frontend files
# Edit: frontend/liff-enhanced-settings.html

# Commit changes
git add frontend/
git commit -m "Update frontend settings UI"

# Push to GitHub
git push origin main

# Vercel auto-deploys
# Monitor at: https://vercel.com/deployments
# Takes: ~1 minute

# Done! New version live automatically
```

---

## 🔄 Update Backend (After Deployment)

```bash
# Make changes to backend
# Edit: backend/src/server.js (or other backend files)

# Commit changes
git add backend/
git commit -m "Update backend API logic"

# Push to GitHub
git push origin main

# Render auto-deploys (if webhook enabled)
# Or manually: Render Dashboard → Manual Deploy
# Monitor: Logs tab
# Takes: ~2-3 minutes

# Done! New version live automatically
```

---

## 📊 Verify Full System

### **Test 1: Frontend Loads**

```bash
curl -I https://xauusd-trading-bot-frontend-xyz.vercel.app

# Response:
# HTTP/1.1 200 OK
# Content-Type: text/html
```

### **Test 2: Backend Responds**

```bash
curl https://xauusd-trading-bot-backend.onrender.com/api/status -s | jq .

# Response:
# {
#   "status": "ok",
#   "database": "connected",
#   ...
# }
```

### **Test 3: Database Connected**

```bash
curl https://xauusd-trading-bot-backend.onrender.com/api/trading-pairs -s | jq .

# Response:
# {
#   "success": true,
#   "data": [
#     { "id": 1, "pairCode": "XAUUSD", ... },
#     { "id": 2, "pairCode": "EURUSD", ... },
#     ...
#   ]
# }
```

### **Test 4: Full Integration**

```javascript
// In browser console (on frontend URL)

// Step 1: Get profile (LIFF)
// Returns: { userId: "...", displayName: "..." }

// Step 2: Fetch trading pairs
fetch('https://xauusd-trading-bot-backend.onrender.com/api/trading-pairs')
  .then(r => r.json())
  .then(data => console.log('Pairs:', data))

// Step 3: Save user settings
fetch('https://xauusd-trading-bot-backend.onrender.com/api/users/[userId]/settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tradingPairs: [
      { tradingPairId: 1, buyThreshold: 60, sellThreshold: 40 }
    ],
    notificationPreferences: {
      lineEnabled: true,
      telegramEnabled: true,
      buySignals: true,
      sellSignals: true
    },
    tradingParameters: {
      rsiPeriod: 14,
      smaShort: 20,
      smaLong: 50,
      atrPeriod: 7,
      rsiWeight: 0.3,
      smaWeight: 0.2
    }
  })
})
  .then(r => r.json())
  .then(data => console.log('✓ Saved!', data))
  .catch(e => console.error('✗ Error:', e))
```

---

## 🐛 Verification Commands

### **Check Deployment Status**

```bash
# Frontend status
curl -s https://xauusd-trading-bot-frontend-xyz.vercel.app | head -20

# Backend status
curl -s https://xauusd-trading-bot-backend.onrender.com/health

# Database connection
curl -s https://xauusd-trading-bot-backend.onrender.com/api/status
```

### **Check Logs**

```bash
# View latest git commits (what was deployed)
git log --oneline -5

# View Render backend logs
# → https://dashboard.render.com → Select Service → Logs

# View Vercel frontend logs
# → https://vercel.com/dashboard → Select Project → Logs
```

### **Monitor Services**

```bash
# Render service status
curl -I https://xauusd-trading-bot-backend.onrender.com/

# Vercel deployment status
curl -I https://xauusd-trading-bot-frontend-xyz.vercel.app/
```

---

## 🔧 Rollback Commands (If Needed)

### **Rollback Frontend (Vercel)**

```bash
# Option 1: GitHub rollback
git revert HEAD                    # Revert last commit
git push origin main               # Vercel auto-deploys old version

# Option 2: Vercel dashboard
# → Deployments → Select previous version → Promote to Production
```

### **Rollback Backend (Render)**

```bash
# Option 1: GitHub rollback
git checkout HEAD~1 backend/       # Revert backend changes
git commit -m "Revert backend"
git push origin main               # Render auto-deploys previous version

# Option 2: Render dashboard
# → Manual Deploy → Previous build
```

---

## 📈 Monitoring Dashboard

### **Create Monitoring Checklist**

```bash
# Daily checks
1. Frontend loads: curl -s frontend-url | head -5
2. Backend responds: curl -s backend-url/api/status
3. User count: curl -s backend-url/api/users/count
4. Signal count today: curl -s backend-url/api/signals/today
5. Error logs: Check Render/Vercel logs
6. Database size: Check PostgreSQL dashboard
```

### **Performance Metrics**

```bash
# Frontend
- Load time: < 2 seconds (via vercel.app)
- File size: < 500 KB

# Backend  
- Response time: < 200 ms
- Database queries: < 100 ms
- Error rate: < 1%

# Database
- Connections: < 5 active
- Storage: < 100 MB
```

---

## 🎯 Deployment Summary

| Step | Command | Time | Status |
|------|---------|------|--------|
| 1 | `git push origin main` | 1 min | 🟢 Auto-deploys both |
| 2 | Set Render env vars | 1 min | 🟢 Manual |
| 3 | Set Vercel env vars | 1 min | 🟢 Manual |
| 4 | Update FRONTEND_URL in Render | 1 min | 🟢 Manual |
| 5 | Test connectivity | 2 min | 🟢 Manual |

**Total Time: ~5-10 minutes**

---

## ✨ Automated Deployment

### **GitHub Actions (Optional)**

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Notify Render
        run: curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK }}
      - name: Notify Vercel
        run: curl -X POST ${{ secrets.VERCEL_DEPLOY_HOOK }}
```

This enables one-click deployment after git push! (Advanced)

---

## 📞 Support Commands

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check git status
git status

# Check remote URLs
git remote -v

# Verify SSH key
ssh -T git@github.com
```

---

**You're ready to deploy! 🚀**

Use this reference whenever you need to:
- Deploy new changes
- Monitor services
- Debug issues
- Verify connectivity
- Rollback if needed
