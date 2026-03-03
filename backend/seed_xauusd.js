require('dotenv').config();
const { Sequelize } = require('sequelize');

const seq = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

(async () => {
  await seq.authenticate();
  console.log('Connected to DB');

  // Check if XAUUSD already exists
  const [existing] = await seq.query("SELECT pair_code FROM trading_pairs WHERE pair_code = 'XAUUSD'");

  if (existing.length > 0) {
    console.log('✅ XAUUSD already exists in DB');
  } else {
    await seq.query(`
      INSERT INTO trading_pairs (pair_code, pair_name, pair_symbol, asset_type, base_asset, quote_asset, model_available, is_active, created_at, updated_at)
      VALUES ('XAUUSD', 'Gold/USD', 'XAU', 'commodity', 'Gold', 'USD', true, true, NOW(), NOW())
    `);
    console.log('✅ XAUUSD added successfully!');
  }

  // Show all pairs
  const [all] = await seq.query('SELECT id, pair_code, pair_name, asset_type FROM trading_pairs ORDER BY asset_type, pair_code');
  console.log('\n📋 All pairs in database:');
  console.log('ID  | Type         | PairCode        | PairName');
  console.log('----+--------------+-----------------+----------');
  all.forEach(p => {
    console.log(`${String(p.id).padEnd(4)}| ${p.asset_type.padEnd(13)}| ${p.pair_code.padEnd(16)}| ${p.pair_name}`);
  });

  await seq.close();
})().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
