#!/usr/bin/env node

/**
 * Seed Script - Initialize Trading Pairs
 * Run: node backend/seeds/seedTradingPairs.js
 */

require('dotenv').config({ path: './backend/.env' });
const sequelize = require('../src/config/database');
const TradingPair = require('../src/models/TradingPair');

const tradingPairs = [
  {
    pairCode: 'XAUUSD',
    pairName: 'Gold / USD',
    pairSymbol: 'g',
    assetType: 'commodity',
    baseAsset: 'Gold',
    quoteAsset: 'USD',
    isActive: true,
    modelAvailable: true,
    technicalModelPath: '../ml-models/xgb_model.pkl'
  },
  {
    pairCode: 'EURUSD',
    pairName: 'Euro / USD',
    pairSymbol: 'e',
    assetType: 'forex',
    baseAsset: 'Euro',
    quoteAsset: 'USD',
    isActive: true,
    modelAvailable: false
  },
  {
    pairCode: 'GBPUSD',
    pairName: 'British Pound / USD',
    pairSymbol: 'p',
    assetType: 'forex',
    baseAsset: 'British Pound',
    quoteAsset: 'USD',
    isActive: true,
    modelAvailable: false
  },
  {
    pairCode: 'BTCUSD',
    pairName: 'Bitcoin / USD',
    pairSymbol: 'b',
    assetType: 'crypto',
    baseAsset: 'Bitcoin',
    quoteAsset: 'USD',
    isActive: true,
    modelAvailable: false
  },
  {
    pairCode: 'ETHUSD',
    pairName: 'Ethereum / USD',
    pairSymbol: 'eth',
    assetType: 'crypto',
    baseAsset: 'Ethereum',
    quoteAsset: 'USD',
    isActive: true,
    modelAvailable: false
  },
  {
    pairCode: 'USDJPY',
    pairName: 'US Dollar / Japanese Yen',
    pairSymbol: 'j',
    assetType: 'forex',
    baseAsset: 'US Dollar',
    quoteAsset: 'Japanese Yen',
    isActive: true,
    modelAvailable: false
  },
  {
    pairCode: 'NIFTY50',
    pairName: 'NIFTY 50 Index',
    pairSymbol: 'ni',
    assetType: 'index',
    baseAsset: 'NIFTY',
    quoteAsset: 'INR',
    isActive: true,
    modelAvailable: false
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seed...\n');

    // Sync database
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced\n');

    // Seed Trading Pairs
    console.log('📍 Seeding Trading Pairs...');
    
    for (const pair of tradingPairs) {
      const existing = await TradingPair.findOne({
        where: { pairCode: pair.pairCode }
      });

      if (existing) {
        console.log(`  ⏭️  ${pair.pairCode} already exists`);
      } else {
        await TradingPair.create(pair);
        console.log(`  ✅ ${pair.pairCode} - ${pair.pairName}`);
      }
    }

    console.log('\n✅ Database seeding completed!');
    const count = await TradingPair.count();
    console.log(`📊 Total trading pairs: ${count}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seedDatabase();
