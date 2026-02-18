# 📱 Telegram Multi-User Broadcasting System

## ✅ สิ่งที่ทำได้

ระบบนี้ให้สิทธิ์ user ทุกคนที่มี Telegram bot สามารถ:
1. ✅ Subscribe เพื่อรับข้อความจากบอท
2. ✅ Unsubscribe ถ้าไม่ต้องการรับ
3. ✅ ดูสถานะ subscription
4. ✅ ส่งข้อความเดียวไปให้ subscribers ทั้งหมด

---

## 🔌 API Endpoints

### **1. Subscribe - ให้ User ลงทะเบียนรับข้อความ**

**Endpoint:**
```
POST /api/telegram/subscribe
```

**Request Body:**
```json
{
  "telegramUserId": "123456789",
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription successful",
  "data": {
    "id": 1,
    "telegramUserId": "123456789",
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe",
    "isActive": true,
    "subscriptionDate": "2026-02-15T10:30:00Z",
    "createdAt": "2026-02-15T10:30:00Z",
    "updatedAt": "2026-02-15T10:30:00Z"
  }
}
```

**Curl Example:**
```bash
curl -X POST http://localhost:3000/api/telegram/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "telegramUserId": "123456789",
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe"
  }'
```

---

### **2. Unsubscribe - ให้ User ยกเลิกการรับข้อความ**

**Endpoint:**
```
POST /api/telegram/unsubscribe
```

**Request Body:**
```json
{
  "telegramUserId": "123456789"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Unsubscription successful",
  "data": {
    "telegramUserId": "123456789"
  }
}
```

**Curl Example:**
```bash
curl -X POST http://localhost:3000/api/telegram/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{"telegramUserId": "123456789"}'
```

---

### **3. Check Status - ดูสถานะ Subscription**

**Endpoint:**
```
GET /api/telegram/status/:telegramUserId
```

**Response:**
```json
{
  "success": true,
  "subscribed": true,
  "data": {
    "telegramUserId": "123456789",
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe",
    "isActive": true,
    "subscriptionDate": "2026-02-15T10:30:00Z",
    "lastMessageDate": "2026-02-15T11:00:00Z"
  }
}
```

**Curl Example:**
```bash
curl http://localhost:3000/api/telegram/status/123456789
```

---

### **4. Get Subscribers Count - ดูจำนวน Subscribers**

**Endpoint:**
```
GET /api/telegram/subscribers
```

**Response:**
```json
{
  "success": true,
  "total": 150,
  "active": 142,
  "inactive": 8,
  "percentage": "94.67%"
}
```

**Curl Example:**
```bash
curl http://localhost:3000/api/telegram/subscribers
```

---

### **5. List All Subscribers - ดูรายชื่อ Subscribers (ADMIN)**

**Endpoint:**
```
GET /api/telegram/list
```

**Response:**
```json
{
  "success": true,
  "count": 150,
  "data": [
    {
      "id": 1,
      "telegram_user_id": "123456789",
      "first_name": "John",
      "last_name": "Doe",
      "username": "johndoe",
      "is_active": true,
      "subscription_date": "2026-02-15T10:30:00Z"
    },
    ...
  ]
}
```

---

### **6. Delete Subscriber - ลบ Subscriber (ADMIN)**

**Endpoint:**
```
DELETE /api/telegram/delete/:telegramUserId
```

**Response:**
```json
{
  "success": true,
  "message": "Subscriber deleted",
  "data": {
    "telegramUserId": "123456789"
  }
}
```

---

## 🔄 Broadcasting Process

### ระบบจะทำงานแบบนี้:

```
1. Trading Signal Generated
         ↓
2. Check for Active Subscribers
         ↓
3. Send to ALL Telegram Users (Parallel)
         ↓
4. Log Results
         ↓
5. Update last_message_date
```

### Example: Trading Signal Flow

```javascript
// ระบบ Trading Signal
const tradingSignal = {
  signal: "🟢 BUY",
  price: 2050.35,
  tp: 2055.75,
  sl: 2045.00
};

// TelegramNotifier.sendTradingSignal(tradingSignal) จะ:
// 1. ดึง subscribers ทั้งหมด
// 2. ส่งข้อความไปให้ทั้งหมด parallel
// 3. ลอง 5 ครั้งถ้า fail แล้วส่งต่อไปคนถัดไป
```

---

## 🗃️ Database Schema

### **TelegramSubscriber Table**

```sql
CREATE TABLE telegram_subscribers (
  id INTEGER PRIMARY KEY,
  telegram_user_id VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  username VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  subscription_date DATETIME DEFAULT NOW(),
  last_message_date DATETIME,
  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_telegram_user_id ON telegram_subscribers(telegram_user_id);
CREATE INDEX idx_is_active ON telegram_subscribers(is_active);
```

### **User Table Updates**

```sql
ALTER TABLE users ADD COLUMN notify_line BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN notify_telegram BOOLEAN DEFAULT true;
```

---

## 🎯 Usage Scenarios

### **Scenario 1: User Subscribe via Telegram Bot (Interactive)**

User ทำ `/start` กับบอท → Telegram Bot call API subscribe:

```javascript
// ในบอท telegram webhook handler
app.post('/telegram-webhook', async (req, res) => {
  const update = req.body;
  const chatId = update.message.chat.id;
  const user = update.message.from;

  if (update.message.text === '/start') {
    // Subscribe user
    const response = await axios.post('http://localhost:3000/api/telegram/subscribe', {
      telegramUserId: chatId.toString(),
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username
    });

    if (response.data.success) {
      // Send confirmation
      sendMessage(chatId, '✅ You are now subscribed to trading signals!');
    }
  }
});
```

### **Scenario 2: Frontend/LIFF Settings**

User เลือก receive Telegram notifications ใน Settings:

```javascript
// POST /api/liff/save-preferences
{
  "userId": "LINE_USER_ID",
  "notifyTelegram": true,
  "telegramUserId": "TELEGRAM_USER_ID"
}
```

### **Scenario 3: Automatic Broadcasting**

ระบบ Trading Signal ส่งให้ทั้งหมด:

```javascript
// ใน tradingSignal.processSignal()
if (newSignal) {
  await lineNotifier.sendTradingSignal(signalData);      // ส่ง LINE
  await telegramNotifier.sendTradingSignal(signalData);  // ส่ง Telegram ทั้งหมด
}
```

---

## 🧪 Testing

### **Test 1: Subscribe 3 Users**

```bash
# User 1
curl -X POST http://localhost:3000/api/telegram/subscribe \
  -H "Content-Type: application/json" \
  -d '{"telegramUserId": "111111111", "firstName": "User", "lastName": "One"}'

# User 2
curl -X POST http://localhost:3000/api/telegram/subscribe \
  -H "Content-Type: application/json" \
  -d '{"telegramUserId": "222222222", "firstName": "User", "lastName": "Two"}'

# User 3
curl -X POST http://localhost:3000/api/telegram/subscribe \
  -H "Content-Type: application/json" \
  -d '{"telegramUserId": "333333333", "firstName": "User", "lastName": "Three"}'
```

### **Test 2: Verify Subscribers**

```bash
# ดูจำนวน
curl http://localhost:3000/api/telegram/subscribers

# ดูรายชื่อ
curl http://localhost:3000/api/telegram/list
```

### **Test 3: Send Signal**

```bash
# Manual trigger signal
curl -X POST http://localhost:3000/api/check-signal

# ดูใน logs
# ✅ Found 3 active Telegram subscribers
# 📤 Sending message to 3 Telegram users...
# ✅ Sent successfully to 3/3 Telegram users
```

---

## ⚠️ Error Handling

### **Case 1: Invalid Telegram User ID**

```json
{
  "success": false,
  "error": "telegramUserId is required"
}
```

### **Case 2: User Already Subscribed**

```json
{
  "success": true,
  "message": "Already subscribed",
  "data": { "telegramUserId": "123456789" }
}
```

### **Case 3: Reactivating Inactive Subscriber**

```json
{
  "success": true,
  "message": "Reactivated subscription",
  "data": { "telegramUserId": "123456789" }
}
```

---

## 🔐 Security Considerations

1. **Rate Limiting:** ควรที่จะ implement rate limiting เพื่อป้องกัน spam
2. **Authentication:** ต้องเพิ่ม auth middleware ให้กับ admin endpoints
3. **Validation:** ตรวจสอบ telegramUserId format
4. **Logging:** บันทึก transactions ทั้งหมด

---

## 📊 Performance Tips

1. **Batch Sending:** ส่งข้อความแบบ parallel (ปัจจุบัน ✅ implemented)
2. **Caching:** เก็บ subscribers ใน memory cache เพื่อลด DB queries
3. **Connection Pool:** ใช้ SQLite connection pool
4. **Timeout:** กำหนด timeout 5 วินาทีต่อ message

---

## 🚀 ขั้นตอนต่อไป

- [ ] Add authentication middleware to admin endpoints
- [ ] Implement rate limiting
- [ ] Add Telegram webhook handler
- [ ] Create Frontend UI for settings
- [ ] Add Multi-pair trading support
