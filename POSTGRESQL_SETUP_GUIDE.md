# 🐘 PostgreSQL Setup & Migration Guide

## 📊 Database Migration: SQLite → PostgreSQL

ระบบเปลี่ยนจาก SQLite ไป PostgreSQL แล้ว ✅

---

## 🔧 Setup PostgreSQL Locally

### **Windows:**

#### **1. Download & Install**
- ไป [postgresql.org](https://www.postgresql.org/download/windows/)
- ดาวน์โหลด PostgreSQL 15+
- เลือก **pgAdmin** ด้วย

#### **2. Install Steps**
```
- Next > Next...
- Password: ตั้งรหัสสำหรับ postgres user (จำไว้!)
- Port: 5432
- Locale: [Default]
- Install
```

#### **3. ตรวจสอบการติดตั้ง**
```bash
psql --version
# output: psql (PostgreSQL) 15.x
```

---

### **MacOS:**

```bash
# ใช้ Homebrew
brew install postgresql@15

# Start service
brew services start postgresql@15

# Create default user
psql postgres -c "CREATE USER postgres WITH PASSWORD 'postgres';"
```

---

### **Linux (Ubuntu/Debian):**

```bash
sudo apt-get install postgresql postgresql-contrib

sudo -u postgres psql
# In psql:
ALTER USER postgres PASSWORD 'postgres';
\q
```

---

## 🗄️ Create Database

### **Option 1: ใช้ pgAdmin GUI**

1. เปิด pgAdmin
2. Right-click `Databases`
3. `Create` > `Database`
4. ตั้งชื่อ: `trading_bot`
5. Click `Save`

### **Option 2: ใช้ Command Line**

```bash
psql -U postgres -c "CREATE DATABASE trading_bot;"
```

---

## 📝 Update .env File

สร้าง/แก้ไข `backend/.env`:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trading_bot
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_LOGGING=false
DB_SSL=false

# Telegram
TELEGRAM_BOT_TOKEN=8591121449:AAGUxvbHon29QiTz0MqZqMiYkSbwuwToONI
TELEGRAM_USER_ID=your_user_id

# LINE
LINE_CHANNEL_ACCESS_TOKEN=your_token
LINE_CHANNEL_SECRET=your_secret
USE_BROADCAST=true

# Server
PORT=3000
```

---

## 📦 Install Dependencies

```bash
cd backend

# Remove old packages
rm -r node_modules package-lock.json

# Install new packages (includes pg, pg-hstore)
npm install
```

**New packages:**
- `pg` - PostgreSQL driver
- `pg-hstore` - For storing JSON/HSTORE in PostgreSQL

---

## 🚀 Initialize Database

### **Step 1: Start Server**

```bash
npm run dev
```

**Expected output:**
```
✅ Database connection established successfully
✅ Database initialized successfully
```

### **Step 2: Seed Trading Pairs**

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
  ...
```

---

## ✅ Verify Connection

### **Command 1: Connect via psql**

```bash
psql -U postgres -d trading_bot
```

### **Command 2: Check Tables**

```sql
\dt
```

**Output:**
```
                  List of relations
 Schema |            Name             | Type  | Owner
--------+-----------------------------+-------+----------
 public | telegram_subscribers | table | postgres
 public | trading_pairs        | table | postgres
 public | user_notification_preferences | table | postgres
 public | user_trading_pairs   | table | postgres
 public | user_trading_parameters | table | postgres
 public | users                | table | postgres
```

### **Command 3: Count Records**

```sql
SELECT COUNT(*) FROM trading_pairs;
-- Expected: 7 pairs
```

---

## 🔄 Data Migration (if you have old SQLite data)

### **Step 1: Export from SQLite**

```bash
# Create backup from old SQLite DB
sqlite3 data/trading_bot_old.db ".dump users" > users_backup.sql
```

### **Step 2: Import to PostgreSQL**

```bash
# Use a migration tool or manual import
psql -U postgres -d trading_bot < users_backup.sql
```

---

## 🌐 Render.com Deployment (PostgreSQL)

### **Step 1: Create PostgreSQL Instance on Render**

1. ไป [render.com](https://render.com)
2. Create New > PostgreSQL
3. ตั้งค่า:
   - **Name**: trading-bot-db
   - **Database**: trading_bot
   - **User**: postgres
   - **Region**: Singapore (closest to Thailand)

### **Step 2: Copy Connection Details**

Render จะให้ **Internal Database URL**:
```
postgresql://postgres:xxxxxx@dpg-xxxxxx:5432/trading_bot
```

### **Step 3: Update .env in Render Service**

```
DATABASE_URL=postgresql://postgres:password@host:5432/trading_bot
DB_HOST=dpg-xxx.c2.render.com
DB_PORT=5432
DB_NAME=trading_bot
DB_USER=postgres
DB_PASSWORD=xxx
DB_SSL=true
```

### **Step 4: Test Connection**

```bash
psql $DATABASE_URL
```

---

## 🐛 Troubleshooting

### **Error: connect ECONNREFUSED 127.0.0.1:5432**

```
❌ PostgreSQL not running
```

**Solution:**
```bash
# Windows
net start postgresql-x64-15

# MacOS
brew services start postgresql@15

# Linux
sudo systemctl start postgresql
```

### **Error: FATAL: password authentication failed**

```
❌ Wrong password
```

**Solution:**
```bash
# Reset postgres password
psql -U postgres -c "ALTER USER postgres PASSWORD 'new_password';"

# Update .env
DB_PASSWORD=new_password
```

### **Error: database "trading_bot" does not exist**

```
❌ Database not created
```

**Solution:**
```bash
psql -U postgres -c "CREATE DATABASE trading_bot;"
```

### **Error: relation "users" does not exist**

```
❌ Tables not synced
```

**Solution:**
```bash
# Restart server
npm run dev

# Check logs for:
✅ Database initialized successfully
```

---

## 📊 Database Comparison

| Feature | SQLite | PostgreSQL |
|---------|--------|------------|
| Setup | ✅ Very easy | ⏱️ Setup needed |
| File Size | ✅ Small | ⏱️ Larger |
| Concurrency | ❌ Poor | ✅ Excellent |
| Multi-user | ❌ Limited | ✅ Full support |
| Cloud Deploy | ❌ Difficult | ✅ Easy (Render) |
| Performance | ⏱️ Good | ✅ Better |
| Backup | ⏱️ Manual | ✅ Automatic |
| Scale | ❌ Limited | ✅ Unlimited |

---

## 💡 Advanced: Connection Pooling

```javascript
// database.js - Already configured with pooling
pool: {
  max: 5,           // Max connections
  min: 0,           // Min connections
  acquire: 30000,   // Wait 30s for connection
  idle: 10000       // Close after 10s idle
}
```

For production, increase:
```javascript
pool: {
  max: 20,          // More concurrent connections
  min: 5
}
```

---

## 🔐 Security Tips

1. **Never commit .env**
   ```
   backend/.env is in .gitignore ✅
   ```

2. **Use strong password**
   ```
   DB_PASSWORD=very_secure_password_123!@#
   ```

3. **Enable SSL (Render)**
   ```
   DB_SSL=true
   ```

4. **Regular backups**
   ```bash
   pg_dump -U postgres trading_bot > backup.sql
   ```

---

## 📋 Checklist

- [ ] PostgreSQL installed
- [ ] Database `trading_bot` created
- [ ] .env file configured
- [ ] npm install completed
- [ ] Server started (`npm run dev`)
- [ ] Database tables synced
- [ ] Trading pairs seeded
- [ ] Connection verified
- [ ] No errors in logs

---

## ✅ Success!

กรุณารันคำสั่งนี้เพื่อยืนยัน:

```bash
npm run dev
```

ดูใน logs:
```
✅ Database connection established successfully
✅ Database initialized successfully
📊 Scheduled to run every 60 minutes
```

---

## 🚀 ขั้นตอนต่อ

1. ✅ PostgreSQL ready
2. ⏳ Frontend settings UI
3. ⏳ Multiple trading pairs logic
4. ⏳ Deployment config (Render)
