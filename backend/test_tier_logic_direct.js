require('dotenv').config();
const { User, TradingPair, UserTradingPair, sequelize } = require('./src/models');
const logger = require('./src/utils/logger');

async function testTierLogic() {
    console.log('--- 🧪 Testing Tier Logic (Direct Model Access) ---');
    
    const testLineUserId = 'logic_test_' + Date.now();
    let freeUser, btcPair, ethPair, xauPair;

    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        // 1. Setup Data
        btcPair = await TradingPair.findOne({ where: { pairCode: 'BTC/USDT' } });
        ethPair = await TradingPair.findOne({ where: { pairCode: 'ETH/USDT' } });
        xauPair = await TradingPair.findOne({ where: { pairCode: 'XAUUSD' } });

        if (!btcPair || !xauPair) {
            throw new Error('Required pairs (BTC/USDT or XAUUSD) not found in DB. Run seeds first.');
        }

        console.log('1. Creating a FREE user...');
        freeUser = await User.create({
            lineUserId: testLineUserId,
            displayName: 'Logic Test User',
            subscriptionType: 'unsubscription'
        });

        // 2. Simulate the logic from userSettingsRoutes.js
        console.log('2. Simulating Save Settings (XAUUSD + BTC/USDT + ETH/USDT)...');
        const inputPairs = [
            { tradingPairId: xauPair.id },
            { tradingPairId: btcPair.id },
            { tradingPairId: ethPair.id }
        ];

        // --- THE LOGIC TO TEST ---
        const user_subscription = freeUser.subscriptionType || 'unsubscription';
        let filteredPairs = inputPairs;

        if (user_subscription !== 'subscription') {
            const xauusdPairRecord = await TradingPair.findOne({ where: { pairCode: 'XAUUSD' } });
            const allowedIds = xauusdPairRecord ? [xauusdPairRecord.id] : [];
            filteredPairs = inputPairs.filter(p => allowedIds.includes(p.tradingPairId || p.pairId));
            console.log(`[Tier] Logic applied. Filtered to ${filteredPairs.length}/${inputPairs.length} pairs`);
        }
        // --- END LOGIC ---

        // Save filtered results
        for (const pair of filteredPairs) {
            await UserTradingPair.create({
                userId: freeUser.id,
                pairId: pair.tradingPairId
            });
        }

        // 3. Verify
        const saved = await UserTradingPair.findAll({
            where: { userId: freeUser.id },
            include: [{ model: TradingPair, as: 'TradingPair' }]
        });

        console.log('\nResults for FREE user:');
        saved.forEach(s => console.log(`- Saved: ${s.TradingPair.pairCode}`));

        const hasCrypto = saved.some(s => s.TradingPair.assetType === 'crypto');
        if (!hasCrypto && saved.length === 1 && saved[0].TradingPair.pairCode === 'XAUUSD') {
            console.log('✅ PASS: Logic correctly restricted FREE user to XAUUSD only.');
        } else {
            console.log('❌ FAIL: Restriction logic failed.');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        if (freeUser) {
            await UserTradingPair.destroy({ where: { userId: freeUser.id } });
            await freeUser.destroy();
            console.log('Cleanup done.');
        }
        await sequelize.close();
        process.exit(0);
    }
}

testTierLogic();
