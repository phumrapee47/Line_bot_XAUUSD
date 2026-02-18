# 🛠️ Database Implementation Guide

## 📋 ความรู้ทั่วไป

**Database**: SQLite (ใช้ Sequelize ORM)
**Location**: `backend/data/trading_bot.db`
**Models Location**: `backend/src/models/`
**Services Location**: `backend/src/services/`

---

## 🚀 ขั้นตอนการใช้งาน

### **1. Initialize Database ที่ครั้งแรก**

```bash
# Database จะสร้างอัตโนมัติเมื่อ server เริ่มต้น
cd backend
npm run dev
```

### **2. Seed Trading Pairs (ครั้งแรก)**

```bash
node seeds/seedTradingPairs.js
```

**Output:**
```
🌱 Starting database seed...
✅ Database synced
📍 Seeding Trading Pairs...
  ✅ XAUUSD - Gold / USD
  ✅ EURUSD - Euro / USD
  ✅ BTCUSD - Bitcoin / USD
  ...
✅ Database seeding completed!
📊 Total trading pairs: 7
```

---

## 💾 Models and Usage

### **1. User Model**

**Path**: `backend/src/models/User.js`

```javascript
// Create user
const user = await User.create({
  lineUserId: 'U123...',
  displayName: 'John Doe',
  email: 'john@example.com',
  language: 'th',
  timezone: 'Asia/Bangkok'
});

// Find user
const user = await User.findOne({
  where: { lineUserId: 'U123...' }
});

// Update user
await user.update({
  telegramUserId: '987654321',
  isActive: false
});
```

---

### **2. UserNotificationPreferences Model**

**Path**: `backend/src/models/UserNotificationPreferences.js`

ควบคุมว่าส่ง notification ช่องไหน ยังไง

```javascript
// Create preferences
const prefs = await UserNotificationPreferences.create({
  userId: user.id,
  notifyLine: true,
  notifyTelegram: false,
  notifyEmail: false,
  sendBuySignals: true,
  sendSellSignals: true,
  minConfidenceThreshold: 0.60
});

// Update preferences
await prefs.update({
  notifyTelegram: true,
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00'
});
```

---

### **3. TradingPair Model**

**Path**: `backend/src/models/TradingPair.js`

List ของ pairs ที่เป็นต้นแบบ (สร้างจาก seed)

```javascript
// Get all trading pairs
const pairs = await TradingPair.findAll({
  where: { isActive: true }
});

// Get specific pair
const xau = await TradingPair.findOne({
  where: { pairCode: 'XAUUSD' }
});

// Get by asset type
const cryptoPairs = await TradingPair.findAll({
  where: { assetType: 'crypto', isActive: true }
});
```

---

### **4. UserTradingPair Model**

**Path**: `backend/src/models/UserTradingPair.js`

User เลือก pair ไหน + settings อะไรต่อไป

```javascript
// Add pair for user
const userPair = await UserTradingPair.create({
  userId: user.id,
  pairId: xauPair.id,
  isSelected: true,
  buyThreshold: 0.65,
  sellThreshold: 0.35,
  tpMultiplier: 2.0,
  slMultiplier: 1.0
});

// Get user's selected pairs
const selectedPairs = await UserTradingPair.findAll({
  where: { userId: user.id, isSelected: true },
  include: [TradingPair]
});

// Disable a pair
await userPair.update({ isSelected: false });
```

---

### **5. UserTradingParameters Model**

**Path**: `backend/src/models/UserTradingParameters.js`

Advanced trading settings

```javascript
// Create or get
const params = await UserTradingParameters.findOrCreate({
  where: { userId: user.id },
  defaults: {
    rsiPeriod: 14,
    smaShort: 20,
    smaLong: 50,
    technicalWeight: 0.6,
    newsWeight: 0.4
  }
});

// Update
await params.update({
  rsiPeriod: 21,
  maxDailyTrades: 5
});
```

---

## 🧠 UserSettingsService

**Path**: `backend/src/services/userSettingsService.js`

Ready-to-use service สำหรับการจัดการ user settings

### **Main Methods:**

#### **1. Create User (with all defaults)**

```javascript
const userSettingsService = require('../services/userSettingsService');

const user = await userSettingsService.createUser({
  lineUserId: 'U123...',
  displayName: 'John Doe',
  displayName: 'john@example.com',
  language: 'th'
});

// Will also create:
// - Default notification preferences (notify LINE only)
// - Default trading parameters
// - Default XAUUSD pair
```

#### **2. Get User Profile**

```javascript
const profile = await userSettingsService.getUserProfile(userId);

// Returns:
// {
//   user: { id, lineUserId, displayName, ... },
//   notificationPreferences: { notifyLine, notifyTelegram, ... },
//   tradingParameters: { rsiPeriod, smaShort, ... }
// }
```

#### **3. Get User Trading Pairs**

```javascript
const pairs = await userSettingsService.getUserTradingPairs(userId);

// Returns:
// [
//   {
//     id: 1,
//     userId: 1,
//     pairId: 1,
//     isSelected: true,
//     buyThreshold: 0.60,
//     pair: { pairCode: 'XAUUSD', pairName: 'Gold / USD', ... }
//   },
//   ...
// ]
```

#### **4. Update Notification Preferences**

```javascript
await userSettingsService.updateNotificationPreferences(userId, {
  notifyTelegram: true,
  notifyEmail: false,
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  minConfidenceThreshold: 0.70
});
```

#### **5. Update Trading Parameters**

```javascript
await userSettingsService.updateTradingParameters(userId, {
  rsiPeriod: 21,
  smaShort: 30,
  technicalWeight: 0.7,
  maxDailyTrades: 5
});
```

#### **6. Toggle Trading Pair**

```javascript
// Enable pair
await userSettingsService.toggleUserTradingPair(
  userId,
  'EURUSD',
  true
);

// Disable pair
await userSettingsService.toggleUserTradingPair(
  userId,
  'EURUSD',
  false
);
```

#### **7. Link Telegram**

```javascript
await userSettingsService.linkTelegram(userId, {
  telegramUserId: '123456789',
  firstName: 'John',
  lastName: 'Doe',
  username: 'johndoe'
});

// Will also enable telegram notifications
```

#### **8. Get Active Users for Broadcasting**

```javascript
// Get all users for Telegram broadcast
const telegramUsers = await userSettingsService.getActiveUsersForBroadcasting('telegram');

// Get users for specific pair (XAUUSD only)
const xauUsers = await userSettingsService.getActiveUsersForBroadcasting('telegram', 'XAUUSD');

// Returns:
// [
//   { id: 1, telegram_user_id: '123456789', display_name: 'John' },
//   ...
// ]
```

---

## 🔄 Typical Flows

### **Flow 1: User Registers via LINE**

```javascript
const userService = require('../services/userSettingsService');

// 1. Create user from LINE webhook
const user = await userService.createUser({
  lineUserId: req.body.lineUserId,
  displayName: req.body.displayName,
  email: null
});
// Creates:
// - users table entry
// - Default notification preferences (notify LINE)
// - Default trading parameters
// - XAUUSD pair enabled

// 2. Frontend sends confirmation
res.json({
  success: true,
  userId: user.id,
  defaultPairs: ['XAUUSD']
});
```

### **Flow 2: User Adds Telegram**

```javascript
// 1. Frontend calls /api/user/link-telegram
const userId = req.body.userId;
const telegramData = req.body; // { telegramUserId, firstName, ... }

await userService.linkTelegram(userId, telegramData);
// Updates:
// - user.telegramUserId
// - notification preferences (enable telegram)

// 2. Response
res.json({
  success: true,
  message: 'Telegram linked successfully'
});
```

### **Flow 3: User Changes Trading Pairs**

```javascript
// Frontend: User toggles EURUSD on
const userId = req.body.userId;
const pairCode = req.body.pairCode; // 'EURUSD'

await userService.toggleUserTradingPair(userId, pairCode, true);

// Backend checks: signal comes for EURUSD
// -> Gets only users who have EURUSD enabled
// -> Sends only to them
```

### **Flow 4: Send Signal to Interested Users**

```javascript
// ใน tradingSignal.js
const { pairCode } = signalData;

// Get all active telegram users interested in this pair
const users = await userService.getActiveUsersForBroadcasting(
  'telegram',
  pairCode
);

// Send to each user
for (const user of users) {
  await telegramNotifier.sendTelegramMessage(
    message,
    user.telegram_user_id
  );
}
```

---

## 📊 Data Relationships

```
┌────────────────────────────────────────────────────────┐
│                User (id=1)                             │
│  lineUserId: U123...                                   │
│  telegramUserId: 987654321                             │
│  email: john@example.com                               │
└────────────────────────────────────────────────────────┘
         │                    │                 │
         ├────────────────────┼─────────────────┤
         ▼                    ▼                 ▼
    ┌─────────┐    ┌──────────────┐    ┌──────────────┐
    │NotifPref│    │TradingParams │    │UserTradingPair
    │ tg: true│    │ rsi_period:14│    │P1:XAUUSD ✓
    │ line:true│    │sma_short:20  │    │P2:EURUSD ✓
    └─────────┘    └──────────────┘    │P3:GBPUSD ✗
                                         └──────────────┘
                                            │        │
                                            └────┬───┘
                                                 ▼
                                         ┌──────────────┐
                                         │TradingPair   │
                                         │P1:XAUUSD     │
                                         │P2:EURUSD     │
                                         │P3:GBPUSD     │
                                         └──────────────┘
```

---

## 🧪 Testing Query

```sql
-- Get complete user profile
SELECT 
  u.id,
  u.line_user_id,
  u.telegram_user_id,
  u.display_name,
  np.notify_line,
  np.notify_telegram,
  tp.rsi_period,
  tp.sma_short,
  GROUP_CONCAT(tr.pair_code) as selected_pairs
FROM users u
LEFT JOIN user_notification_preferences np ON u.id = np.user_id
LEFT JOIN user_trading_parameters tp ON u.id = tp.user_id
LEFT JOIN (
  SELECT utp.user_id, tr.pair_code
  FROM user_trading_pairs utp
  JOIN trading_pairs tr ON utp.pair_id = tr.id
  WHERE utp.is_selected = true
) tr ON u.id = tr.user_id
WHERE u.id = 1
GROUP BY u.id;
```

---

## ✅ Checklist

- [ ] Database synced
- [ ] Trading pairs seeded
- [ ] UserSettingsService imported
- [ ] Models initialized in initDatabase.js
- [ ] Frontend ready to save settings
- [ ] Broadcasting logic updated

---

## 💡 Tips

1. **Always use Service**: ใช้ `userSettingsService` ไม่ใช้ direct model queries
2. **Foreign Keys**: Cascade delete ใช้อัตโนมัติ
3. **Defaults**: ตั้งค่า default เสมอเมื่อสร้าง user ใหม่
4. **Validation**: Validate ที่ service level
5. **Logging**: บันทึก operations ใหญ่ๆ ทั้งหมด
