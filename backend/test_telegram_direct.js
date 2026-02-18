const telegramNotifier = require('./src/services/telegramNotifier');

async function testTelegramMessage() {
  try {
    console.log('📤 Testing Telegram direct message...\n');
    
    // Simulate a trading signal
    const testSignal = {
      signal: '🟢 BUY',
      confidence: 0.75,
      technicalProb: 0.8,
      newsScore: 0.7,
      price: 5100,
      tp: 5400,
      sl: 4900,
      timestamp: new Date().toISOString()
    };
    
    console.log('Signal Data:', testSignal);
    console.log('\n⏳ Sending to Telegram...\n');
    
    const result = await telegramNotifier.sendTradingSignal(testSignal);
    
    if (result) {
      console.log('✅ Telegram message sent successfully!');
    } else {
      console.log('❌ Failed to send Telegram message');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testTelegramMessage();
