# 🤖 Telegram Integration Setup Guide

## 📝 ขั้นตอนการสร้าง Telegram Bot และเชื่อมต่อ

### **Step 1: สร้าง Telegram Bot ที่ BotFather**

1. เปิด Telegram app
2. ค้นหา [@BotFather](https://t.me/BotFather)
3. ส่งคำสั่ง `/newbot`
4. ตั้งชื่อบอท เช่น: `Gold Trading Bot`
5. ตั้ง Username เช่น: `gct_xauusd_bot` (ต้องลงท้ายด้วย `_bot`)
6. **บันทึก Token ที่ได้** ตัวอย่าง:
   ```
   123456789:ABCDefGhIjKLmNOpQrStUvWxYz_12345
   ```

---

### **Step 2: หา Telegram User ID ของคุณ**

1. เปิด Telegram app
2. ค้นหา [@userinfobot](https://t.me/userinfobot)
3. ส่ง `/start`
4. **บันทึก User ID ที่ได้** ตัวอย่าง:
   ```
   987654321
   ```

---

### **Step 3: อัปเดต .env File**

สร้าง/แก้ไข `backend/.env` file:

```bash
# ===== TELEGRAM CONFIGURATION =====
TELEGRAM_BOT_TOKEN=123456789:ABCDefGhIjKLmNOpQrStUvWxYz_12345
TELEGRAM_USER_ID=987654321
TELEGRAM_ENABLED=true

# ===== Existing LINE Config (ถ้ามี) =====
LINE_CHANNEL_ACCESS_TOKEN=your_line_token
LINE_CHANNEL_SECRET=your_line_secret
USE_BROADCAST=true
```

---

### **Step 4: ติดตั้ง Dependencies**

```bash
cd backend
npm install
```

✅ package ที่ต้องใช้ (`axios`) มีในระบบแล้ว

---

### **Step 5: เริ่มระบบ**

```bash
# Development
npm run dev

# Production
npm start
```

---

### **Step 6: ทดสอบ**

1. ลองส่ง Manual Signal Test:
   ```bash
   curl -X POST http://localhost:3000/api/check-signal
   ```

2. ตรวจสอบ Telegram ว่าได้ข้อความหรือไม่

3. ดู logs:
   ```
   ✅ Telegram message sent successfully
   ```

---

## 📊 ไฟล์ที่ได้เปลี่ยนแปลง

- ✅ `backend/src/services/telegramNotifier.js` - บริการส่ง Telegram
- ✅ `backend/src/config/config.js` - เพิ่ม Telegram config
- ✅ `backend/src/services/tradingSignal.js` - ส่งไปทั้ง LINE และ Telegram
- ✅ `backend/src/server.js` - ใช้ Telegram ใน startup/shutdown
- ✅ `backend/.env.example` - Template สำหรับ .env

---

## 🔍 API Endpoints ที่อัปเดต

### `/api/status` - ดูสถานะ Telegram

```bash
curl http://localhost:3000/api/status
```

**Response:**
```json
{
  "lastSignal": "🟢 BUY",
  "lastSignalTime": "2026-02-15T10:30:00Z",
  "notifiers": {
    "line": { "configured": true },
    "telegram": {
      "enabled": true,
      "hasToken": true,
      "hasUserId": true,
      "configured": true
    }
  },
  "config": {
    "checkInterval": 60,
    "buyThreshold": 0.6,
    "sellThreshold": 0.4
  }
}
```

---

## 🚨 Troubleshooting

### ❌ Telegram ไม่ส่งข้อความ

**ตรวจสอบ:**
1. ✅ Token ถูกต้องหรือไม่?
2. ✅ User ID ถูกต้องหรือไม่?
3. ✅ `TELEGRAM_ENABLED=true` ใน .env?
4. ✅ ดู logs: `npm run dev`

```
⚠️ TELEGRAM_BOT_TOKEN is not set!
```

### ✅ ทดสอบ Token ด้วย curl

```bash
curl -X GET "https://api.telegram.org/bot<YOUR_TOKEN>/getMe"
```

ต้องได้ response:
```json
{
  "ok": true,
  "result": {
    "id": 123456789,
    "is_bot": true,
    "first_name": "Gold Trading Bot"
  }
}
```

### ✅ ทดสอบส่งข้อความด้วย curl

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": <YOUR_USER_ID>,
    "text": "Test message from Trading Bot"
  }'
```

---

## 📱 ข้อความที่ได้รับ

เมื่อมี signal ใหม่ คุณจะได้ข้อความแบบนี้:

```
🔔 Gold Trading Signal 🔔
━━━━━━━━━━━━━━━━━━
Signal: 🟢 BUY
Confidence: 78.50%

📊 Technical Score: 82.00%
📰 News Score: 75.00%

💰 Current Price: $2050.35
🎯 Take Profit: $2055.75
🛡️ Stop Loss: $2045.00

⏰ Time: 15 ก.พ. 2568 10:30
━━━━━━━━━━━━━━━━━━
```

---

## 🎯 สิ่งที่ต่อมา

หลังจากทำให้ Telegram ทำงานแล้ว เราจะ:
1. ✅ **Update Database** - เพิ่ม Telegram User ID ใน database
2. ✅ **User Settings** - ให้ user เลือก notification channels
3. ✅ **Multiple Trading Pairs** - ให้ user เลือก XAUUSD, EURUSD, BTCUSD ฯลฯ

---

## ✨ ข้อสำคัญ

- Telegram API: `https://core.telegram.org/bots/api`
- ส่วนใหญ่ใช้ parse_mode `HTML` สำหรับ formatting
- ข้อความถูก validate ก่อนส่ง (ไม่ส่ง $0.00 prices)
- LINE และ Telegram ส่งพร้อมกัน (Independent)

---

**โค้ดสำเร็จแล้ว! ⚡**
