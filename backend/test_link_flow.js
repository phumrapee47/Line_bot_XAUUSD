const linkHandler = require('./src/services/linkHandler');
const { User } = require('./src/models');
const sequelize = require('./src/config/database');
const logger = require('./src/utils/logger');

async function testLinkFlow() {
  console.log('🧪 Starting Telegram Link Flow Test...\n');

  try {
    const testLineId = 'U-test-user-' + Date.now();
    
    // 1. Generate code
    console.log('Step 1: Generating link code...');
    const { code, expiresAt } = await linkHandler.generateCode(testLineId);
    console.log(`✅ Code generated: ${code}, Expires at: ${expiresAt}`);

    // 2. Check status (should be not linked)
    console.log('\nStep 2: Checking link status (before)...');
    const statusBefore = await linkHandler.getLinkStatus(testLineId);
    console.log(`✅ Status: ${JSON.stringify(statusBefore)}`);

    // 3. Verify with correct code
    console.log('\nStep 3: Verifying correct code...');
    const telegramData = {
      id: 123456789,
      username: 'test_telegram_user',
      first_name: 'Test',
      last_name: 'User'
    };
    const result = await linkHandler.verifyCode(code, telegramData);
    console.log(`✅ Verification result: ${result.message}`);

    // 4. Check status (should be link
    console.log('\nStep 4: Checking link status (after)...');
    const statusAfter = await linkHandler.getLinkStatus(testLineId);
    console.log(`✅ Status: ${JSON.stringify(statusAfter)}`);

    // 5. Test unlinking
    console.log('\nStep 5: Testing unlink...');
    await linkHandler.unlinkTelegram(testLineId);
    const statusFinal = await linkHandler.getLinkStatus(testLineId);
    console.log(`✅ Final status: ${JSON.stringify(statusFinal)}`);

    console.log('\n✨ All tests passed successfully!');
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
    process.exit(1);
  }
}

// Wait for DB to be potentially ready (or in mock mode)
setTimeout(testLinkFlow, 1000);
