#!/usr/bin/env node

/**
 * Test Script for Telegram Integration
 * Run: node backend/test_telegram.js
 */

require('dotenv').config({ path: './backend/.env' });
const axios = require('axios');

const token = process.env.TELEGRAM_BOT_TOKEN;
const userId = process.env.TELEGRAM_USER_ID;

if (!token) {
  console.error('❌ Error: TELEGRAM_BOT_TOKEN not set in .env');
  process.exit(1);
}

if (!userId) {
  console.error('❌ Error: TELEGRAM_USER_ID not set in .env');
  process.exit(1);
}

console.log('🧪 Testing Telegram Integration...\n');

// Test 1: Verify Bot Token
async function testBotToken() {
  try {
    console.log('Test 1: Verifying Bot Token...');
    const response = await axios.get(
      `https://api.telegram.org/bot${token}/getMe`
    );
    if (response.data.ok) {
      console.log('✅ Bot Token is valid');
      console.log(`   Bot Name: ${response.data.result.first_name}`);
      console.log(`   Bot Username: @${response.data.result.username}`);
      return true;
    } else {
      console.error('❌ Invalid Bot Token');
      return false;
    }
  } catch (error) {
    console.error(`❌ Error verifying token: ${error.message}`);
    return false;
  }
}

// Test 2: Send Test Message
async function testSendMessage() {
  try {
    console.log('\nTest 2: Sending test message...');
    const response = await axios.post(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        chat_id: userId,
        text: '🧪 Test message from Gold Trading Bot!\n✅ Telegram integration is working!',
        parse_mode: 'HTML'
      }
    );
    if (response.data.ok) {
      console.log('✅ Message sent successfully');
      return true;
    } else {
      console.error('❌ Failed to send message');
      return false;
    }
  } catch (error) {
    console.error(`❌ Error sending message: ${error.message}`);
    return false;
  }
}

// Test 3: Send Signal-like Message
async function testSignalMessage() {
  try {
    console.log('\nTest 3: Sending sample trading signal...');
    const sampleSignal = `
🔔 <b>Gold Trading Signal Test</b> 🔔
━━━━━━━━━━━━━━━━━━
Signal: 🟢 BUY
Confidence: 78.50%

📊 Technical Score: 82.00%
📰 News Score: 75.00%

💰 Current Price: $2050.35
🎯 Take Profit: $2055.75
🛡️ Stop Loss: $2045.00

⏰ Time: 15 ก.พ. 2568 10:30
━━━━━━━━━━━━━━━━━━
    `.trim();

    const response = await axios.post(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        chat_id: userId,
        text: sampleSignal,
        parse_mode: 'HTML'
      }
    );
    if (response.data.ok) {
      console.log('✅ Sample signal sent successfully');
      return true;
    } else {
      console.error('❌ Failed to send sample signal');
      return false;
    }
  } catch (error) {
    console.error(`❌ Error sending sample signal: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runTests() {
  const test1 = await testBotToken();
  if (!test1) {
    console.error('\n❌ Token verification failed. Please check your TELEGRAM_BOT_TOKEN');
    process.exit(1);
  }

  const test2 = await testSendMessage();
  if (!test2) {
    console.error('\n❌ Message sending failed. Please check your TELEGRAM_USER_ID');
    process.exit(1);
  }

  const test3 = await testSignalMessage();

  console.log('\n' + '='.repeat(50));
  if (test1 && test2 && test3) {
    console.log('✅ All tests passed! Telegram integration is ready!');
    console.log('='.repeat(50));
  } else {
    console.log('⚠️ Some tests failed. Please check the errors above.');
    console.log('='.repeat(50));
  }
}

runTests();
