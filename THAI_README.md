## 🎯 เริ่มต้นใช้ Gold Trading Bot

### ขั้นตอนการตั้งค่า (3 ขั้น)

#### 1️⃣ ขอ LINE Notify Token (2 นาที)
```
1. เข้า https://notify-bot.line.me/
2. ล็อกอินด้วยบัญชี LINE
3. คลิก "Generate Token"
4. คัดลอก Token ที่ได้
```

#### 2️⃣ ตั้งค่า .env
```
เปิดไฟล์ .env ที่ root ของ project
เพิ่มบรรทัดนี้:
LINE_NOTIFY_TOKEN=your_token_ที่_copy_ได้
```

#### 3️⃣ ติดตั้ง & เริ่มใช้งาน
```bash
# Windows
setup.bat

# macOS / Linux
bash setup.sh

# แล้วเริ่มต้น Bot
cd backend
npm start
```

### ✅ ว่าเมื่อเริ่มต้นสำเร็จ
```
✅ Server started on port 3000
🚀 Gold Trading System Started!
Scheduled to run every 60 minutes
```

---

## 📚 ไฟล์สำคัญ

| ไฟล์ | คำอธิบาย |
|-----|---------|
| `.env` | ตั้งค่า (ต้องเพิ่ม LINE token) |
| `README.md` | เอกสารทั้งหมด |
| `QUICKSTART.md` | คู่มือเริ่มต้น 5 นาที |
| `PROJECT_STRUCTURE.txt` | แสดงโครงสร้าง Project |
| `STATUS_REPORT.md` | รายงานสถานะ |
| `setup.bat` | ติดตั้ง Windows |
| `setup.sh` | ติดตั้ง macOS/Linux |

---

## 🤖 Bot ทำอะไร

ทุก 60 นาที Bot จะ:

1. **ดึงข้อมูลราคาทองคำ** (90 วันย้อนหลัง)
2. **วิเคราะห์ Technical** (RSI, EMA, MACD, ATR)
   - XGBoost Model ทำนายราคาขึ้นหรือลง
   - ให้คะแนน: 0.0 - 1.0 (น้ำหนัก 60%)

3. **วิเคราะห์ข่าว** (ดึงจาก FXStreet)
   - หาคำว่า Gold ในข่าว
   - วิเคราะห์ bullish/bearish
   - ให้คะแนน: 0.0 - 1.0 (น้ำหนัก 40%)

4. **รวมคะแนน**
   - Final = (Technical × 0.6) + (News × 0.4)
   - คะแนน > 0.60 → ส่ง "🟢 BUY"
   - คะแนน < 0.40 → ส่ง "🔴 SELL"
   - ระหว่าง → HOLD (ไม่ส่ง)

5. **ส่งแจ้งเตือนไป LINE**
   - Signal (BUY/SELL)
   - ความมั่นใจ %
   - ราคาปัจจุบัน
   - Take Profit & Stop Loss

---

## 🔧 ปรับแต่งการตั้งค่า

ในไฟล์ `.env` ปรับได้:

```env
LINE_NOTIFY_TOKEN=your_token          # ⚠️ บังคับต้องมี

TECHNICAL_WEIGHT=0.6                  # Technical weight
NEWS_WEIGHT=0.4                       # News weight

BUY_THRESHOLD=0.60                    # คะแนน > 60% = BUY
SELL_THRESHOLD=0.40                   # คะแนน < 40% = SELL

CHECK_INTERVAL_MINUTES=60             # ตรวจสอบทุก 60 นาที
PORT=3000
```

---

## 📱 API Endpoints

**Health Check** - ตรวจสอบ Bot ทำงาน
```bash
curl http://localhost:3000/health
```

**Manual Check** - บังคับตรวจสอบเดี๋ยวนี้
```bash
curl -X POST http://localhost:3000/api/check-signal
```

**Status** - ดูสถานะ Bot
```bash
curl http://localhost:3000/api/status
```

---

## 🐛 ปัญหา & แก้ไข

| ปัญหา | แก้ไข |
|------|------|
| Module not found | `cd backend && npm install` |
| Python not found | ติดตั้ง Python 3.8+ |
| Model file not found | `cd ml-models && python3 train_model.py` |
| LINE ไม่ส่ง | ตรวจสอบ token ใน .env |
| yfinance rate limit | รอ 1-2 นาที แล้วลองใหม่ |

ดูเพิ่มเติม:
```bash
tail -f backend/logs/combined.log
```

---

## 🎓 สร้าง Model เอง

ถ้าต้องการสร้าง ML Model ของเอง:

```bash
cd ml-models
python3 train_model.py
```

ตัวสคริปต์จะ:
- ดาวน์โหลดข้อมูล 2 ปีจาก yfinance
- สร้าง Training Dataset
- ฝึก XGBoost Classifier
- บันทึกเป็น `gold_ml_model_selected.pkl`

---

## 📊 สถานะ Project

```
✅ Backend Node.js - พร้อม
✅ Python Models - พร้อม
✅ Configuration - พร้อม
✅ Logging - พร้อม
✅ API Endpoints - พร้อม
✅ Documentation - พร้อม
⏳ LINE Token - ต้องเพิ่มเอง
⏳ ML Model File - ต้องสร้างเอง (หรือดาวน์โหลด)
```

---

## 🚀 เริ่มเลย!

```bash
# 1. เพิ่ม LINE token ใน .env
# 2. รัน setup script
setup.bat          # Windows
bash setup.sh      # macOS/Linux

# 3. เริ่ม Bot
cd backend
npm start

# ✅ เสร็จ! Bot จะตรวจสอบราคาทองคำและส่งสัญญาณ
```

---

📞 **ติดตามข่าวสาร:**
- ดูเพิ่มเติม: README.md
- คู่มือเร็ว: QUICKSTART.md
- โครงสร้าง: PROJECT_STRUCTURE.txt
- สถานะ: STATUS_REPORT.md

**ตอนนี้พร้อมเลย! 🥇**
