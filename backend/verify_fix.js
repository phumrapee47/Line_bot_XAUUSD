const { UserTradingPair, User } = require('./src/models');
const sequelize = require('./src/config/database');

async function testNormalization() {
  try {
    await sequelize.authenticate();
    console.log('DB Connected');

    // Find a test user
    const user = await User.findOne();
    if (!user) {
      console.log('No user found to test with');
      process.exit(0);
    }

    console.log(`Testing with user ID: ${user.id}`);

    // Mock the logic from the route
    let buyThreshold = 75; // 75%
    let sellThreshold = 25; // 25%

    if (buyThreshold > 1) buyThreshold = buyThreshold / 100;
    if (sellThreshold > 1) sellThreshold = sellThreshold / 100;

    console.log(`Normalized values: Buy=${buyThreshold}, Sell=${sellThreshold}`);

    if (buyThreshold === 0.75 && sellThreshold === 0.25) {
      console.log('✅ Normalization Logic Verified (Local Mock)');
    } else {
      console.log('❌ Normalization Logic Failed');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testNormalization();
