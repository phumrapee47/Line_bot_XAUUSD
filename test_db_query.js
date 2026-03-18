const { sequelize, User, UserTradingPair, TradingPair, UserNotificationPreferences } = require('./backend/src/models');

async function testQuery() {
  try {
    const pairCode = 'BNB/USDT';
    console.log(`Testing query for ${pairCode}`);
    
    // Test base user query
    const users = await User.findAll({ where: { isActive: true }});
    console.log('Active users:', users.map(u => ({ id: u.id, sub: u.subscriptionType })));

    // Test notify pref
    const prefs = await UserNotificationPreferences.findAll();
    console.log('Prefs:', prefs.map(p => ({ uId: p.userId, line: p.notifyLine, tg: p.notifyTelegram })));

    // Test pairs
    const pairs = await UserTradingPair.findAll({ 
      where: { isSelected: true },
      include: [{ model: TradingPair, as: 'TradingPair' }]
    });
    console.log('Selected pairs:', pairs.map(p => ({ uId: p.userId, code: p.TradingPair?.pairCode })));

    // Full query just like in userSettingsService
    const where = { isActive: true, subscriptionType: 'subscription' };
    const include = [
        {
          model: UserNotificationPreferences,
          as: 'UserNotificationPreference',
          where: { notifyTelegram: true },
          required: true
        },
        {
          model: UserTradingPair,
          as: 'UserTradingPairs',
          where: { isSelected: true },
          required: true,
          include: [{ model: TradingPair, as: 'TradingPair', where: { pairCode: pairCode }, required: true }]
        }
    ];

    const result = await User.findAll({ where, include, attributes: ['id', 'telegramUserId', 'subscriptionType'] });
    console.log('\nFINAL COMBINED RESULT for BNB/USDT telegram:', result.map(u => u.toJSON()));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

testQuery();
