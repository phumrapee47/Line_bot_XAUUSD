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

  // Normalize signals to prevent string mismatch (e.g., "HOLD" vs "⚪ HOLD")
  normalizeSignal(signal) {
    if (!signal) return '⚪ HOLD';
    const s = signal.toString().toUpperCase();
    if (s.includes('BUY')) return '🟢 BUY';
    if (s.includes('SELL')) return '🔴 SELL';
    return '⚪ HOLD';
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
        combinedScore = typeof technicalData.probability === 'number' ? technicalData.probability : 0.5;
        logger.info(`Combined score for ${pairCode}: ${combinedScore.toFixed(4)} (Technical Only - default fallback)`);
      }

      let signal = this.determineSignal(combinedScore);
      let confidence = combinedScore;

      // Respect the signal from Python script (it has already done component-level filtering)
      if (technicalData.signal) {
        const pySignal = this.normalizeSignal(technicalData.signal);
        if (pySignal === '⚪ HOLD') {
          // If Python blocked it (e.g., 5-layer shield), we must respect it
          signal = '⚪ HOLD';
        } else if (!isXAUUSD) {
          // For crypto, always use Python signal completely
          signal = pySignal;
          confidence = technicalData.confidence / 100;
        }
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
        notes: technicalData.notes || [], // Pass notes for warning formatting
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

    const currentSignal = this.normalizeSignal(signalData.signal);
    const lastSignal = this.normalizeSignal(this.lastSignals[pairCode] || '⚪ HOLD');

    // Broadcast if signal is BUY or SELL, AND it's different from the last signal for this pair
    const isActionable = currentSignal !== '⚪ HOLD';
    const hasChanged = currentSignal !== lastSignal;

    if (isActionable && hasChanged) {
      logger.info(`New signal detected for ${pairCode}: ${currentSignal} (was ${lastSignal})`);
      
      const userSettingsService = require('./userSettingsService');
      
      // Get targeted users
      const lineUsers = await userSettingsService.getActiveUsersForBroadcasting('line', pairCode);
      const telegramUsers = await userSettingsService.getActiveUsersForBroadcasting('telegram', pairCode);
      
      const lineUserIds = lineUsers.map(u => u.lineUserId || u.line_user_id).filter(id => !!id);
      const telegramUserIds = telegramUsers.map(u => u.telegramUserId || u.telegram_user_id).filter(id => !!id);


      logger.info(`Targeting ${lineUserIds.length} LINE users and ${telegramUserIds.length} Telegram users for ${pairCode}`);

      // Send to targeted people
      await lineNotifier.sendTradingSignal(signalData, lineUserIds);
      await telegramNotifier.sendTradingSignal(signalData, telegramUserIds);
      
      // Save signal to history
      try {
        const { TradingPair, TradingSignal } = require('../models');
        
        // Find exact match or fallback to removing slash (e.g. BTC/USDT -> BTCUSDT)
        let pair = await TradingPair.findOne({ where: { pairCode: pairCode } });
        if (!pair && pairCode.includes('/')) {
          pair = await TradingPair.findOne({ where: { pairCode: pairCode.replace('/', '') } });
        }

        // Auto-create missing pair to ensure signals are always saved
        if (!pair) {
          const isCrypto = pairCode.includes('/');
          const rawSymbol = pairCode.split('/')[0];
          
          pair = await TradingPair.create({
            pairCode: pairCode,
            pairName: pairCode.replace('/', ' / '),
            pairSymbol: rawSymbol.substring(0, 3).toLowerCase(),
            assetType: isCrypto ? 'crypto' : 'commodity',
            isActive: true,
            modelAvailable: true
          });
          logger.info(`Auto-created missing TradingPair for ${pairCode}`);
        }

        await TradingSignal.create({
          pairId: pair.id,
          signal: currentSignal,
          confidence: signalData.confidence,
          price: signalData.price,
          tp: signalData.tp,
          sl: signalData.sl
        });
        logger.info(`Signal saved to history for ${pairCode}`);
        
      } catch (dbError) {
        logger.error(`Error saving signal to DB: ${dbError.message}`);
      }
    } else {
      logger.info(`No broadcast for ${pairCode}: Signal is ${currentSignal}${hasChanged ? '' : ' (no change)'}`);
    }

    // ALWAYS update the state so we can detect changes from HOLD back to BUY/SELL
    this.lastSignals[pairCode] = currentSignal;

    return signalData;
  }
}

module.exports = new TradingSignalService();