# Production System Audit Report
## XAUUSD Trading Bot - February 6, 2026

---

## 🔴 Critical Issues (ต้องแก้ ASAP)

### 1. **Environment Variables ไม่มี Validation**
   - **ปัญหา**: `.env` ไม่มี validation ว่า required keys มีครบไหม
   - **ผลกระทบ**: ถ้าลืมตั้ง `IMGUR_CLIENT_ID`, `GEMINI_API_KEY` จะ error ตอน runtime
   - **แก้ไข**:
     ```javascript
     // Add to config.js - validate required env vars on startup
     const requiredEnvVars = ['LINE_CHANNEL_ACCESS_TOKEN', 'GEMINI_API_KEY'];
     requiredEnvVars.forEach(key => {
       if (!process.env[key]) {
         logger.error(`❌ Missing required env var: ${key}`);
         process.exit(1);
       }
     });
     ```

### 2. **No Retry Logic for API Calls**
   - **ปัญหา**: LINE API, Gemini API, yfinance ไม่มี retry logic
   - **ผลกระทบ**: Network hiccup → data loss, missed signals
   - **แก้ไข**: เพิ่ม exponential backoff retry logic ให้ API calls

### 3. **Database ไม่ Sync กับ ML Models**
   - **ปัญหา**: Backend database ≠ Python predictions folder
   - **ผลกระทบ**: ไม่ทราบ state ของข้อมูล, duplicate processing
   - **แก้ไข**: บันทึก metadata ของ predictions ลงใน DB

### 4. **No Centralized Error Handling**
   - **ปัญหา**: Error messages ไปบ่อยๆ ไป LINE, ไม่มี aggregation
   - **ผลกระทบ**: User confused, spam notifications
   - **แก้ไข**: Create error dashboard, send summary only

---

## 🟠 High Priority (สัปดาห์นี้)

### 5. **Scheduler Timing ไม่ Synchronized**
   - **ปัญหา**: 
     - Backend cron: ทุก 60 นาที
     - Python scheduler: 08:00 AM daily
     - Manual `send_to_line.py`: ต้อง run ด้วยมือ
   - **ผลกระทบ**: Race condition, double processing
   - **แก้ไข**: Unified scheduler (เลือก 1 ตัว)

### 6. **Imgur Upload Broken (Error 400)**
   - **ปัญหา**: `IMGUR_CLIENT_ID` ใน `.env` เป็น placeholder
   - **ผลกระทบ**: ไม่ได้ upload รูป → LINE ก็ได้ข้อความโดยไม่มีรูป
   - **แก้ไข**: 
     - ทำให้ optional gracefully
     - ให้ serve จาก local server แทน
     - หรือ setup Imgur API key ให้ถูกต้อง

### 7. **Logging ไม่ Comprehensive**
   - **ปัญหา**: 
     - Python scripts ไม่ใช้ centralized logger
     - Log files อาจ grow ไม่มีการ rotate
   - **ผลกระทบ**: ยากต้องหา bugs, storage grow
   - **แก้ไข**:
     - Add log rotation (max 10 files, 10MB each)
     - Structured logging (JSON format) เพื่อ monitoring

---

## 🟡 Medium Priority (เดือนนี้)

### 8. **No Health Check Integration**
   - **ปัญหา**: Health check endpoint มีแต่ไม่บอก details
   - **แก้ไข**:
     ```javascript
     // Add detailed health checks
     - Database connection status
     - Python process status
     - Last signal timestamp
     - API quota remaining (Gemini)
     ```

### 9. **Python Script Dependencies Too Heavy**
   - **ปัญหา**: 
     - `tensorflow` 2.13.0 + `torch` 2.1.1 = ~3GB
     - Render free tier จะ timeout
   - **แก้ไข**: 
     - Consider ONNX for inference only
     - Remove training dependencies (keep prediction only)

### 10. **No Rate Limiting on Public Endpoints**
   - **ปัญหา**: `/api/check-signal` ไม่มี rate limit
   - **ผลกระทบ**: DDoS ได้ง่าย
   - **แก้ไข**:
     ```javascript
     const rateLimit = require('express-rate-limit');
     app.use('/api/', rateLimit({
       windowMs: 60 * 1000,
       max: 10 // 10 requests per minute
     }));
     ```

### 11. **No Graceful Degradation for ML Model Failure**
   - **ปัญหา**: ถ้า technical analysis fail → ทั้ง signal fail
   - **แก้ไข**: ให้ use news score only (graceful fallback)

### 12. **Database Schema ไม่ Version Controlled**
   - **ปัญหา**: `initDatabase.js` create table hardcoded
   - **แก้ไข**: Implement migration system (Sequelize CLI)

---

## 🔵 Low Priority (บันทึกไว้)

### 13. **Render.yaml Config Issues**
   - ปัญหา: `plan: free` might spin down after idle
   - แนะนำ: Use paid plan หรือ setup keep-alive ping
   - Alternative: Deploy on VPS ที่ 24/7

### 14. **No Backup Strategy**
   - Database ไม่ backup
   - Images ไม่ backup
   - Historical data ไม่ archived

### 15. **Input Validation ไม่ Complete**
   - `/api/liff` routes ไม่มี schema validation
   - ควร add Joi/Yup validation

### 16. **Timezone Handling**
   - Mix ของ UTC, Local TH time
   - ควร standardize เป็น UTC stored, display as TH

### 17. **Test Coverage = 0%**
   - No unit tests, integration tests
   - Add basic smoke tests ก่อน deploy

---

## 📋 Recommended Priority Order

| Priority | Task | Effort | Impact | Timeline |
|----------|------|--------|--------|----------|
| 🔴 | Environment validation | 2h | High | ASAP |
| 🔴 | Add retry logic | 4h | High | ASAP |
| 🔴 | Scheduler sync | 3h | High | This week |
| 🟠 | Centralized error handling | 4h | Medium | This week |
| 🟠 | Log rotation | 2h | Medium | This week |
| 🟡 | Health check details | 2h | Medium | This month |
| 🟡 | Rate limiting | 1h | Medium | This month |
| 🔵 | Database migrations | 3h | Low | Next month |
| 🔵 | Backup strategy | 2h | Low | Next month |

---

## ✅ What's Working Well

1. **Price Validation Service** ✓
   - Good cache fallback system
   - Price range checks ($0.00 prevention)

2. **Signal Generation Logic** ✓
   - Timeout protection
   - Combined scoring works well

3. **LINE Integration** ✓
   - Both broadcast & push message modes
   - Good error handling for invalid prices

4. **Gemini Analysis** ✓
   - Images properly analyzed
   - Date formatting fixed

5. **Error Logging** ✓
   - Winston logger configured
   - Multiple transports (file + console)

---

## 🚀 Quick Wins (Can do now)

1. Add env var validation (30 min)
2. Setup Imgur client ID correctly (15 min)
3. Add simple retry logic to axios calls (1 hour)
4. Enable log rotation (30 min)
5. Document scheduler timing (30 min)

**Total effort: ~3 hours → Major improvement in stability**

