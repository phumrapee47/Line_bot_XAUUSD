const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');
require('dotenv').config();

let sequelize;

// Check if we are in production or have a valid database URL
if (process.env.DATABASE_URL) {
  logger.info('Initializing database connection with Supabase PostgreSQL (SSL)...');
  
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      },
      connectTimeout: 90000, // Increase to 90s
      keepAlive: true // Help keep connections alive
    },
    logging: msg => logger.debug(msg), // Keep only debug logging here
    pool: {
      max: 5, // Reduced from 10 to save RAM and avoid pool contention on free tier
      min: 1,
      acquire: 90000, // Increase to 90s
      idle: 10000,
      evict: 1000 // Check for idle connections every second
    }
  });

  // Note: Immediate sequelize.authenticate() removed here. 
  // It is now handled with retry logic in initDatabase.js

} else {
  // Fallback for local development without database
  logger.info('No DATABASE_URL found. Using mock database for development.');
  
  const mockSequelize = {
    authenticate: async () => {
      logger.info('Database authentication skipped (mock mode)');
      return true;
    },
    sync: async () => {
      logger.info('Database sync skipped (mock mode)');
      return true;
    },
    close: async () => {
      logger.info('Database connection closed (mock mode)');
      return true;
    },
    define: (name, schema) => {
      return {
        name,
        schema,
        findAll: async () => [],
        findOne: async () => null,
        create: async () => ({}),
        update: async () => [0],
        destroy: async () => 0,
        belongsTo: () => {},
        hasMany: () => {}
      };
    }
  };
  
  sequelize = mockSequelize;
}

module.exports = sequelize;
