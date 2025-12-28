const { Sequelize } = require('sequelize');
const path = require('path');
const logger = require('../utils/logger');

// ใช้ SQLite with better-sqlite3
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../data/trading_bot.db'),
  logging: false, // Set to false to reduce logs
  define: {
    timestamps: true,
    underscored: true
  },
  dialectOptions: {
    busyTimeout: 3000
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
