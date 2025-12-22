const config = require('../config/config');
const technicalAnalysis = require('./technicalAnalysis');
const newsAnalysis = require('./newsAnalysis');
const lineNotifier = require('./lineNotifier');
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

      // Get predictions from both models
      const [technical, news] = await Promise.all([
        technicalAnalysis.analyze(),
        newsAnalysis.analyze()
      ]);

      // Calculate combined score
      const combinedScore = this.calculateCombinedScore(
        technical.probability,
        news.score
      );

      // Determine signal
      const signal = this.determineSignal(combinedScore);

      const signalData = {
        signal: signal,
        confidence: combinedScore,
        technicalProb: technical.probability,
        newsScore: news.score,
        price: technical.price,
        tp: technical.tp,
        sl: technical.sl,
        timestamp: new Date().toLocaleString('th-TH')
      };

      return signalData;
    } catch (error) {
      logger.error(`Error generating signal: ${error.message}`);
      return null;
    }
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
      
      const success = await lineNotifier.sendTradingSignal(signalData);
      
      if (success) {
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