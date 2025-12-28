# Render Environment Variables Configuration

## Required Environment Variables for Render

ใน Render Dashboard ให้ไปที่ **Settings → Environment** แล้วเพิ่ม variables เหล่านี้:

### 1. LINE Messaging API

```
LINE_CHANNEL_ACCESS_TOKEN=4Vf10Yj3fHgDRs+Eq0ojQHZOEI/q22uBAx11iHUXKzOvBmeChLwc8LOotE14JvocrV91tpXJ3g06Qe154CzHphfGfn9bI7nfQdhT8y34t2jC+lPIs7FK9Nu1V+c9E1D6yvyrrJ7hQV5kH6gK95zrOwdB04t89/1O/w1cDnyilFU=
```

ที่ไหน: LINE Developer Console → Channel Settings → Messaging API

### 2. LINE Channel Secret

```
LINE_CHANNEL_SECRET=0604f9342c64d5d4fca95b265081c9f2
```

### 3. LINE LIFF ID

```
LIFF_ID=2008790639-M9uY1jY0
```

### 4. Broadcasting Configuration

```
USE_BROADCAST=true
```

สำหรับ broadcast ให้ทุกคน หรือ `false` เพื่อส่งไปเฉพาะ user:

```
# Alternative (ส่งไปเฉพาะคน)
LINE_USER_ID=your_user_id_here
USE_BROADCAST=false
```

### 5. Model Configuration

```
TECHNICAL_WEIGHT=0.6
NEWS_WEIGHT=0.4
```

Weights สำหรับการรวมคะแนน (Tech 60% + News 40%)

### 6. Trading Thresholds

```
BUY_THRESHOLD=0.60
SELL_THRESHOLD=0.40
```

- ถ้า combined score > 0.60 → BUY signal
- ถ้า combined score < 0.40 → SELL signal
- ไม่ก็ HOLD

### 7. Scheduler Configuration

```
CHECK_INTERVAL_MINUTES=60
```

ช่วงการตรวจสอบ signal (ทุก 60 นาที)

### 8. Server Configuration

```
PORT=3000
NODE_ENV=production
```

**Important**: เปลี่ยน `development` เป็น `production` บน Render

### 9. News RSS Feed

```
NEWS_RSS_URL=https://www.fxstreet.com/rss/news
```

Source ของข้อมูล news สำหรับ sentiment analysis

---

## Complete Setup Guide for Render

### Step 1: Go to Environment Settings

1. ไป https://dashboard.render.com
2. Select your service → **Settings**
3. ไปที่ **Environment**

### Step 2: Add All Variables

คัดลอก-วาง variables ทั้งหมดข้างล่าง:

```
# LINE Configuration
LINE_CHANNEL_ACCESS_TOKEN=4Vf10Yj3fHgDRs+Eq0ojQHZOEI/q22uBAx11iHUXKzOvBmeChLwc8LOotE14JvocrV91tpXJ3g06Qe154CzHphfGfn9bI7nfQdhT8y34t2jC+lPIs7FK9Nu1V+c9E1D6yvyrrJ7hQV5kH6gK95zrOwdB04t89/1O/w1cDnyilFU=
LINE_CHANNEL_SECRET=0604f9342c64d5d4fca95b265081c9f2
LIFF_ID=2008790639-M9uY1jY0
USE_BROADCAST=true

# Model Configuration
TECHNICAL_WEIGHT=0.6
NEWS_WEIGHT=0.4

# Trading Configuration
BUY_THRESHOLD=0.60
SELL_THRESHOLD=0.40

# Scheduler Configuration
CHECK_INTERVAL_MINUTES=60

# Server Configuration
PORT=3000
NODE_ENV=production

# News Configuration
NEWS_RSS_URL=https://www.fxstreet.com/rss/news
```

### Step 3: Deploy

1. Click **Save**
2. Wait for auto-redeploy
3. Monitor logs ใน **Logs** tab

### Step 4: Verify

ตรวจสอบในหน้า Logs ว่ามี:

```
info: Gold Trading System initialized
info: Database connection established successfully
info: Database initialized successfully
info: Scheduled to run every 60 minutes
```

---

## Security Notes

⚠️ **Important**:

- ❌ **ห้ามใส่ secrets ใน source code หรือ GitHub**
- ✅ ใช้ `.env` ไฟล์ local (ไม่ commit)
- ✅ ใช้ Render environment variables บน production
- ✅ Rotate tokens เป็นประจำ

## Environment Variable Priority

Render จะอ่านจาก:

1. **Render Dashboard Environment** (highest priority)
2. `.env` file ในโปรเจกต์
3. Default values ในโค้ด

ดังนั้น ตัวแปรใน Render Dashboard จะ override `.env` ไฟล์

---

## ตรวจสอบ Variables

```bash
# ในหน้า Shell (Render) เช่อก:
printenv | grep LINE
printenv | grep PORT
printenv | grep LIFF_ID
```

---

## ถ้า Variables ไม่โหลด

1. ตรวจสอบ typo ชื่อ variables
2. ดู Logs ว่ามี warning
3. เลือก **Trigger Deploy** เพื่อ redeploy
4. รอ 1-2 นาที ให้สิ้นสุด deployment

---

## Optional Variables

สามารถเพิ่มเพิ่มเติมได้:

```
# Database (ถ้า upgrade มา PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/dbname

# Logging
LOG_LEVEL=info

# Maintenance Window (ปิดเซิร์ฟเวอร์ช่วงบางเวลา)
MAINTENANCE_WINDOW_START=23:00
MAINTENANCE_WINDOW_END=02:00
TIMEZONE=Asia/Bangkok
```
