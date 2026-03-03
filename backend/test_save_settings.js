require('dotenv').config();
const axios = require('axios');
const { User, TradingPair, UserTradingPair } = require('./src/models');

async function testTierEnforcement() {
  const baseUrl = 'http://localhost:3000/api';
  const testLineUserId = 'test_user_' + Date.now();

  console.log('--- 🧪 Testing Tier Enforcement ---');

  try {
    // 1. Create a FREE user
    console.log('\nStep 1: Creating a FREE user...');
    await User.create({
        lineUserId: testLineUserId,
        displayName: 'Free Test User',
        subscriptionType: 'unsubscription'
    });

    // Get pair IDs
    const btcPair = await TradingPair.findOne({ where: { pairCode: 'BTC/USDT' } });
    const ethPair = await TradingPair.findOne({ where: { pairCode: 'ETH/USDT' } });
    const xauPair = await TradingPair.findOne({ where: { pairCode: 'XAUUSD' } });

    // 2. Attempt to save BTC, ETH, and XAU
    console.log('Step 2: Attempting to save XAUUSD, BTC/USDT, ETH/USDT for FREE user...');
    const payload = {
        tradingPairs: [
            { tradingPairId: xauPair.id },
            { tradingPairId: btcPair.id },
            { tradingPairId: ethPair.id }
        ]
    };

    const response = await axios.post(`${baseUrl}/users/${testLineUserId}/settings`, payload);
    
    // 3. Verify results
    const savedPairs = await UserTradingPair.findAll({
        include: [{ model: TradingPair, as: 'TradingPair' }],
        where: { userId: response.data.data.id }
    });

    console.log('Results:');
    savedPairs.forEach(p => {
        console.log(`- Saved Pair: ${p.TradingPair.pairCode}`);
    });

    const hasCrypto = savedPairs.some(p => p.TradingPair.assetType === 'crypto');
    if (!hasCrypto) {
        console.log('✅ PASS: Crypto pairs were filtered out for FREE user.');
    } else {
        console.log('❌ FAIL: Crypto pairs were saved for FREE user.');
    }

    // 4. Update user to PREMIUM
    console.log('\nStep 3: Upgrading user to PREMIUM...');
    const user = await User.findOne({ where: { lineUserId: testLineUserId } });
    await user.update({ subscriptionType: 'subscription' });

    // 5. Attempt to save again
    console.log('Step 4: Attempting to save XAUUSD, BTC/USDT, ETH/USDT for PREMIUM user...');
    const resp2 = await axios.post(`${baseUrl}/users/${testLineUserId}/settings`, payload);

    const savedPairs2 = await UserTradingPair.findAll({
        include: [{ model: TradingPair, as: 'TradingPair' }],
        where: { userId: resp2.data.data.id }
    });

    console.log('Results:');
    savedPairs2.forEach(p => {
        console.log(`- Saved Pair: ${p.TradingPair.pairCode}`);
    });

    const btcSaved = savedPairs2.some(p => p.TradingPair.pairCode === 'BTC/USDT');
    if (btcSaved) {
        console.log('✅ PASS: All pairs were saved for PREMIUM user.');
    } else {
        console.log('❌ FAIL: Pairs were still filtered for PREMIUM user.');
    }

  } catch (error) {
    if (error.response) {
      console.error('❌ Server Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('❌ No response received. Is the server running on port 3000?');
    } else {
      console.error('❌ Error details:', error.message);
    }
  } finally {
    // Cleanup
    console.log('\nCleaning up...');
    const u = await User.findOne({ where: { lineUserId: testLineUserId } });
    if (u) {
        await UserTradingPair.destroy({ where: { userId: u.id } });
        await u.destroy();
    }
    process.exit(0);
  }
}

testTierEnforcement();
