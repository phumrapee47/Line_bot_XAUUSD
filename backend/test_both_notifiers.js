const lineNotifier = require('./src/services/lineNotifier');
const telegramNotifier = require('./src/services/telegramNotifier');

async function testBothNotifiers() {
  try {
    console.log('🔔 Testing Both LINE and Telegram Notifiers\n');
    console.log('=' .repeat(50));
    
    // Simulate a trading signal
    const testSignal = {
      signal: '🔴 SELL',
      confidence: 0.82,
      technicalProb: 0.85,
      newsScore: 0.80,
      price: 4950,
      tp: 4700,
      sl: 5050,
      timestamp: new Date().toISOString()
    };
    
    console.log('\n📊 Trading Signal:');
    console.log(`Signal: ${testSignal.signal}`);
    console.log(`Price: $${testSignal.price}`);
    console.log(`Confidence: ${(testSignal.confidence * 100).toFixed(1)}%`);
    
    console.log('\n' + '=' .repeat(50));
    console.log('📤 Sending to LINE...');
    const lineResult = await lineNotifier.sendTradingSignal(testSignal);
    console.log(lineResult ? '✅ LINE sent' : '⚠️ LINE failed');
    
    console.log('\n📤 Sending to Telegram...');
    const telegramResult = await telegramNotifier.sendTradingSignal(testSignal);
    console.log(telegramResult ? '✅ Telegram sent' : '⚠️ Telegram failed');
    
    console.log('\n' + '=' .repeat(50));
    console.log(lineResult && telegramResult ? '\n✅ Both notifiers working!' : '\n⚠️ Check status above');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testBothNotifiers();
