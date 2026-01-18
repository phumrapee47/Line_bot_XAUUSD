# Imgur Setup for Image Sharing in LINE Bot

## ปัญหา
LINE API ไม่รองรับ `file://` URLs - ต้องเป็น HTTPS URLs เท่านั้น

## วิธีแก้: ใช้ Imgur API

### Step 1: ลงทะเบียน Imgur Account
1. ไปที่ https://imgur.com/register
2. สร้าง account (ฟรี)

### Step 2: สมัครเป็น Imgur Developer
1. ไปที่ https://api.imgur.com/oauth2/addclient
2. เลือก "OAuth 2 authorization without a callback URL" หรือ "OAuth 2 authorization with a callback URL"
3. ใส่ข้อมูล:
   - **Application name**: `line_bot_xauusd`
   - **Email**: your_email@example.com
   - **Description**: LINE Bot for XAUUSD Trading Analysis

### Step 3: รับ Client ID
หลังจากสมัครเสร็จ คุณจะได้:
- **Client ID** ← **นี่ตัวที่ต้องใช้**
- Client Secret (ไม่จำเป็นสำหรับ Image Upload)

### Step 4: เพิ่มลง .env
แก้ไข `.env` ในโฟลเดอร์ root:

```bash
IMGUR_CLIENT_ID=your_actual_client_id_here
```

ตัวอย่าง:
```bash
IMGUR_CLIENT_ID=abcd1234efgh5678
```

### Step 5: ทดสอบ
```bash
cd c:\Users\Asus\Documents\line_bot_XAUUSD\ml-models
python send_to_line.py
```

## ผลลัพธ์

**ก่อนใช้ Imgur:**
- ✗ ข้อความมาถึง LINE
- ✗ รูปภาพไม่มา (file:// ไม่ใช้ได้)

**หลังใช้ Imgur:**
- ✓ ข้อความมาถึง LINE
- ✓ รูปภาพมาถึง LINE
- ✓ รูปภาพจากเซิร์ฟเวอร์ Imgur HTTPS

## Imgur API Limits (ฟรี)
- Upload: 50 requests per hour
- ใช้ได้เพียงพอสำหรับ daily analysis 📊

## ทดสอบ Imgur Manually
```python
import requests

imgur_client_id = "your_imgur_client_id"
image_path = "backend/data/predictions/xauusd_prediction_20260118.png"

with open(image_path, 'rb') as f:
    files = {'image': f}
    headers = {'Authorization': f'Client-ID {imgur_client_id}'}
    response = requests.post(
        'https://api.imgur.com/3/image',
        files=files,
        headers=headers
    )
    print(response.json())
```

## ปัญหา?
ถ้า upload ล้มเหลว:
1. ตรวจสอบ Client ID ถูกต้อง?
2. ตรวจสอบ internet connection
3. ตรวจสอบขนาดรูป (ต้อง < 10 MB)

## Alternative: ไม่ใช้ Imgur
ถ้าไม่อยากใช้ Imgur:
1. Host รูป บน web server ของคุณเอง
2. ใช้ Cloud Storage (Google Drive, Dropbox, AWS S3)
3. ส่งเฉพาะ text analysis (รูปไม่ส่ง)
