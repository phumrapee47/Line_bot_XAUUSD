const axios = require('axios');
require('dotenv').config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8591121449:AAGUxvbHon29QiTz0MqZqMiYkSbwuwToONI';
const TELEGRAM_USER_ID = process.env.TELEGRAM_USER_ID || process.argv[2]; // Pass as argument

async function sendTestMessage() {
  try {
    if (!TELEGRAM_USER_ID) {
      console.log('❌ ต้องระบุ TELEGRAM_USER_ID');
      console.log('   ใช้: node test_telegram_send.js [YOUR_USER_ID]');
      console.log('   ตัวอย่าง: node test_telegram_send.js 123456789');
      process.exit(1);
    }

    console.log('⏳ ส่งข้อความ Telegram...');
    console.log(`Bot Token: ${TELEGRAM_BOT_TOKEN.substring(0, 10)}...`);
    console.log(`User ID: ${TELEGRAM_USER_ID}`);

    const response = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: TELEGRAM_USER_ID,
        text: '✅ ทดสอบ! ระบบส่งข้อความได้สำเร็จ!\n\n🤖 Trading Bot Status:\n• Database: ✓ Connected\n• Telegram: ✓ Working\n• Status: 🟢 Ready',
        parse_mode: 'HTML'
      }
    );

    if (response.data.ok) {
      console.log('\n✅ SUCCESS! ข้อความส่งไปแล้ว');
      console.log(`Message ID: ${response.data.result.message_id}`);
      console.log(`Chat ID: ${response.data.result.chat.id}`);
      console.log(`Date: ${new Date(response.data.result.date * 1000).toLocaleString()}`);
    } else {
      console.log('\n❌ Error:', response.data.description);
    }
  } catch (error) {
    console.error('\n❌ Failed to send message:');
    if (error.response?.data) {
      console.error('Error:', error.response.data.description);
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

sendTestMessage();
