# 🗄️ Database Schema Design for User & Settings

## 📊 Overall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       users (Main)                           │
│  - line_user_id, telegram_user_id, display_name, etc       │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ├────────────────────┼────────────────────┤
         ▼                    ▼                    ▼
   ┌──────────────┐  ┌────────────────────┐  ┌──────────────┐
   │ notification │  │  trading_settings  │  │ user_trading │
   │ preferences  │  │                    │  │    pairs     │
   └──────────────┘  └────────────────────┘  └──────────────┘
                                                      │
                                                      ▼
                                            ┌──────────────────┐
                                            │ trading_pairs    │
                                            │ (XAUUSD, etc)    │
                                            └──────────────────┘
```

---

## 🗂️ Table Schemas

### **1. users - Main User Profile**

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- LINE Integration
  line_user_id VARCHAR(255) UNIQUE,
  line_display_name VARCHAR(255),
  line_picture_url VARCHAR(500),
  line_status_message VARCHAR(255),
  
  -- Telegram Integration
  telegram_user_id VARCHAR(255) UNIQUE,
  telegram_first_name VARCHAR(255),
  telegram_last_name VARCHAR(255),
  telegram_username VARCHAR(255),
  
  -- User Status
  is_active BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false,
  
  -- Personal Info
  email VARCHAR(255) UNIQUE,
  language VARCHAR(10) DEFAULT 'th',
  timezone VARCHAR(50) DEFAULT 'Asia/Bangkok',
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  
  -- Indexes
  UNIQUE(line_user_id),
  UNIQUE(telegram_user_id),
  UNIQUE(email),
  INDEX(is_active),
  INDEX(created_at)
);
```

**ตัวอย่างข้อมูล:**
```sql
INSERT INTO users (line_user_id, telegram_user_id, line_display_name, email) 
VALUES (
  'U1234567890abcdefghijklmnop',
  '123456789',
  'John Doe',
  'john@example.com'
);
```

---

### **2. user_notification_preferences - Alert Settings**

```sql
CREATE TABLE user_notification_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  
  -- Channel Preferences
  notify_line BOOLEAN DEFAULT true,
  notify_telegram BOOLEAN DEFAULT true,
  notify_email BOOLEAN DEFAULT false,
  notify_sms BOOLEAN DEFAULT false,
  
  -- Signal Types
  send_buy_signals BOOLEAN DEFAULT true,
  send_sell_signals BOOLEAN DEFAULT true,
  send_hold_signals BOOLEAN DEFAULT false,
  
  -- Alert Timing
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start VARCHAR(5),  -- HH:MM
  quiet_hours_end VARCHAR(5),    -- HH:MM
  timezone VARCHAR(50) DEFAULT 'Asia/Bangkok',
  
  -- Signal Threshold
  min_confidence_threshold DECIMAL(3, 2) DEFAULT 0.60,  -- 60%
  
  -- Frequency
  max_alerts_per_day INTEGER DEFAULT 10,
  alert_frequency VARCHAR(50) DEFAULT 'all',  -- all, hourly, daily
  
  -- Created/Updated
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Key
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX(user_id)
);
```

**ตัวอย่างข้อมูล:**
```sql
INSERT INTO user_notification_preferences (user_id, notify_line, notify_telegram, quiet_hours_enabled, quiet_hours_start, quiet_hours_end)
VALUES (
  1,
  true,           -- ส่ง LINE
  true,           -- ส่ง Telegram
  true,           -- เปิด quiet hours
  '22:00',        -- เงียบตั้งแต่ 10 PM
  '08:00'         -- จนถึง 8 AM
);
```

---

### **3. trading_pairs - Available Trading Pairs**

```sql
CREATE TABLE trading_pairs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Pair Info
  pair_code VARCHAR(20) UNIQUE NOT NULL,  -- XAUUSD, EURUSD, etc
  pair_name VARCHAR(100) NOT NULL,        -- Gold/USD, Euro/USD
  pair_symbol VARCHAR(10) NOT NULL,       -- g, e, b, etc
  
  -- Asset Type
  asset_type VARCHAR(50) NOT NULL,  -- commodity, forex, crypto, stock
  base_asset VARCHAR(50),           -- Gold, Euro, Bitcoin
  quote_asset VARCHAR(50),          -- USD, EUR
  
  -- Trading Settings
  is_active BOOLEAN DEFAULT true,
  min_price DECIMAL(12, 2),
  max_price DECIMAL(12, 2),
  price_update_interval INTEGER DEFAULT 1,  -- minutes
  
  -- Model Info
  model_available BOOLEAN DEFAULT true,
  technical_model_path VARCHAR(255),
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  UNIQUE(pair_code),
  INDEX(asset_type),
  INDEX(is_active)
);
```

**ตัวอย่างข้อมูล:**
```sql
INSERT INTO trading_pairs (pair_code, pair_name, pair_symbol, asset_type, base_asset, quote_asset, model_available)
VALUES
  ('XAUUSD', 'Gold/USD', 'g', 'commodity', 'Gold', 'USD', true),
  ('EURUSD', 'Euro/USD', 'e', 'forex', 'Euro', 'USD', true),
  ('GBPUSD', 'Pound/USD', 'p', 'forex', 'British Pound', 'USD', false),
  ('BTCUSD', 'Bitcoin/USD', 'b', 'crypto', 'Bitcoin', 'USD', true),
  ('ETHUSD', 'Ethereum/USD', 'eth', 'crypto', 'Ethereum', 'USD', true);
```

---

### **4. user_trading_pairs - User Selected Pairs**

```sql
CREATE TABLE user_trading_pairs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  pair_id INTEGER NOT NULL,
  
  -- User Selection
  is_selected BOOLEAN DEFAULT true,
  
  -- Pair-Specific Settings
  buy_threshold DECIMAL(3, 2),   -- 0.60 = 60%
  sell_threshold DECIMAL(3, 2),  -- 0.40 = 40%
  tp_multiplier DECIMAL(4, 2),   -- Take Profit multiplier
  sl_multiplier DECIMAL(4, 2),   -- Stop Loss multiplier
  
  -- Pair-Specific Notifications
  notify_pair BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Keys
  PRIMARY KEY(user_id, pair_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(pair_id) REFERENCES trading_pairs(id) ON DELETE CASCADE,
  INDEX(user_id),
  INDEX(pair_id),
  INDEX(is_selected)
);
```

**ตัวอย่างข้อมูล:**
```sql
-- User 1 เลือก XAUUSD
INSERT INTO user_trading_pairs (user_id, pair_id, is_selected, buy_threshold, sell_threshold, tp_multiplier, sl_multiplier)
VALUES (1, 1, true, 0.60, 0.40, 2.0, 1.0);

-- User 1 เลือก EURUSD
INSERT INTO user_trading_pairs (user_id, pair_id, is_selected, buy_threshold, sell_threshold)
VALUES (1, 2, true, 0.65, 0.35);

-- User 1 ไม่เลือก GBPUSD
INSERT INTO user_trading_pairs (user_id, pair_id, is_selected)
VALUES (1, 3, false);
```

---

### **5. user_trading_parameters - Advanced Settings**

```sql
CREATE TABLE user_trading_parameters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  
  -- Technical Analysis
  rsi_period INTEGER DEFAULT 14,
  sma_short INTEGER DEFAULT 20,
  sma_long INTEGER DEFAULT 50,
  atr_period INTEGER DEFAULT 7,
  
  -- Weighting
  rsi_weight DECIMAL(3, 2) DEFAULT 0.30,
  sma_weight DECIMAL(3, 2) DEFAULT 0.20,
  technical_weight DECIMAL(3, 2) DEFAULT 0.60,
  news_weight DECIMAL(3, 2) DEFAULT 0.40,
  
  -- Risk Management
  max_daily_trades INTEGER DEFAULT 10,
  max_loss_per_day DECIMAL(10, 2),
  position_size DECIMAL(6, 2),
  
  -- History
  history_period VARCHAR(20) DEFAULT '60d',
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Key
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX(user_id)
);
```

**ตัวอย่างข้อมูล:**
```sql
INSERT INTO user_trading_parameters (user_id, rsi_period, sma_short, sma_long, rsi_weight, sma_weight)
VALUES (
  1,
  14,      -- RSI period
  20,      -- Short SMA
  50,      -- Long SMA
  0.4,     -- RSI weight 40%
  0.3      -- SMA weight 30%
);
```

---

### **6. telegram_subscribers - Keep for Backwards Compatibility**

```sql
CREATE TABLE telegram_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_user_id VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  username VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  subscription_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_message_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Link to users table (optional)
  user_id INTEGER,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(telegram_user_id),
  INDEX(is_active)
);
```

---

## 📝 Migration Scripts

### **Create All Tables**

```sql
-- 1. Create users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  line_user_id VARCHAR(255) UNIQUE,
  telegram_user_id VARCHAR(255) UNIQUE,
  line_display_name VARCHAR(255),
  line_picture_url VARCHAR(500),
  line_status_message VARCHAR(255),
  telegram_first_name VARCHAR(255),
  telegram_last_name VARCHAR(255),
  telegram_username VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false,
  email VARCHAR(255) UNIQUE,
  language VARCHAR(10) DEFAULT 'th',
  timezone VARCHAR(50) DEFAULT 'Asia/Bangkok',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  UNIQUE(line_user_id),
  UNIQUE(telegram_user_id),
  UNIQUE(email),
  INDEX(is_active),
  INDEX(created_at)
);

-- 2. Create notification preferences
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  notify_line BOOLEAN DEFAULT true,
  notify_telegram BOOLEAN DEFAULT true,
  notify_email BOOLEAN DEFAULT false,
  notify_sms BOOLEAN DEFAULT false,
  send_buy_signals BOOLEAN DEFAULT true,
  send_sell_signals BOOLEAN DEFAULT true,
  send_hold_signals BOOLEAN DEFAULT false,
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start VARCHAR(5),
  quiet_hours_end VARCHAR(5),
  timezone VARCHAR(50) DEFAULT 'Asia/Bangkok',
  min_confidence_threshold DECIMAL(3, 2) DEFAULT 0.60,
  max_alerts_per_day INTEGER DEFAULT 10,
  alert_frequency VARCHAR(50) DEFAULT 'all',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX(user_id)
);

-- 3. Create trading pairs
CREATE TABLE IF NOT EXISTS trading_pairs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pair_code VARCHAR(20) UNIQUE NOT NULL,
  pair_name VARCHAR(100) NOT NULL,
  pair_symbol VARCHAR(10) NOT NULL,
  asset_type VARCHAR(50) NOT NULL,
  base_asset VARCHAR(50),
  quote_asset VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  min_price DECIMAL(12, 2),
  max_price DECIMAL(12, 2),
  price_update_interval INTEGER DEFAULT 1,
  model_available BOOLEAN DEFAULT true,
  technical_model_path VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(pair_code),
  INDEX(asset_type),
  INDEX(is_active)
);

-- 4. Create user trading pairs
CREATE TABLE IF NOT EXISTS user_trading_pairs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  pair_id INTEGER NOT NULL,
  is_selected BOOLEAN DEFAULT true,
  buy_threshold DECIMAL(3, 2),
  sell_threshold DECIMAL(3, 2),
  tp_multiplier DECIMAL(4, 2),
  sl_multiplier DECIMAL(4, 2),
  notify_pair BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id, pair_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(pair_id) REFERENCES trading_pairs(id) ON DELETE CASCADE,
  INDEX(user_id),
  INDEX(pair_id),
  INDEX(is_selected)
);

-- 5. Create user trading parameters
CREATE TABLE IF NOT EXISTS user_trading_parameters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  rsi_period INTEGER DEFAULT 14,
  sma_short INTEGER DEFAULT 20,
  sma_long INTEGER DEFAULT 50,
  atr_period INTEGER DEFAULT 7,
  rsi_weight DECIMAL(3, 2) DEFAULT 0.30,
  sma_weight DECIMAL(3, 2) DEFAULT 0.20,
  technical_weight DECIMAL(3, 2) DEFAULT 0.60,
  news_weight DECIMAL(3, 2) DEFAULT 0.40,
  max_daily_trades INTEGER DEFAULT 10,
  max_loss_per_day DECIMAL(10, 2),
  position_size DECIMAL(6, 2),
  history_period VARCHAR(20) DEFAULT '60d',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX(user_id)
);

-- 6. Keep telegram_subscribers for backwards compatibility
CREATE TABLE IF NOT EXISTS telegram_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_user_id VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  username VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  subscription_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_message_date DATETIME,
  user_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(telegram_user_id),
  INDEX(is_active)
);
```

---

## 🔍 Query Examples

### **1. Get User with All Settings**

```sql
SELECT 
  u.id,
  u.line_user_id,
  u.telegram_user_id,
  u.line_display_name,
  u.email,
  np.notify_line,
  np.notify_telegram,
  np.min_confidence_threshold,
  tp.rsi_period,
  tp.sma_short
FROM users u
LEFT JOIN user_notification_preferences np ON u.id = np.user_id
LEFT JOIN user_trading_parameters tp ON u.id = tp.user_id
WHERE u.id = 1;
```

### **2. Get User Selected Trading Pairs**

```sql
SELECT 
  tp.pair_code,
  tp.pair_name,
  utp.is_selected,
  utp.buy_threshold,
  utp.sell_threshold,
  utp.tp_multiplier,
  utp.sl_multiplier
FROM user_trading_pairs utp
JOIN trading_pairs tp ON utp.pair_id = tp.id
WHERE utp.user_id = 1 AND utp.is_selected = true;
```

### **3. Get All Active Users for Broadcasting**

```sql
SELECT DISTINCT
  u.id,
  u.telegram_user_id,
  np.notify_telegram,
  utp.pair_id
FROM users u
JOIN user_notification_preferences np ON u.id = np.user_id
JOIN user_trading_pairs utp ON u.id = utp.user_id
WHERE u.is_active = true 
  AND np.notify_telegram = true 
  AND utp.is_selected = true
ORDER BY u.id;
```

### **4. Get User Preferences for Specific Pair**

```sql
SELECT 
  u.id,
  u.telegram_user_id,
  utp.buy_threshold,
  utp.sell_threshold,
  tp.pair_code,
  tp.pair_name
FROM users u
JOIN user_trading_pairs utp ON u.id = utp.user_id
JOIN trading_pairs tp ON utp.pair_id = tp.id
WHERE tp.pair_code = 'XAUUSD' 
  AND utp.is_selected = true
  AND u.is_active = true;
```

---

## 🛠️ Usage Flow

### **Flow 1: User Registers (LINE)**

```sql
-- 1. Create user
INSERT INTO users (line_user_id, line_display_name, email)
VALUES ('U123...', 'John Doe', 'john@example.com');

-- 2. Create default notification preferences
INSERT INTO user_notification_preferences (user_id, notify_line)
VALUES (LAST_INSERT_ID(), true);

-- 3. Create default trading parameters
INSERT INTO user_trading_parameters (user_id)
VALUES (LAST_INSERT_ID());

-- 4. Add default pair (XAUUSD)
INSERT INTO user_trading_pairs (user_id, pair_id, is_selected)
VALUES (LAST_INSERT_ID(), 1, true);
```

### **Flow 2: User Adds Telegram**

```sql
-- Link telegram to existing user
UPDATE users 
SET telegram_user_id = '987654321'
WHERE id = 1;

-- Update notification preference
UPDATE user_notification_preferences
SET notify_telegram = true
WHERE user_id = 1;

-- Auto-link telegram_subscribers
INSERT INTO telegram_subscribers (telegram_user_id, user_id, first_name)
VALUES ('987654321', 1, 'John');

-- OR update existing
UPDATE telegram_subscribers
SET user_id = 1
WHERE telegram_user_id = '987654321';
```

### **Flow 3: User Changes Trading Pairs**

```sql
-- User enables EURUSD
INSERT INTO user_trading_pairs (user_id, pair_id, is_selected)
VALUES (1, 2, true);

-- User disables GBPUSD
UPDATE user_trading_pairs
SET is_selected = false
WHERE user_id = 1 AND pair_id = 3;
```

### **Flow 4: Send Signal to User's Selected Pairs**

```sql
-- Get pairs this user is interested in + their settings
SELECT 
  utp.pair_id,
  tp.pair_code,
  utp.buy_threshold,
  utp.sell_threshold
FROM user_trading_pairs utp
JOIN trading_pairs tp ON utp.pair_id = tp.id
WHERE utp.user_id = 1 AND utp.is_selected = true;

-- -> Then check if signal matches their thresholds
-- -> Send only if they enabled notifications for this pair
```

---

## ✅ Summary

| Table | Purpose | Records |
|-------|---------|---------|
| users | Main profile | 1 per user |
| user_notification_preferences | Alert settings | 1 per user |
| user_trading_parameters | Advanced trading settings | 1 per user |
| trading_pairs | Available pairs (XAUUSD, EURUSD, etc.) | ~10-50 |
| user_trading_pairs | User + Pair mapping + settings | M x N |
| telegram_subscribers | Telegram integration tracking | Legacy but kept |

---

## 📌 Key Benefits

✅ **Scalable** - Support unlimited pairs and users
✅ **Flexible** - Each pair can have different settings per user
✅ **Privacy** - Each user has their own notification preferences
✅ **Efficient** - Indexed queries for fast lookups
✅ **Maintainable** - Clear separation of concerns
