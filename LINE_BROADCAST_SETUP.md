# 📱 LINE Messaging API - Broadcast Mode

## ✨ ดีขึ้นแล้ว - ไม่ต้องระบุ User ID!

ระบบได้อัปเดตให้ใช้ **Broadcast Mode** แล้ว - ส่งไปให้ทุกคนในช่อง LINE โดยไม่ต้องระบุ User ID เฉพาะ

---

## 🔧 Setup (ง่ายมาก)

### Step 1: เพิ่ม Channel Access Token ใน .env

```env
LINE_CHANNEL_ACCESS_TOKEN=4Vf10Yj3fHgDRs+Eq0ojQHZOEI/q22uBAx11iHUXKzOvBmeChLwc8LOotE14JvocrV91tpXJ3g06Qe154CzHphfGfn9bI7nfQdhT8y34t2jC+lPIs7FK9Nu1V+c9E1D6yvyrrJ7hQV5kH6gK95zrOwdB04t89/1O/w1cDnyilFU=
```

**ไม่ต้องกำหนด LINE_USER_ID!** ✅

### Step 2: เริ่มใช้งาน

```bash
cd backend
npm start
```

### ✅ ทำเสร็จ!

Bot จะส่งสัญญาณการเทรดไปให้ทุกคนที่สมาชิกของช่อง LINE 📱

---

## 📊 Modes ที่สนับสนุน

### Mode 1: Broadcast (Default) ✅
ส่งข้อความให้ **ทุกคน** ในช่อง LINE

```env
LINE_CHANNEL_ACCESS_TOKEN=your_token
# ไม่ต้องกำหนด USER_ID
```

### Mode 2: Push (Optional)
ส่งข้อความไปเฉพาะ **คนหนึ่ง**

```env
LINE_CHANNEL_ACCESS_TOKEN=your_token
LINE_USER_ID=Uabcd1234xyz  # ส่งไปคนนี้เท่านั้น
USE_BROADCAST=false
```

---

## 🚀 เริ่มต้น

```bash
# 1. ตั้งค่า .env ด้วย Channel Access Token เท่านั้น
# 2. รัน bot
cd backend
npm start

# ✅ Ready!
```

**ได้เลย! ไม่มีข้อยุ่งยากอีกต่อไป** 🎉

---

## 📝 ไฟล์ที่เปลี่ยน

- ✅ `lineNotifier.js` - รองรับ Broadcast & Push
- ✅ `config.js` - ตัวเลือก Broadcast/Push
- ✅ `.env` - ง่ายขึ้น ไม่ต้อง User ID

---

## ❓ Q&A

**Q: ทุกคนที่มี LINE account นี้รับได้?**  
A: ใช่! ใช้ Broadcast mode ใคร ๆ ก็ได้รับ

**Q: แต่ละคนรับซ้อนหรือ?**  
A: ไม่ LINE Messaging API จัดการให้ หลีกเลี่ยงการซ้อน

**Q: ต้องทำอะไรเพิ่มเติม?**  
A: ไม่มี เพียงแต่เพิ่ม Token ลงใน .env

**Q: สามารถส่งไปคนเดียวได้ไหม?**  
A: ได้ ใช้ MODE 2 (Push) และตั้ง LINE_USER_ID

---

## ✅ เสร็จแล้ว!

Bot ตั้งค่าเรียบร้อยแล้ว เริ่มใช้งานได้เลย! 🥇📈
