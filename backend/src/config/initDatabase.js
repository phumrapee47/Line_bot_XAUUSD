const sequelize = require('./database');
const logger = require('../utils/logger');
const { User, TradingPair, UserTradingPair, UserNotificationPreferences, UserTradingParameters } = require('../models');

async function initDatabase() {
  try {
    // Check if real database connection is available
    if (sequelize.options && sequelize.options.dialect === 'postgres') {
      logger.info('Initializing PostgreSQL database...');
      
      // Sync all models
      await sequelize.sync({ alter: true }); // Use alter: true to update tables without dropping
      
      logger.info('✅ Database tables synchronized successfully');
      
      // Log registered models
      const modelNames = Object.keys(sequelize.models);
      logger.info(`Registered models: ${modelNames.join(', ')}`);
      
      return true;
    } else {
      logger.info('Database initialization skipped (mock mode)');
      logger.info('🔔 Telegram and LINE messaging ready - database features disabled');
      return true;
    }
  } catch (error) {
    logger.error(`❌ Database initialization failed: ${error.message}`);
    // Don't kill the process, allow it to run without DB if necessary
    return false;
  }
}

module.exports = initDatabase;
