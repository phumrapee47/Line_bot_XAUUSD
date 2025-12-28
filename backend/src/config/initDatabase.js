const sequelize = require('./database');
const User = require('../models/User');
const TradingParameters = require('../models/TradingParameters');
const logger = require('../utils/logger');

async function initDatabase() {
  try {
    logger.info('Initializing database...');

    // Sync all models
    await sequelize.sync({ alter: true });

    logger.info('Database initialized successfully');
    return true;
  } catch (error) {
    logger.error(`Database initialization failed: ${error.message}`);
    throw error;
  }
}

module.exports = initDatabase;
