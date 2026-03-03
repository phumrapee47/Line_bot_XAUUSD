/**
 * Script to add crypto trading pairs to the TradingPair table in Supabase
 * Run: node seed_crypto_pairs.js
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const CRYPTO_PAIRS = [
  { pairCode: 'BTC/USDT', pairName: 'Bitcoin',    pairSymbol: 'BTC', baseAsset: 'Bitcoin',    quoteAsset: 'USDT' },
  { pairCode: 'ETH/USDT', pairName: 'Ethereum',   pairSymbol: 'ETH', baseAsset: 'Ethereum',   quoteAsset: 'USDT' },
  { pairCode: 'BNB/USDT', pairName: 'BNB',        pairSymbol: 'BNB', baseAsset: 'BNB',        quoteAsset: 'USDT' },
  { pairCode: 'SOL/USDT', pairName: 'Solana',     pairSymbol: 'SOL', baseAsset: 'Solana',     quoteAsset: 'USDT' },
  { pairCode: 'AVAX/USDT',pairName: 'Avalanche',  pairSymbol: 'AVAX',baseAsset: 'Avalanche',  quoteAsset: 'USDT' },
  { pairCode: 'MATIC/USDT',pairName:'Polygon',    pairSymbol: 'MATIC',baseAsset:'Polygon',    quoteAsset: 'USDT' },
  { pairCode: 'FTM/USDT', pairName: 'Fantom',     pairSymbol: 'FTM', baseAsset: 'Fantom',     quoteAsset: 'USDT' },
  { pairCode: 'EGLD/USDT',pairName: 'MultiversX', pairSymbol: 'EGLD',baseAsset: 'MultiversX', quoteAsset: 'USDT' },
  { pairCode: 'ONE/USDT', pairName: 'Harmony',    pairSymbol: 'ONE', baseAsset: 'Harmony',    quoteAsset: 'USDT' }
];

async function seedCryptoPairs() {
  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  });

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Check existing pairs
    const [existing] = await sequelize.query(`SELECT pair_code FROM trading_pairs`);
    const existingCodes = existing.map(r => r.pair_code);
    console.log(`📋 Existing pairs: ${existingCodes.join(', ')}`);

    let added = 0;
    let skipped = 0;

    for (const pair of CRYPTO_PAIRS) {
      if (existingCodes.includes(pair.pairCode)) {
        console.log(`⏭️  Skipping ${pair.pairCode} (already exists)`);
        skipped++;
        continue;
      }

      await sequelize.query(`
        INSERT INTO trading_pairs (pair_code, pair_name, pair_symbol, asset_type, base_asset, quote_asset, model_available, is_active, created_at, updated_at)
        VALUES (:pairCode, :pairName, :pairSymbol, 'crypto', :baseAsset, :quoteAsset, true, true, NOW(), NOW())
      `, {
        replacements: pair,
        type: Sequelize.QueryTypes.INSERT
      });

      console.log(`✅ Added: ${pair.pairCode} (${pair.pairName})`);
      added++;
    }

    console.log(`\n📊 Done: ${added} added, ${skipped} skipped`);
    
    // Verify all pairs now
    const [allPairs] = await sequelize.query(`SELECT pair_code, pair_name, asset_type FROM trading_pairs ORDER BY asset_type, pair_code`);
    console.log('\n📋 All pairs in database:');
    allPairs.forEach(p => console.log(`   ${p.asset_type.padEnd(10)} | ${p.pair_code.padEnd(15)} | ${p.pair_name}`));

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('column')) {
      console.log('\n⚠️ Some columns might not exist. Check the trading_pairs table schema.');
    }
  } finally {
    await sequelize.close();
  }
}

seedCryptoPairs();
