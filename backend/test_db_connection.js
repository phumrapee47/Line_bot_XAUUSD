const sequelize = require('./src/config/database');
const logger = require('./src/utils/logger');

async function testConnection() {
  try {
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    
    // Check if we are using the mock or real sequelize
    if (sequelize.options && sequelize.options.dialect === 'postgres') {
      console.log('✅ Connected to PostgreSQL database!');
      console.log(`Host: ${sequelize.config.host}`);
      console.log(`Database: ${sequelize.config.database}`);
    } else {
        console.log('⚠️ Using Mock Database (No DATABASE_URL provided)');
    }

  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  } finally {
    if (sequelize.close) {
      await sequelize.close();
    }
  }
}

testConnection();
