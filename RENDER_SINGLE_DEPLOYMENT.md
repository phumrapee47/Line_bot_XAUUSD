# 🚀 Render Deploy - Single Platform (Frontend + Backend)

## 📊 Architecture

```
┌─────────────────────────────────────────┐
│         RENDER.COM DEPLOYMENT           │
├─────────────────────────────────────────┤
│                                         │
│  Frontend (Node.js Static Server)       │
│  Port: 3001                             │
│  URL: https://xauusd-trading-bot-fe..   │
│                                         │
│  ↓ API calls to Backend ↓               │
│                                         │
│  Backend API (Node.js Express)          │
│  Port: 3000                             │
│  URL: https://xauusd-trading-bot-api..  │
│                                         │
│  ↓ Database access ↓                    │
│                                         │
│  PostgreSQL Database                    │
│  (managed by Render)                    │
│                                         │
└─────────────────────────────────────────┘
```

**ทั้งหมดอยู่ใน Render เดียว ไม่ต้องเข้า Vercel! ✓**

---

## 🎯 Deploy Strategy

| Component | Host | Setup Time |
|-----------|------|-----------|
| Frontend | Render Web Service | Auto |
| Backend | Render Web Service | Auto |
| Database | Render PostgreSQL | Auto |

**One-Click Deploy**: `git push origin main` → Render auto-deploys all!

---

## 📋 How It Works

### **render.yaml Configuration**

```yaml
services:
  1. PostgreSQL Database
     └─ trading-bot-db (managed)
  
  2. Frontend Service
     ├─ npm install
     ├─ npm run serve (http-server)
     └─ Port 3001
  
  3. Backend Service  
     ├─ npm install
     ├─ node seeds/seedTradingPairs.js
     ├─ npm start
     └─ Port 3000
```

**Process**:
1. PostgreSQL starts first
2. Frontend starts (serves HTML)
3. Backend starts (connects to DB)
4. All automated!

---

## 🚀 Full Deployment Steps

### **Step 1: Verify render.yaml**

```bash
# render.yaml should have 3 services:
# - trading-bot-db (PostgreSQL)
# - xauusd-trading-bot-frontend (Node.js)
# - xauusd-trading-bot-backend (Node.js)

cat render.yaml | grep "name:"
# Output should show all 3 services
```

### **Step 2: Commit All Changes**

```bash
git add .
git commit -m "
feat: Setup Render-only deployment

- Update render.yaml with 3 services (frontend, backend, database)
- Frontend service serves LIFF app on port 3001
- Backend API runs on port 3000
- PostgreSQL auto-seeded with trading pairs
- CORS configured for inter-service communication

render.yaml now handles:
  ✓ Frontend static server (Node.js)
  ✓ Backend API (Node.js + Express)
  ✓ PostgreSQL (managed service)
  ✓ Service dependencies
  ✓ Environment variables linking
  ✓ Auto-deployment on git push
"

git push origin main
```

### **Step 3: Deploy on Render**

#### **Option A: Automatic (Recommended)**

```
1. Go: https://dashboard.render.com
2. Connect GitHub repo (if not already)
3. Create /.../render.yaml
4. Render auto-deploys after git push
5. Monitor at: Dashboard → Services
```

#### **Option B: Manual Create**

```
1. Render Dashboard → New +
2. Select: Blueprint (from render.yaml)
3. Select: GitHub repo
4. Render auto-deploys
```

---

## ⏱️ Deployment Timeline

```
Time: 0:00 - git push to GitHub
      ↓
      0:30 - Render detects changes
      ↓
      1:00 - PostgreSQL starts
      ↓
      1:30 - Frontend service builds & starts
      ↓
      2:00 - Backend service builds & starts
      ↓
      2:30 - Database seeding
      ↓
      3:00 - All services LIVE ✅
```

**Total: ~3 minutes**

---

## 🌐 Live URLs (After Deployment)

```
Frontend: https://xauusd-trading-bot-frontend.onrender.com
Backend:  https://xauusd-trading-bot-backend.onrender.com
Database: (auto-linked, no direct URL)
```

### **Test Frontend**

```bash
curl https://xauusd-trading-bot-frontend.onrender.com

# Should return HTML:
# <!DOCTYPE html>
# <html lang="th">
# <head>...⚙️ ตั้งค่า Trading Bot...
```

### **Test Backend**

```bash
curl https://xauusd-trading-bot-backend.onrender.com/api/status

# Should return JSON:
# { "status": "ok", "database": "connected" }
```

### **Test Trading Pairs**

```bash
curl https://xauusd-trading-bot-backend.onrender.com/api/trading-pairs

# Should return 7 pairs:
# { "success": true, "data": [{XAUUSD}, {EURUSD}, ...] }
```

---

## ✅ Verification Checklist

### **After Deploy Completes**

- [ ] All 3 services show "Live" status (green dot)
- [ ] No errors in build logs
- [ ] Frontend loads in browser
- [ ] Backend API responds
- [ ] Database connected

### **Manual Verification**

```bash
# Check services are running
curl -I https://xauusd-trading-bot-frontend.onrender.com
curl -I https://xauusd-trading-bot-backend.onrender.com

# Check database seeding
curl https://xauusd-trading-bot-backend.onrender.com/api/trading-pairs | jq '.data | length'
# Should output: 7
```

---

## 📊 Service URLs Inside render.yaml

```yaml
# Frontend can call backend using:
https://xauusd-trading-bot-backend.onrender.com/api/...

# Backend knows frontend URL via environment:
FRONTEND_URL=https://xauusd-trading-bot-frontend.onrender.com
```

---

## 🔄 Update & Redeploy

### **Change Frontend**

```bash
# Edit: frontend/liff-enhanced-settings.html
# ... make changes ...

git add frontend/
git commit -m "Update frontend UI"
git push origin main

# Render auto-redeploys frontend service
# Takes: ~1 minute
```

### **Change Backend**

```bash
# Edit: backend/src/server.js (or any backend file)
# ... make changes ...

git add backend/
git commit -m "Update backend API"
git push origin main

# Render auto-redeploys backend service
# Takes: ~2 minutes
```

### **Push All Changes**

```bash
git add .
git commit -m "Update everything"
git push origin main

# Render redeploys all services
# Takes: ~3 minutes
```

---

## 🐛 Troubleshooting

### ❌ "Build failed" for frontend

```bash
# Check: frontend/package.json exists
ls -la frontend/package.json

# Check: npm serve script is correct
cat frontend/package.json | grep serve

# Fix: Ensure render.yaml points to right startCommand
# Should be: npm run serve
```

### ❌ "Frontend can't reach backend"

```bash
# Frontend should point to:
https://xauusd-trading-bot-backend.onrender.com

# Not localhost:3000
# Not internal service URL

# Check frontend code:
grep -r "http://localhost" frontend/
grep -r "3000" frontend/

# Should see references to:
# https://xauusd-trading-bot-backend.onrender.com
```

### ❌ Database not seeded

```bash
# Check backend logs
Render Dashboard → Backend → Logs

# Should show:
# Adding trading pair: XAUUSD
# Adding trading pair: EURUSD
# ... (7 total)
# ✅ Seeding complete

# If not:
# 1. Manual Deploy backend
# 2. Check DATABASE_URL environment
# 3. Check seeds/seedTradingPairs.js exists
```

### ❌ "Cannot connect to database"

```bash
# Backend logs should show:
# ✅ Database connection established successfully

# If error: Check DATABASE_URL auto-linked from PostgreSQL service
# Render Dashboard → Backend → Environment → DATABASE_URL

# Should auto-populate like:
# postgresql://user:pass@dpg-xxx.render.com/trading_bot
```

---

## 📈 Monitor Deployments

### **View Deployment Status**

```
Render Dashboard
  → Services
  → Click each service to see status
  → Logs tab shows build progress
```

### **Common Log Messages**

✅ Success:
```
npm install OK
✓ Database connection established
Server started on port 3000
```

❌ Errors:
```
Cannot find module 'express'
→ npm install failed

FATAL: password authentication failed
→ DATABASE_URL wrong or PostgreSQL not ready

Cannot bind to port 3000
→ Port already in use (shouldn't happen)
```

---

## 💾 Files Modified for Render Deployment

```
render.yaml                          UPDATED (3 services)
frontend/package.json                UPDATED (npm run serve)
backend/src/server.js                UPDATED (CORS)
backend/src/routes/userSettingsRoutes.js   NEW
frontend/liff-enhanced-settings.html NEW
frontend/.vercelignore              DELETED (Vercel not used)
backend/vercel.json                 DELETED (Vercel not used)
frontend/vercel.json                DELETED (Vercel not used)
```

---

## 🎯 render.yaml Structure

```yaml
services:
  ├─ pserv (PostgreSQL)
  │  ├─ Automatic managed database
  │  └─ No build command needed
  │
  ├─ web (Frontend)
  │  ├─ Node.js runtime
  │  ├─ Build: npm install
  │  ├─ Start: npm run serve
  │  └─ Port 3001
  │
  └─ web (Backend)
     ├─ Node.js runtime
     ├─ Build: npm install + seed
     ├─ Start: npm start
     ├─ Depends on PostgreSQL
     ├─ Port 3000
     └─ Environment variables
```

---

## ✨ Success Indicators

✅ All 3 services show green "Live" status
✅ Frontend loads: https://xauusd-trading-bot-frontend.onrender.com
✅ Backend responds: https://xauusd-trading-bot-backend.onrender.com/api/status
✅ Database shows 7 trading pairs
✅ Frontend can save user settings
✅ Settings appear in PostgreSQL

---

## 🚀 You're Ready!

```bash
# Final step
git push origin main

# Then relax! Render handles:
✓ Building services
✓ Starting PostgreSQL
✓ Seeding database
✓ Starting frontend
✓ Starting backend
✓ Linking services
✓ Auto-scaling if needed
```

**Deploy complete in ~3 minutes! 🎉**

---

## 📞 Support

- **Render Docs**: https://render.com/docs
- **Blueprints**: https://render.com/docs/blueprints
- **PostgreSQL**: https://render.com/docs/databases
- **Troubleshooting**: https://render.com/docs/troubleshooting
