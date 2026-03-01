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

  async generateSignal(pairCode = 'XAUUSD') {
    try {
      logger.info(`Generating trading signal for ${pairCode}...`);

      const [technical, news] = await Promise.allSettled([
        this.withTimeout(technicalAnalysis.analyze(pairCode), 60000),
        pairCode === 'XAUUSD' ? this.withTimeout(newsAnalysis.analyze(), 60000) : Promise.resolve({ value: { score: 0.5 } })
      ]);

      if (technical.status === 'rejected') {
        logger.error(`❌ Technical analysis failed for ${pairCode}: ${technical.reason}`);
        return null;
      }

      const technicalData = technical.value;
      const newsData = news.status === 'fulfilled' ? news.value : { score: 0.5 };

      const combinedScore = this.calculateCombinedScore(
        technicalData.probability,
        newsData.score
      );

      const signal = this.determineSignal(combinedScore);

      const signalData = {
        pairCode: pairCode,
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

      logger.info(`✓ Signal generated for ${pairCode}: ${signal} at $${signalData.price.toFixed(2)}`);
      return signalData;
    } catch (error) {
      logger.error(`Error generating signal for ${pairCode}: ${error.message}`);
      return null;
    }
  }

  async processSignal(pairCode = 'XAUUSD') {
    logger.info('=' .repeat(50));
    logger.info(`Running trading system check for ${pairCode}...`);

    const signalData = await this.generateSignal(pairCode);

    if (!signalData) {
      logger.error(`Failed to generate signal for ${pairCode}`);
      return;
    }

    const currentSignal = signalData.signal;

    // Send notification only if signal changed or is BUY/SELL
    // (Note: To simplify, we'll use a global lastSignal for now, should be per-pair in production)
    if (currentSignal !== '⚪ HOLD') {
      logger.info(`New signal detected for ${pairCode}: ${currentSignal}`);
      
      const userSettingsService = require('./userSettingsService');
      
      // Get targeted users
      const lineUsers = await userSettingsService.getActiveUsersForBroadcasting('line', pairCode);
      const telegramUsers = await userSettingsService.getActiveUsersForBroadcasting('telegram', pairCode);
      
      const lineUserIds = lineUsers.map(u => u.line_user_id).filter(id => !!id);
      const telegramUserIds = telegramUsers.map(u => u.telegram_user_id).filter(id => !!id);

      logger.info(`Targeting ${lineUserIds.length} LINE users and ${telegramUserIds.length} Telegram users for ${pairCode}`);

      // Send to targeted people
      const lineSuccess = await lineNotifier.sendTradingSignal(signalData, lineUserIds);
      const telegramSuccess = await telegramNotifier.sendTradingSignal(signalData, telegramUserIds);
      
      this.lastSignal = currentSignal;
      this.lastSignalTime = new Date();
    } else {
      logger.info(`Signal is HOLD for ${pairCode}: ${currentSignal}`);
    }

    return signalData;
  }
}

module.exports = new TradingSignalService();