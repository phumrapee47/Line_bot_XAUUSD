const sequelize = require('./database');
const logger = require('../utils/logger');
const { User, TradingPair, UserTradingPair, UserNotificationPreferences, UserTradingParameters } = require('../models');

async function initDatabase() {
  // Check if real database connection is available
  if (!sequelize.options || sequelize.options.dialect !== 'postgres') {
    logger.info('Database initialization skipped (mock mode)');
    logger.info('🔔 Telegram and LINE messaging ready - database features disabled');
    return true;
  }

  const MAX_RETRIES = 3;
  const INITIAL_DELAY = 5000; // 5 seconds

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.info(`Initializing PostgreSQL database (Attempt ${attempt}/${MAX_RETRIES})...`);
      
      // 1. Authenticate with timeout handled by Sequelize config
      await sequelize.authenticate();
      logger.info('✅ Database connection established successfully.');

      // 2. Sync models
      // In production, we might want to avoid 'alter: true' on every startup 
      // but keeping it for now to ensure indexes are applied as per previous code.
      // We wrap it in a try-catch to allow the app to start even if sync fails (if tables exist)
      try {
        await sequelize.sync({ alter: true });
        logger.info('✅ Database tables synchronized successfully');
      } catch (syncError) {
        logger.warn(`⚠️ Model synchronization warned: ${syncError.message}`);
        logger.info('Continuing anyway as connection is established...');
      }
      
      // Log registered models
      const modelNames = Object.keys(sequelize.models);
      logger.info(`Registered models: ${modelNames.join(', ')}`);
      
      return true;
    } catch (error) {
      logger.error(`❌ Database startup attempt ${attempt} failed: ${error.message}`);
      
      if (attempt < MAX_RETRIES) {
        const delay = INITIAL_DELAY * attempt;
        logger.info(`Retrying in ${delay/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        logger.error('❌ All database connection attempts failed.');
        return false;
      }
    }
  }
}

module.exports = initDatabase;
