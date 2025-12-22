# 📱 LINE Messaging API Setup Guide

## ⚠️ Important Update

**LINE Notify service ended on March 31, 2025.**  
Your bot now uses **LINE Messaging API** instead (which is better and more powerful!).

---

## 📋 What You Need

1. **Channel Access Token** (you already have this!)
2. **Your LINE User ID** (need to get this)

---

## 🔧 Step-by-Step Setup

### Step 1: Prepare Your Tokens

**You have:**
```
Channel Access Token: 4Vf10Yj3fHgDRs+Eq0ojQHZOEI/q22uBAx11iHUXKzOvBmeChLwc8LOotE14JvocrV91tpXJ3g06Qe154CzHphfGfn9bI7nfQdhT8y34t2jC+lPIs7FK9Nu1V+c9E1D6yvyrrJ7hQV5kH6gK95zrOwdB04t89/1O/w1cDnyilFU=
```

### Step 2: Get Your User ID

You need to find your **LINE User ID**. Here's how:

**Option A: Use LINE Messaging API (Recommended)**

1. Create a simple test bot to receive messages:
   ```bash
   cd backend
   npm install express body-parser
   ```

2. Create temp file `get_user_id.js`:
   ```javascript
   const express = require('express');
   const app = express();
   app.use(express.json());

   app.post('/callback', (req, res) => {
     console.log('User ID:', req.body.events[0].source.userId);
     res.json({status: 'ok'});
   });

   app.listen(3000, () => console.log('Webhook ready on :3000'));
   ```

3. In LINE Developers Console:
   - Set Webhook URL to: `https://your-domain.com/callback`
   - Send a message to your bot
   - Check console for User ID

**Option B: Manual Method**

1. Go to LINE Developers Console
2. Create a test message using Messaging API
3. Get User ID from response

### Step 3: Update .env

Edit `.env` file:
```env
# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=4Vf10Yj3fHgDRs+Eq0ojQHZOEI/q22uBAx11iHUXKzOvBmeChLwc8LOotE14JvocrV91tpXJ3g06Qe154CzHphfGfn9bI7nfQdhT8y34t2jC+lPIs7FK9Nu1V+c9E1D6yvyrrJ7hQV5kH6gK95zrOwdB04t89/1O/w1cDnyilFU=
LINE_USER_ID=your_user_id_here
```

### Step 4: Start Bot

```bash
cd backend
npm start
```

Bot will send trading signals to your LINE account! 📱

---

## 🔍 How to Find Your User ID

### Method 1: Using Testing Tools

Go to LINE Developers Console → Messaging API → Test Webhook

Send message → Check response for userId

### Method 2: Using Bot Code

Modify `backend/src/server.js` temporarily:

```javascript
app.post('/webhook', (req, res) => {
  if (req.body.events && req.body.events[0]) {
    const userId = req.body.events[0].source.userId;
    console.log('📱 Your User ID:', userId);
  }
  res.json({status: 'ok'});
});
```

Then:
1. Add webhook URL to LINE Developers Console
2. Send any message to your bot
3. Check console output for User ID
4. Copy the ID to `.env`

### Method 3: Using Python Script

Create `get_user_id.py`:
```python
import requests
import json

token = "YOUR_CHANNEL_ACCESS_TOKEN"
message = "Hello"

# This won't give userId, but you can use webhook method above
```

---

## ✅ Verification

Once configured, test with:

```bash
curl -X POST http://localhost:3000/api/check-signal
```

You should receive a LINE message with the trading signal! 📩

---

## 🆚 LINE Notify vs Messaging API

| Feature | Notify (Discontinued) | Messaging API |
|---------|----------------------|---------------|
| Service Status | ❌ Ended March 31, 2025 | ✅ Active |
| Setup Complexity | Simple | Medium |
| Features | Basic notifications | Rich messages, buttons, etc. |
| Free Messages | Yes | Yes (quota per month) |
| Two-way Chat | ❌ No | ✅ Yes |
| Rich Content | ❌ No | ✅ Yes |

---

## 🚀 Next Steps

1. Find your User ID (see above)
2. Update `.env` with both tokens
3. Run `cd backend && npm start`
4. Wait for trading signals! 🥇

---

## ❓ Troubleshooting

**Error: "LINE_USER_ID not configured"**
→ Make sure USER_ID is in `.env`

**Error: "401 Unauthorized"**
→ Check Channel Access Token is correct in `.env`

**Not receiving messages**
→ Verify User ID is your actual LINE account ID

---

## 📚 More Info

- [LINE Messaging API Docs](https://developers.line.biz/en/docs/messaging-api/)
- [LINE Developers Console](https://developers.line.biz/console/)

---

Your bot is ready to send gold trading signals! 🥇📱
