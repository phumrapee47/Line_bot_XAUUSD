const tradingSignal = require('./src/services/tradingSignal');
const { TradingPair, TradingSignal } = require('./src/models');
const logger = require('./src/utils/logger');

async function runDiagnostic() {
  console.log('--- 🛡️ Trading Signal System Diagnostic ---');
  
  try {
    const pairs = await TradingPair.findAll({ where: { isActive: true } });
    console.log(`Found ${pairs.length} active pairs in DB.`);
    
    for (const pair of pairs) {
      console.log(`\n🔍 Checking [${pair.pairCode}]...`);
      try {
        const result = await tradingSignal.processSignal(pair.pairCode);
        console.log(`✅ Result for ${pair.pairCode}:`, {
          signal: result.signal,
          confidence: result.confidence.toFixed(4),
          price: result.price,
          lastSignalState: tradingSignal.lastSignals[pair.pairCode] || 'NONE'
        });
      } catch (err) {
        console.error(`❌ Error processing ${pair.pairCode}:`, err.message);
      }
    }
    
    console.log('\n--- 📊 Final State ---');
    console.log('lastSignals:', JSON.stringify(tradingSignal.lastSignals, null, 2));
    
    const count = await TradingSignal.count();
    console.log(`Total signals in DB: ${count}`);
    
  } catch (err) {
    console.error('Diagnostic failed:', err);
  } finally {
    process.exit();
  }
}

runDiagnostic();
