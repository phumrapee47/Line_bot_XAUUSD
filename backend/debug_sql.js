const sequelize = require('./src/config/database');
const { User, TradingPair, UserTradingPair, UserNotificationPreferences, TradingParameters, UserTradingParameters, TelegramSubscriber } = require('./src/models');

async function debugSync() {
  try {
    console.log('Starting debug sync with SQL logging...');
    // Enable logging
    sequelize.options.logging = console.log;
    
    await sequelize.sync({ alter: true });
    
    console.log('Sync successful!');
  } catch (error) {
    console.error('Sync failed!');
    console.error('Error message:', error.message);
    if (error.parent) {
      console.error('Parent error:', error.parent.message);
      console.error('SQL:', error.parent.sql);
    }
  } finally {
    process.exit();
  }
}

debugSync();
