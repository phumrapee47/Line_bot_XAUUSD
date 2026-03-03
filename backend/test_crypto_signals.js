/**
 * Test script: Crypto signal generation + notification
 * Usage: node test_crypto_signals.js
 */
require('dotenv').config();

const signalService = require('./src/services/tradingSignal');
const logger = require('./src/utils/logger');

// All crypto pairs to test
const PAIRS = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'AVAX/USDT', 'MATIC/USDT', 'FTM/USDT'];

async function testPair(pairCode) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 Testing: ${pairCode}`);
  console.log(`${'='.repeat(60)}`);
  
  try {
    const signalData = await signalService.generateSignal(pairCode);
    
    if (!signalData) {
      console.log(`❌ ${pairCode}: FAILED - No signal generated`);
      return { pairCode, success: false };
    }

    console.log(`✅ ${pairCode}: Signal generation OK`);
    console.log(`   Signal   : ${signalData.signal}`);
    console.log(`   Price    : $${signalData.price}`);
    console.log(`   TP1      : $${signalData.tp}`);
    console.log(`   TP2      : $${signalData.tp2}`);
    console.log(`   SL       : $${signalData.sl}`);
    console.log(`   Has Msg  : ${signalData.message ? 'YES ✅' : 'NO ❌'}`);
    
    if (signalData.message) {
      console.log('\n📩 Message Preview:');
      console.log('---');
      console.log(signalData.message);
      console.log('---');
    }
    
    return { pairCode, success: true, signal: signalData.signal };
  } catch (err) {
    console.log(`❌ ${pairCode}: ERROR - ${err.message}`);
    return { pairCode, success: false, error: err.message };
  }
}

async function testBTCWithNotification() {
  console.log('\n🚀 Running FULL processSignal for BTC/USDT (will send notification if BUY/SELL)...');
  await signalService.processSignal('BTC/USDT');
  console.log('✅ BTC/USDT processSignal complete');
}

async function main() {
  console.log('🧪 Starting Crypto Signal System Test\n');
  
  const results = [];
  
  for (const pair of PAIRS) {
    const result = await testPair(pair);
    results.push(result);
  }

  console.log('\n\n📊 Summary:');
  console.log('='.repeat(40));
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    console.log(`${status} ${r.pairCode}: ${r.signal || r.error || 'FAILED'}`);
  });

  const passed = results.filter(r => r.success).length;
  console.log(`\nTotal: ${passed}/${results.length} passed`);
  
  // Also trigger a full notification test for BTC
  await testBTCWithNotification();
}

main().then(() => process.exit(0)).catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
