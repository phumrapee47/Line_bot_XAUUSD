# XAUUSD Daily Trading Analysis System

ระบบอัตโนมัติสำหรับวิเคราะห์ราคาสัญญาซื้อขายทองคำ (XAUUSD) ด้วยประสิทธิภาพของ AI

## 🎯 คุณสมบัติหลัก

### 1. **LSTM Price Prediction Model** (`model_price_prediction_genarating_img.py`)
- ใช้ข้อมูลราคาประวัติศาสตร์ 2011-2019
- แบ่งข้อมูล 80% สำหรับการเรียนรู้ / 20% สำหรับทดสอบ
- สร้างกราฟเปรียบเทียบราคาที่ทำนายได้ vs ราคาจริง
- **Output:** `xauusd_prediction_YYYYMMDD.png`

### 2. **Technical Analysis Chart** (`graph_xauusd_model.py`)
- ดาวน์โหลดข้อมูล XAUUSD ในระยะเวลา 60 วันที่ผ่านมา
- แสดง Candlestick Chart พร้อมกับ:
  - **EMA50** (Exponential Moving Average 50 periods) - สีน้ำเงิน
  - **EMA200** (Exponential Moving Average 200 periods) - สีแดง
  - **MACD** (Moving Average Convergence Divergence) - สีเขียว/ส้ม
  - **MACD Histogram** - แถบสีเขียว/แดง
- **Output:** `xauusd_graph_YYYYMMDD.png`

### 3. **Gemini AI Analysis** (`gemini_api_price_prediction.py`)
- รับรูปภาพทั้งสองจากขั้นตอนก่อนหน้า
- ใช้ Gemini 2.5 Flash Model ในการวิเคราะห์:
  - แนวโน้มราคาในอนาคต (ขึ้น/ลง/คงที่)
  - ระดับ Support/Resistance
  - สัญญาณการเทรด (TP/SL)
  - Risk-Reward Ratio ที่เหมาะสม
- **Output:** ข้อความวิเคราะห์ที่เข้าใจง่าย

### 4. **LINE Notification System**
- ส่งผลวิเคราะห์ไปยังผู้ใช้ผ่านแอป LINE
- รวมประกอบด้วยข้อมูลทั้งหมดจากการวิเคราะห์

---

## 📋 ข้อกำหนดการติดตั้ง

### Python Packages
```bash
pip install -r ml-models/requirements.txt
pip install APScheduler  # สำหรับ scheduler
pip install google-generativeai  # สำหรับ Gemini API
```

### Environment Variables
สร้างไฟล์ `.env` ในโฟลเดอร์ root:
```
GEMINI_API_KEY=your_actual_gemini_api_key_here
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_USER_ID=your_user_id
```

---

## 🚀 การใช้งาน

### วิธี 1: รันแบบ Manual (ทดสอบ)
```bash
cd ml-models
python daily_trading_pipeline.py
```

### วิธี 2: รันแบบอัตโนมัติทุกวันเวลา 8:00 AM
```bash
cd ml-models
python scheduler.py
```

ระบบจะ:
1. ✅ สร้างกราฟ LSTM prediction
2. ✅ สร้างกราฟ Technical Analysis
3. ✅ วิเคราะห์ด้วย Gemini AI
4. ✅ ส่งผลวิเคราะห์ไปยัง LINE
5. ✅ บันทึกผลสรุปไว้ใน `backend/data/pipeline_summary.json`

---

## 📁 โครงสร้างไฟล์

```
ml-models/
├── model_price_prediction_genarating_img.py    # LSTM Model
├── graph_xauusd_model.py                       # Technical Chart
├── gemini_api_price_prediction.py              # Gemini Analysis
├── daily_trading_pipeline.py                   # Main Pipeline Orchestrator
├── scheduler.py                                # Daily Scheduler
├── requirements.txt                            # Python Dependencies
└── README.md                                   # Documentation

backend/
└── data/
    ├── predictions/                             # LSTM prediction images
    │   └── xauusd_prediction_YYYYMMDD.png
    ├── graphs/                                  # Technical analysis charts
    │   └── xauusd_graph_YYYYMMDD.png
    └── pipeline_summary.json                    # Daily execution summary
```

---

## 🔧 ตัวอย่างการเรียกใช้งาน

### Pipeline Orchestration Flow
```
daily_trading_pipeline.py
    │
    ├─► model_price_prediction_genarating_img.py
    │        │
    │        └─► Output: xauusd_prediction_YYYYMMDD.png
    │
    ├─► graph_xauusd_model.py
    │        │
    │        └─► Output: xauusd_graph_YYYYMMDD.png
    │
    ├─► gemini_api_price_prediction.py
    │        │
    │        ├─ Input: prediction image + graph image
    │        │
    │        └─► Output: AI Analysis Text
    │
    └─► LineNotifier.sendMessage()
             │
             └─► Send Analysis to LINE
```

---

## 📊 ผลลัพธ์ที่คาดหวัง

### ตัวอย่างข้อความวิเคราะห์ (จาก Gemini AI)
```
📊 XAUUSD Trading Analysis - 2026-01-18 08:00:00

วิเคราะห์เทคนิค:
1. แนวโน้มในอนาคต: ขึ้น (EMA50 > EMA200, MACD positive)
2. ระดับ Support: 2025.50, Resistance: 2035.80
3. TP: 2040.00, SL: 2020.00, RR: 1:2
4. สัญญาณ: Buy Signal (EMA crossover)

ข้อมูลจากการทำนายราคา:
- ราคาปัจจุบัน: $2032.45
- ความเป็นไปได้: ขึ้นไปถึง $2045 ในสัปดาห์หน้า

สรุปคำแนะนำ:
Buy near 2030.00 with SL at 2020.00, Target 2040.00
```

---

## ⚙️ การตั้งค่า Scheduler

### Windows Service (ใช้ NSSM)
```bash
# ติดตั้ง NSSM จาก: https://nssm.cc/download

# สร้าง service
nssm install XAUUSDTradingBot "C:\Python\python.exe" "C:\path\to\scheduler.py"

# เริ่มต้น service
nssm start XAUUSDTradingBot

# ดูสถานะ
nssm status XAUUSDTradingBot

# หยุด service
nssm stop XAUUSDTradingBot
```

### Linux/Mac (Cron)
```bash
# เปิด crontab editor
crontab -e

# เพิ่มบรรทัดนี้ (รันเวลา 8:00 AM ทุกวัน)
0 8 * * * /usr/bin/python3 /path/to/scheduler.py >> /path/to/scheduler.log 2>&1
```

---

## 🐛 การแก้ไขปัญหา

### ปัญหา: "Module not found"
```bash
pip install -r ml-models/requirements.txt
```

### ปัญหา: "GEMINI_API_KEY not set"
- ตรวจสอบว่ามีไฟล์ `.env` พร้อม `GEMINI_API_KEY`
- หรือตั้ง environment variable ด้วย:
```bash
export GEMINI_API_KEY=your_api_key_here
```

### ปัญหา: "LINE notification not sent"
- ตรวจสอบ `LINE_CHANNEL_ACCESS_TOKEN` ใน config
- ตรวจสอบ log ในไฟล์ `backend/logs/scheduler.log`

### ปัญหา: "Image not found in Gemini analysis"
- ตรวจสอบว่า images ถูกสร้างสำเร็จในโฟลเดอร์ `backend/data/`
- ตรวจสอบ file permissions

---

## 📝 Log Files

ดูบันทึกการทำงานได้จาก:
- `backend/logs/scheduler.log` - บันทึก Scheduler
- `backend/logs/app.log` - บันทึก Application
- `backend/data/pipeline_summary.json` - สรุปการทำงานแต่ละวัน

---

## 🔐 ความปลอดภัย

### API Keys
- ⚠️ ไม่ควร commit `.env` ไปยัง Git
- ⚠️ ใช้ environment variables แทน hardcoded keys
- ⚠️ เปลี่ยน API keys หากถูก expose

### Database Access
- ใช้ secure connection สำหรับ database
- ตั้ง proper firewall rules
- ใช้ authentication/authorization

---

## 📞 Support

สำหรับความช่วยเหลือ:
1. ตรวจสอบ Log Files
2. ดูไฟล์ `ml-models/requirements.txt` เพื่อตรวจสอบ dependencies
3. ติดต่อ Development Team

---

## 📄 License

This project is part of LINE Bot XAUUSD Trading System
