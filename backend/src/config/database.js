const { Sequelize } = require('sequelize');
const path = require('path');
const logger = require('../utils/logger');

// ใช้ SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../data/trading_bot.db'),
  logging: (msg) => logger.debug(msg),
  define: {
    timestamps: true,
    underscored: true
  }
});

// Test connection
sequelize.authenticate()
  .then(() => {
    logger.info('Database connection established successfully');
  })
  .catch((error) => {
    logger.error(`Database connection failed: ${error.message}`);
  });

module.exports = sequelize;
