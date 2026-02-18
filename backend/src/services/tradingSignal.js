const config = require('../config/config');
const technicalAnalysis = require('./technicalAnalysis');
const newsAnalysis = require('./newsAnalysis');
const lineNotifier = require('./lineNotifier');
const telegramNotifier = require('./telegramNotifier');
const logger = require('../utils/logger');

class TradingSignalService {
  constructor() {
    this.lastSignal = 'HOLD';
    this.lastSignalTime = null;
  }

  calculateCombinedScore(technicalProb, newsScore) {
    const combined = 
      config.models.technicalWeight * technicalProb +
      config.models.newsWeight * newsScore;
    
    logger.info(`Combined score: ${combined.toFixed(4)} (Tech: ${technicalProb.toFixed(4)}, News: ${newsScore.toFixed(4)})`);
    return combined;
  }

  determineSignal(combinedScore) {
    if (combinedScore > config.trading.buyThreshold) {
      return '🟢 BUY';
    } else if (combinedScore < config.trading.sellThreshold) {
      return '🔴 SELL';
    } else {
      return '⚪ HOLD';
    }
  }

  async generateSignal() {
    try {
      logger.info('Generating trading signal...');

      // Get predictions from both models with timeout protection
      const [technical, news] = await Promise.allSettled([
        this.withTimeout(technicalAnalysis.analyze(), 60000),
        this.withTimeout(newsAnalysis.analyze(), 60000)
      ]);

      // Check if technical analysis succeeded
      if (technical.status === 'rejected') {
        logger.error(`❌ Technical analysis failed: ${technical.reason}`);
        return null;
      }

      // Use technical data even if news fails
      const technicalData = technical.value;
      const newsData = news.status === 'fulfilled' ? news.value : { score: 0.5 };

      if (news.status === 'rejected') {
        logger.warn(`⚠️ News analysis failed, using default score: ${newsData.score}`);
      }

      // Additional validation before calculating score
      if (!technicalData || technicalData.price === 0) {
        logger.error('❌ Technical analysis returned invalid price');
        return null;
      }

      // Calculate combined score
      const combinedScore = this.calculateCombinedScore(
        technicalData.probability,
        newsData.score
      );

      // Determine signal
      const signal = this.determineSignal(combinedScore);

      const signalData = {
        signal: signal,
        confidence: combinedScore,
        technicalProb: technicalData.probability,
        newsScore: newsData.score,
        price: technicalData.price,
        tp: technicalData.tp,
        sl: technicalData.sl,
        source: technicalData.source || 'live',
        timestamp: new Date().toLocaleString('th-TH')
      };

      logger.info(`✓ Signal generated successfully: ${signal} at $${signalData.price.toFixed(2)}`);
      return signalData;
    } catch (error) {
      logger.error(`Error generating signal: ${error.message}`);
      return null;
    }
  }

  /**
   * Execute promise with timeout
   */
  withTimeout(promise, timeoutMs) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  async processSignal() {
    logger.info('=' .repeat(50));
    logger.info('Running trading system check...');

    const signalData = await this.generateSignal();

    if (!signalData) {
      logger.error('Failed to generate signal');
      return;
    }

    const currentSignal = signalData.signal;

    // Send notification only if signal changed or is BUY/SELL
    if (currentSignal !== '⚪ HOLD' && currentSignal !== this.lastSignal) {
      logger.info(`New signal detected: ${currentSignal}`);
      
      // Send to both LINE and Telegram
      const lineSuccess = await lineNotifier.sendTradingSignal(signalData);
      const telegramSuccess = await telegramNotifier.sendTradingSignal(signalData);
      
      if (lineSuccess || telegramSuccess) {
        this.lastSignal = currentSignal;
        this.lastSignalTime = new Date();
      }
    } else {
      logger.info(`Signal unchanged or HOLD: ${currentSignal}`);
    }

    return signalData;
  }
}

module.exports = new TradingSignalService();