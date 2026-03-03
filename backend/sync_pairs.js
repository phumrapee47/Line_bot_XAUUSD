const { TradingPair, sequelize } = require('./src/models');
const logger = require('./src/utils/logger');

async function syncTradingPairs() {
  const transaction = await sequelize.transaction();
  try {
    // New pairs based on technical_model.py
    const targetPairs = [
      { pairCode: 'XAUUSD', pairName: 'Gold/USD', pairSymbol: 'XAU', assetType: 'commodity', baseAsset: 'Gold', quoteAsset: 'USD', modelAvailable: true },
      { pairCode: 'BNB/USDT', pairName: 'BNB', pairSymbol: 'BNB', assetType: 'crypto', baseAsset: 'BNB', quoteAsset: 'USDT', modelAvailable: true },
      { pairCode: 'BTC/USDT', pairName: 'Bitcoin', pairSymbol: 'BTC', assetType: 'crypto', baseAsset: 'Bitcoin', quoteAsset: 'USDT', modelAvailable: true },
      { pairCode: 'ETH/USDT', pairName: 'Ethereum', pairSymbol: 'ETH', assetType: 'crypto', baseAsset: 'Ethereum', quoteAsset: 'USDT', modelAvailable: true },
      { pairCode: 'SOL/USDT', pairName: 'Solana', pairSymbol: 'SOL', assetType: 'crypto', baseAsset: 'Solana', quoteAsset: 'USDT', modelAvailable: true },
      { pairCode: 'DOGE/USDT', pairName: 'Dogecoin', pairSymbol: 'DOGE', assetType: 'crypto', baseAsset: 'Dogecoin', quoteAsset: 'USDT', modelAvailable: true },
      { pairCode: 'XRP/USDT', pairName: 'Ripple', pairSymbol: 'XRP', assetType: 'crypto', baseAsset: 'Ripple', quoteAsset: 'USDT', modelAvailable: true }
    ];

    const targetPairCodes = targetPairs.map(p => p.pairCode);

    // 1. Remove pairs that are no longer in the list
    const deletedCount = await TradingPair.destroy({
      where: {
        pairCode: { [require('sequelize').Op.notIn]: targetPairCodes }
      },
      transaction
    });
    console.log(`✅ Removed ${deletedCount} deprecated pairs.`);

    // 2. Upsert target pairs
    for (const p of targetPairs) {
      const [pair, created] = await TradingPair.findOrCreate({
        where: { pairCode: p.pairCode },
        defaults: { ...p, isActive: true, priceUpdateInterval: 1 },
        transaction
      });

      if (!created) {
        await pair.update(p, { transaction });
      }
    }

    await transaction.commit();
    console.log('✅ Trading pairs synchronized successfully!');
    
    // List final pairs
    const finalPairs = await TradingPair.findAll();
    console.log('\n📋 Current pairs in database:');
    finalPairs.forEach(p => {
      console.log(`${p.id.toString().padEnd(3)} | ${p.assetType.padEnd(12)} | ${p.pairCode.padEnd(15)} | ${p.pairName}`);
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error synchronizing pairs:', error);
  } finally {
    process.exit();
  }
}

syncTradingPairs();
