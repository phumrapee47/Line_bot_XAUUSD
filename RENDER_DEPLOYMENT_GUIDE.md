# XAUUSD Trading Bot - Render Deployment Guide

## Current Status
- ✅ Backend: Running on Node.js (Port 3000)
- ✅ Python Scheduler: Running (08:00 AM daily analysis)
- ✅ Database: SQLite ready for deployment
- ✅ Dependencies: All installed

## What Needs to Be Done for Render

### Step 1: Push to GitHub ✅
```bash
cd c:\Users\Asus\Documents\line_bot_XAUUSD
git add .
git commit -m "Add Render deployment config and production dependencies"
git push origin main
```

### Step 2: Set Environment Variables on Render

Go to your Render dashboard for each service and add these env vars:

**For Backend Service (Web):**
- `LINE_CHANNEL_ACCESS_TOKEN` = (Your LINE token)
- `LINE_CHANNEL_SECRET` = (Your LINE secret)
- `GEMINI_API_KEY` = (Your Gemini API key)
- `NODE_ENV` = production
- `PORT` = 3000 (auto-set by Render)
- `USE_BROADCAST` = true

**For Python Scheduler (Background Worker):**
- `LINE_CHANNEL_ACCESS_TOKEN` = (Same as backend)
- `LINE_CHANNEL_SECRET` = (Same as backend)
- `GEMINI_API_KEY` = (Same as backend)
- `USE_BROADCAST` = true

### Step 3: Create Services on Render

#### Service 1: Backend Web Service
1. Go to https://dashboard.render.com
2. Click "Create +" → "Web Service"
3. Connect your GitHub repo
4. Configuration:
   - **Name:** xauusd-trading-bot
   - **Runtime:** Node
   - **Build Command:** `cd backend && npm install`
   - **Start Command:** `cd backend && npm start`
   - **Plan:** Free tier (or Starter if you need guaranteed uptime)
   - **Instance:** add environment variables from Step 2

#### Service 2: Python Scheduler (Background Worker)
1. Click "Create +" → "Background Worker"
2. Connect same GitHub repo
3. Configuration:
   - **Name:** xauusd-python-scheduler
   - **Runtime:** Python 3.11
   - **Build Command:** `pip install -r ml-models/requirements.txt`
   - **Start Command:** `cd ml-models && python scheduler.py`
   - **Plan:** Free tier
   - **Instance:** add environment variables from Step 2

### Step 4: Database Setup

**Important:** SQLite on Render (free tier):
- SQLite works but files are ephemeral (lost on redeploy)
- **For Production:** Consider upgrading to PostgreSQL
  - Render offers free PostgreSQL for 90 days
  - After that: $7/month for Starter

**If keeping SQLite:**
- Database resets on redeploy (every 15 minutes of inactivity)
- Trading signals reset but don't need persistence
- Logs are lost, but that's OK for free tier

**Recommended for production:**
```bash
# Install PostgreSQL adapter
npm install pg pg-hstore
```
Then update `backend/src/config/database.js` to use PostgreSQL.

### Step 5: Important Notes

**On Render Free Tier:**
- ⚠️ Services spin down after 15 minutes of inactivity
- ⚠️ Cold start takes ~30-50 seconds
- ✅ Sufficient for testing/monitoring
- ❌ Not ideal for production (consistent signals)

**To Avoid Spin Down:**
- Upgrade to Starter tier ($7/month) - keeps services always running
- Or use a 3rd-party "keep alive" service (make HTTP request every 14 min)

### Step 6: Verify Deployment

After deployment, test in this order:

1. **Backend Health Check:**
   ```bash
   curl https://xauusd-trading-bot.onrender.com/status
   ```
   Should return: `{"status":"OK",...}`

2. **Signal Generation:**
   ```bash
   curl https://xauusd-trading-bot.onrender.com/api/signal/manual
   ```
   Should return trading signal

3. **Python Scheduler:**
   - Check Render logs for scheduler output
   - Should show: "Scheduler started successfully"
   - Next daily run at 08:00 AM Bangkok time

### Step 7: Monitoring

**View Logs:**
- Backend: Dashboard → Services → xauusd-trading-bot → Logs
- Python: Dashboard → Services → xauusd-python-scheduler → Logs

**Common Issues:**

| Issue | Solution |
|-------|----------|
| "Cannot find module" | Make sure `npm install` ran successfully |
| "Python not found" | Runtime should be Python 3.11 |
| "Signal not sent to LINE" | Check `LINE_CHANNEL_ACCESS_TOKEN` and `GEMINI_API_KEY` |
| "Database locked" | SQLite limitation - switch to PostgreSQL for production |
| "Services keep spinning down" | Upgrade to Starter tier or setup keep-alive |

### Step 8: Optional - Setup Keep-Alive (Free Tier)

Create a simple keep-alive script to prevent spin-down:

```javascript
// backend/src/keepalive.js
const axios = require('axios');
const SERVICE_URL = process.env.SERVICE_URL;

if (SERVICE_URL) {
  setInterval(async () => {
    try {
      await axios.get(`${SERVICE_URL}/status`, { timeout: 5000 });
      console.log('Keep-alive ping sent');
    } catch (e) {
      console.log('Keep-alive ping skipped');
    }
  }, 14 * 60 * 1000); // Every 14 minutes
}
```

### Step 9: Future Upgrades

When ready for production:

1. **PostgreSQL Database:**
   - Cost: $7/month
   - Benefits: Persistent data, better performance
   - Setup: Render → PostgreSQL → Copy connection string to .env

2. **Starter Tier Services:**
   - Cost: $7/month each (Backend + Scheduler)
   - Benefits: Always running, no spin-down

3. **Custom Domain:**
   - Optional: Point your domain to Render service
   - Cost: Domain registration only

4. **SSL Certificate:**
   - Free: Auto-generated by Render
   - HTTPS: Automatic for all services

## Deployment Checklist

- [ ] GitHub repo up to date with latest code
- [ ] render.yaml file committed
- [ ] All env vars added to Render dashboard
- [ ] Backend service deployed and running
- [ ] Python scheduler service deployed and running
- [ ] Health check endpoint responding
- [ ] Signals generating every 60 minutes
- [ ] Daily analysis scheduled for 08:00 AM
- [ ] LINE messages sending successfully
- [ ] Logs visible in Render dashboard

## Support

- Render Docs: https://render.com/docs
- Python on Render: https://render.com/docs/deploy-python
- Node.js on Render: https://render.com/docs/deploy-node

---
**Ready to deploy? Commit render.yaml and push to GitHub, then create services in Render dashboard.**
