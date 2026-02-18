#!/usr/bin/env node

/**
 * Integration Test for Telegram Broadcasting
 * Run: node backend/test_telegram_broadcasting.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const testUsers = [
  { id: '111111111', firstName: 'Test', lastName: 'User1' },
  { id: '222222222', firstName: 'Test', lastName: 'User2' },
  { id: '333333333', firstName: 'Test', lastName: 'User3' }
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testSubscribe() {
  console.log('\n📋 Test 1: Subscribe Users');
  console.log('='.repeat(50));

  for (const user of testUsers) {
    try {
      const response = await axios.post(`${BASE_URL}/api/telegram/subscribe`, {
        telegramUserId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: `testuser_${user.id}`
      });

      if (response.data.success) {
        console.log(`✅ User ${user.id} subscribed`);
      }
    } catch (error) {
      console.error(`❌ Failed to subscribe ${user.id}: ${error.message}`);
    }
    await sleep(500);
  }
}

async function testStatus() {
  console.log('\n📊 Test 2: Check Subscriber Status');
  console.log('='.repeat(50));

  try {
    const response = await axios.get(`${BASE_URL}/api/telegram/subscribers`);
    console.log(`Total subscribers: ${response.data.total}`);
    console.log(`Active: ${response.data.active}`);
    console.log(`Inactive: ${response.data.inactive}`);
    console.log(`Active %: ${response.data.percentage}`);
  } catch (error) {
    console.error(`❌ Failed to get status: ${error.message}`);
  }
}

async function testList() {
  console.log('\n📋 Test 3: List All Subscribers');
  console.log('='.repeat(50));

  try {
    const response = await axios.get(`${BASE_URL}/api/telegram/list`);
    console.log(`Found ${response.data.count} subscribers:`);
    response.data.data.forEach(sub => {
      console.log(`  - ID: ${sub.telegram_user_id}, Name: ${sub.first_name} ${sub.last_name}, Active: ${sub.is_active}`);
    });
  } catch (error) {
    console.error(`❌ Failed to list subscribers: ${error.message}`);
  }
}

async function testCheckSignal() {
  console.log('\n🔔 Test 4: Manual Signal (will send to all)');
  console.log('='.repeat(50));

  try {
    const response = await axios.post(`${BASE_URL}/api/check-signal`);
    if (response.data.success) {
      console.log('✅ Signal triggered');
      console.log(`   Check Telegram for messages from subscribers`);
      await sleep(3000); // Wait for messages to be sent
    }
  } catch (error) {
    console.error(`❌ Failed to trigger signal: ${error.message}`);
  }
}

async function testUnsubscribe() {
  console.log('\n🔄 Test 5: Unsubscribe One User');
  console.log('='.repeat(50));

  try {
    const response = await axios.post(`${BASE_URL}/api/telegram/unsubscribe`, {
      telegramUserId: testUsers[0].id
    });

    if (response.data.success) {
      console.log(`✅ User ${testUsers[0].id} unsubscribed`);
    }
  } catch (error) {
    console.error(`❌ Failed to unsubscribe: ${error.message}`);
  }
}

async function testUnsubscribedStatus() {
  console.log('\n📊 Test 6: Check Status After Unsubscribe');
  console.log('='.repeat(50));

  try {
    const response = await axios.get(`${BASE_URL}/api/telegram/subscribers`);
    console.log(`Total subscribers: ${response.data.total}`);
    console.log(`Active: ${response.data.active}`);
    console.log(`Inactive: ${response.data.inactive}`);
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
  }
}

async function testReSubscribe() {
  console.log('\n🔄 Test 7: Re-Subscribe User');
  console.log('='.repeat(50));

  try {
    const response = await axios.post(`${BASE_URL}/api/telegram/subscribe`, {
      telegramUserId: testUsers[0].id,
      firstName: testUsers[0].firstName,
      lastName: testUsers[0].lastName
    });

    if (response.data.success) {
      console.log(`✅ User ${testUsers[0].id} re-subscribed`);
    }
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
  }
}

async function testDelete() {
  console.log('\n🗑️ Test 8: Delete One Subscriber');
  console.log('='.repeat(50));

  try {
    const response = await axios.delete(`${BASE_URL}/api/telegram/delete/${testUsers[2].id}`);

    if (response.data.success) {
      console.log(`✅ User ${testUsers[2].id} deleted`);
    }
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
  }
}

async function testFinalStatus() {
  console.log('\n📊 Test 9: Final Status');
  console.log('='.repeat(50));

  try {
    const response = await axios.get(`${BASE_URL}/api/telegram/subscribers`);
    console.log(`Total subscribers: ${response.data.total}`);
    console.log(`Active: ${response.data.active}`);
    console.log(`Inactive: ${response.data.inactive}`);

    const list = await axios.get(`${BASE_URL}/api/telegram/list`);
    console.log('\nFinal Subscriber List:');
    list.data.data.forEach(sub => {
      const status = sub.is_active ? '✅' : '⏹️';
      console.log(`  ${status} ${sub.first_name} ${sub.last_name} (${sub.telegram_user_id})`);
    });
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 TELEGRAM BROADCASTING INTEGRATION TESTS');
  console.log('='.repeat(50));

  try {
    await testSubscribe();
    await sleep(1000);

    await testStatus();
    await sleep(1000);

    await testList();
    await sleep(1000);

    // await testCheckSignal();
    // await sleep(2000);

    await testUnsubscribe();
    await sleep(1000);

    await testUnsubscribedStatus();
    await sleep(1000);

    await testReSubscribe();
    await sleep(1000);

    await testDelete();
    await sleep(1000);

    await testFinalStatus();

    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests completed!');
    console.log('='.repeat(50));
  } catch (error) {
    console.error(`\n❌ Test suite error: ${error.message}`);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/api/status`, { timeout: 3000 });
    return true;
  } catch (error) {
    return false;
  }
}

(async () => {
  console.log('Checking if server is running...');
  const isRunning = await checkServer();

  if (!isRunning) {
    console.error('❌ Backend server is not running!');
    console.error('   Run: npm run dev');
    process.exit(1);
  }

  console.log('✅ Server is running\n');
  await runTests();
})();
