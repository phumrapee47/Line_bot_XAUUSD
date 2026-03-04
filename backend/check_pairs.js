const { TradingPair } = require('./src/models');
const sequelize = require('./src/config/database');

async function checkPairs() {
  try {
    await sequelize.authenticate();
    const pairs = await TradingPair.findAll();
    console.log(JSON.stringify(pairs, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPairs();
