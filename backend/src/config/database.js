const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');
require('dotenv').config();

let sequelize;

// Check if we are in production or have a valid database URL
if (process.env.DATABASE_URL) {
  logger.info('Initializing database connection with Supabase PostgreSQL (SSL)...');
  
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: msg => logger.debug(msg),
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      },
      connectTimeout: 60000 // เพิ่มเวลาให้รอ connection นานขึ้น (60 วิ)
    },
    pool: {
      max: 10,
      min: 0, // กลับมาใช้ 0 เพื่อไม่ให้บังคับเปิด connection พร้อมกันตอนเริ่มระบบ
      acquire: 60000,
      idle: 10000
    }
  });

  // Test connection
  sequelize.authenticate()
    .then(() => {
      logger.info('Database connection established successfully.');
    })
    .catch(err => {
      logger.error('Unable to connect to the database:', err);
    });

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
