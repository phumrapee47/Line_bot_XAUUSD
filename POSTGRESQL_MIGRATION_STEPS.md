# 🚀 PostgreSQL Migration Steps

## 📋 ทำตามขั้นตอนนี้เพื่อเปลี่ยนจาก SQLite ไป PostgreSQL

---

## ✅ ที่ได้ทำเสร็จแล้ว

- ✅ database.js อัปเดตไป PostgreSQL
- ✅ package.json เปลี่ยน (sqlite3 → pg, pg-hstore)
- ✅ .env.example เพิ่ม DB credentials
- ✅ Support DATABASE_URL สำหรับ Render

---

## 🔧 ขั้นตอนการตั้งค่า

### **ขั้นตอนที่ 1: ติดตั้ง PostgreSQL**

**Windows:**
1. ไป https://www.postgresql.org/download/windows/
2. ดาวน์โหลด PostgreSQL 15+
3. Install + เลือก pgAdmin ด้วย
4. ตั้งรหัส postgres user (จำไว้!)

**MacOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
```

---

### **ขั้นตอนที่ 2: สร้าง Database**

```bash
psql -U postgres
```

ใน psql shell:
```sql
-- Create database
CREATE DATABASE trading_bot;

-- Check
\l
-- ต้องเห็น trading_bot ในรายชื่อ

\q
```

---

### **ขั้นตอนที่ 3: แก้ไข .env**

สร้าง `backend/.env`:

```bash
# === PostgreSQL ===
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trading_bot
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_LOGGING=false
DB_SSL=false

# === Telegram ===
TELEGRAM_BOT_TOKEN=8591121449:AAGUxvbHon29QiTz0MqZqMiYkSbwuwToONI
TELEGRAM_USER_ID=your_user_id
TELEGRAM_ENABLED=true

# === LINE ===
LINE_CHANNEL_ACCESS_TOKEN=your_token
LINE_CHANNEL_SECRET=your_secret
USE_BROADCAST=true

# === Server ===
PORT=3000
```

---

### **ขั้นตอนที่ 4: Install Dependencies**

```bash
cd backend

# ลบของเก่า
rm -rf node_modules package-lock.json

# Install ใหม่
npm install
```

**จะติดตั้ง:**
- `pg` - PostgreSQL driver
- `pg-hstore` - JSON support

---

### **ขั้นตอนที่ 5: สตาร์ท Server**

```bash
npm run dev
```

**ดูใน Terminal ต้องเห็น:**
```
✅ Database connection established successfully
✅ Database initialized successfully
```

ถ้าเห็นสี่เขียว ✅ = สำเร็จ!

---

### **ขั้นตอนที่ 6: Seed Data**

```bash
# ใน terminal ใหม่
node seeds/seedTradingPairs.js
```

**Output:**
```
🌱 Starting database seed...
✅ Database synced
📍 Seeding Trading Pairs...
  ✅ XAUUSD - Gold / USD
  ✅ EURUSD - Euro / USD
```

---

## ✅ ตรวจสอบการตั้งค่า

### **Test 1: Connect to Database**

```bash
psql -U postgres -d trading_bot
```

### **Test 2: Check Tables**

```sql
\dt
```

ต้องเห็น:
```
users
telegram_subscribers
trading_pairs
user_trading_pairs
user_notification_preferences
user_trading_parameters
```

### **Test 3: Count Pairs**

```sql
SELECT COUNT(*) FROM trading_pairs;
-- Output: 7
```

### **Test 4: Exit**

```sql
\q
```

---

## 📊 Backup Old SQLite Data (ถ้ามี)

ถ้ามี user เก่าใน SQLite:

```bash
# 1. Export from SQLite
sqlite3 data/trading_bot_old.db ".dump users" > users_backup.sql

# 2. Import to PostgreSQL
psql -U postgres -d trading_bot < users_backup.sql
```

---

## 🌐 Deploy ไป Render.com

### **ขั้นตอนที่ 1: Create PostgreSQL on Render**

1. ไป https://render.com
2. `New +` > `PostgreSQL`
3. ตั้งค่า:
   - **Name**: trading-bot-db
   - **Database**: trading_bot
   - **User**: postgres
   - **Region**: Singapore

### **ขั้นตอนที่ 2: Copy Connection URL**

Render จะให้ **Internal Database URL**:
```
postgresql://postgres:xxxxxxxxxxxxx@dpg-xxxxxx.c2.render.com:5432/trading_bot
```

### **ขั้นตอนที่ 3: Add to Render Service**

ใน Environment Variables ของ Backend Service:
```
DATABASE_URL=postgresql://postgres:xxxxx@dpg-xxx.c2.render.com:5432/trading_bot
DB_SSL=true
```

### **ขั้นตอนที่ 4: Deploy**

Render จะ auto-deploy เมื่อ commit ไป Git

ดูใน Logs:
```
✅ Database connection established successfully
```

---

## 🐛 Troubleshooting

### ❌ Error: connect ECONNREFUSED

```
PostgreSQL not running!
```

**Fix:**
```bash
# Windows
net start postgresql-x64-15

# MacOS
brew services start postgresql@15

# Linux
sudo systemctl start postgresql
```

### ❌ Error: FATAL password authentication failed

```
Wrong password!
```

**Fix:**
```bash
psql -U postgres -c "ALTER USER postgres PASSWORD 'newpass';"
```

Update .env:
```
DB_PASSWORD=newpass
```

### ❌ Error: database "trading_bot" does not exist

```
Database not created!
```

**Fix:**
```bash
psql -U postgres -c "CREATE DATABASE trading_bot;"
```

### ❌ Error: relation "users" does not exist

```
Tables not synced!
```

**Fix:**
```bash
# Restart server
npm run dev

# Check logs for ✅ Database initialized successfully
```

---

## 📋 Checklist

```
PostgreSQL Setup:
  [ ] PostgreSQL installed
  [ ] Database trading_bot created
  [ ] .env file configured
  
Backend Setup:
  [ ] node_modules deleted
  [ ] npm install completed
  [ ] npm run dev starts without errors
  
Database Initialization:
  [ ] Tables created (check with \dt)
  [ ] Trading pairs seeded (count = 7)
  [ ] Can connect via psql
  
Testing:
  [ ] No connection errors in logs
  [ ] All 6 tables exist
  [ ] Trading pairs data present
  [ ] Ready for development
```

---

## 🎯 Summary

| Step | Command | Status |
|------|---------|--------|
| 1 | Install PostgreSQL | ✅ |
| 2 | Create database | `psql -c "CREATE DATABASE trading_bot;"` |
| 3 | Setup .env | `DB_HOST=localhost` |
| 4 | npm install | `rm -rf node_modules && npm install` |
| 5 | Start server | `npm run dev` |
| 6 | Seed data | `node seeds/seedTradingPairs.js` |
| 7 | Verify | `psql -d trading_bot -c "SELECT COUNT(*) FROM trading_pairs;"` |

---

## ✨ ทำเสร็จแล้ว!

ระบบพร้อม deploy ไป production ด้วย PostgreSQL 🚀

### ขั้นตอนต่อ:
1. ✅ PostgreSQL ready
2. ⏳ Frontend settings UI
3. ⏳ Multiple trading pairs
4. ⏳ Render deployment
