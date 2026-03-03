const config = require('../config/config');
const technicalAnalysis = require('./technicalAnalysis');
const newsAnalysis = require('./newsAnalysis');
const lineNotifier = require('./lineNotifier');
const telegramNotifier = require('./telegramNotifier');
const logger = require('../utils/logger');

class TradingSignalService {
  constructor() {
    this.lastSignals = {}; // Per-pair signal tracking: { 'XAUUSD': 'HOLD', 'BTC/USDT': 'SELL' }
  }

  async withTimeout(promise, timeoutMs) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  calculateCombinedScore(technicalProb, newsScore) {
    const tProb = (typeof technicalProb === 'number') ? technicalProb : 0.5;
    const nScore = (typeof newsScore === 'number') ? newsScore : 0.5;
    
    const combined = 
      config.models.technicalWeight * tProb +
      config.models.newsWeight * nScore;
    
    logger.info(`Combined score: ${combined.toFixed(4)} (Tech: ${tProb.toFixed(4)}, News: ${nScore.toFixed(4)})`);
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
        pairCode === 'XAUUSD' ? this.withTimeout(newsAnalysis.analyze(), 60000) : Promise.resolve({ score: 0.5 })
      ]);

      if (technical.status === 'rejected') {
        logger.error(`❌ Technical analysis failed for ${pairCode}: ${technical.reason}`);
        return null;
      }

      const technicalData = technical.value;
      const isXAUUSD = pairCode === 'XAUUSD';
      
      let combinedScore;
      let newsScore = 0.5; // Default neutral score

      if (isXAUUSD) {
        const newsData = news.status === 'fulfilled' ? news.value : { score: 0.5 };
        newsScore = newsData.score;
        combinedScore = this.calculateCombinedScore(
          technicalData.probability,
          newsScore
        );
      } else {
        // For Crypto, ignore news entirely
        combinedScore = technicalData.probability;
        logger.info(`Combined score for ${pairCode}: ${combinedScore.toFixed(4)} (Technical Only)`);
      }

      let signal = this.determineSignal(combinedScore);
      let confidence = combinedScore;

      // For non-XAUUSD, try to use values directly from technical analysis if they are high-confidence
      if (!isXAUUSD && technicalData.signal && technicalData.signal !== '⚪ HOLD') {
        signal = technicalData.signal;
        confidence = technicalData.confidence / 100; // Normalize to 0-1 range to match system
      }

      const signalData = {
        pairCode: pairCode,
        signal: signal,
        confidence: confidence,
        technicalProb: technicalData.probability,
        newsScore: isXAUUSD ? newsScore : null,
        price: technicalData.price,
        tp: technicalData.tp1 || technicalData.tp,  // Support both tp1 (crypto) and tp (xauusd)
        tp2: technicalData.tp2 || null,
        sl: technicalData.sl,
        source: technicalData.source || 'live',
        timestamp: new Date().toLocaleString('th-TH'),
        message: technicalData.message // Pass through custom message from Python if available
      };

      const priceFormatted = typeof signalData.price === 'number' ? signalData.price.toFixed(2) : 'N/A';
      logger.info(`✓ Signal generated for ${pairCode}: ${signal} at $${priceFormatted}`);
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
    const lastSignal = this.lastSignals[pairCode] || '⚪ HOLD';

    // Broadcast if signal is BUY or SELL, AND it's different from the last signal for this pair
    const isActionable = currentSignal !== '⚪ HOLD';
    const hasChanged = currentSignal !== lastSignal;

    if (isActionable && hasChanged) {
      logger.info(`New signal detected for ${pairCode}: ${currentSignal} (was ${lastSignal})`);
      
      const userSettingsService = require('./userSettingsService');
      
      // Get targeted users
      const lineUsers = await userSettingsService.getActiveUsersForBroadcasting('line', pairCode);
      const telegramUsers = await userSettingsService.getActiveUsersForBroadcasting('telegram', pairCode);
      
      const lineUserIds = lineUsers.map(u => u.line_user_id).filter(id => !!id);
      const telegramUserIds = telegramUsers.map(u => u.telegram_user_id).filter(id => !!id);

      logger.info(`Targeting ${lineUserIds.length} LINE users and ${telegramUserIds.length} Telegram users for ${pairCode}`);

      // Send to targeted people
      await lineNotifier.sendTradingSignal(signalData, lineUserIds);
      await telegramNotifier.sendTradingSignal(signalData, telegramUserIds);
      
      // Save signal to history
      try {
        const { TradingPair, TradingSignal } = require('../models');
        const pair = await TradingPair.findOne({ where: { pairCode: pairCode } });
        if (pair) {
          await TradingSignal.create({
            pairId: pair.id,
            signal: currentSignal,
            confidence: signalData.confidence,
            price: signalData.price,
            tp: signalData.tp,
            sl: signalData.sl
          });
          logger.info(`Signal saved to history for ${pairCode}`);
        }
      } catch (dbError) {
        logger.error(`Error saving signal to DB: ${dbError.message}`);
      }

      this.lastSignals[pairCode] = currentSignal;
    } else {
      logger.info(`No broadcast for ${pairCode}: Signal is ${currentSignal}${hasChanged ? '' : ' (no change)'}`);
    }

    return signalData;
  }
}

module.exports = new TradingSignalService();