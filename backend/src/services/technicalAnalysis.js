const pythonBridge = require('../models/pythonBridge');
const priceValidation = require('./priceValidation');
const logger = require('../utils/logger');

class TechnicalAnalysisService {
  constructor() {
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
    this.timeout = 60000; // 60 seconds
  }

  /**
   * Retry logic for failed analysis
   */
  async retry(fn, retries = this.maxRetries) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        logger.warn(`⚠️ Attempt ${attempt} failed, retrying in ${this.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
  }

  /**
   * Execute with timeout
   */
  async executeWithTimeout(promise, timeoutMs) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  /**
   * Main analyze method with safety checks
   */
  async analyze(pairCode = 'XAUUSD') {
    try {
      logger.info(`Starting technical analysis for ${pairCode} with safety checks...`);

      // Retry logic: attempt up to 3 times
      let result = await this.retry(async () => {
        return await this.executeWithTimeout(
          pythonBridge.getTechnicalAnalysis(pairCode),
          this.timeout
        );
      // Validate the result - use tp1 for crypto, tp for XAUUSD
      const isXAUUSD = pairCode === 'XAUUSD';
      const priceData = {
        price: result.price,
        tp: isXAUUSD ? result.tp : (result.tp1 || result.tp || result.price),
        sl: result.sl,
        probability: result.probability
      };

      // Use validation service to check and fallback if needed
      const validatedPrice = priceValidation.getPriceWithFallback(pairCode, priceData);

      // Log with more indicators if available
      const adxInfo = result.adx ? `, adx=${result.adx}` : '';
      const rsiInfo = result.rsi ? `, rsi=${result.rsi}` : '';
      logger.info(`Technical analysis completed for ${pairCode}: prob=${validatedPrice.probability.toFixed(4)}, price=${validatedPrice.price}${adxInfo}${rsiInfo}`);

      return {
        pairCode: pairCode,
        probability: validatedPrice.probability,
        price: validatedPrice.price,
        tp: isXAUUSD ? validatedPrice.tp : (result.tp1 || result.tp), // Preserve tp1 for crypto
        tp1: result.tp1 || null,
        tp2: result.tp2 || null,
        sl: result.sl || validatedPrice.sl,
        source: validatedPrice.source,
        isValid: validatedPrice.isValid,
        // Pass through fields from Python model
        signal: result.signal || null,
        confidence: result.confidence || null,
        score: result.score || null,
        adx: result.adx || null,
        rsi: result.rsi || null,
        message: result.message || null
      };
    } catch (error) {
      logger.error(`❌ Technical analysis for ${pairCode} failed: ${error.message}`);
      // ... (rest uses cached status which might be pair-agnostic for now)
      return {
        pairCode,
        probability: 0.5,
        price: 0,
        tp: 0,
        sl: 0,
        source: 'error-default',
        isValid: false,
        error: error.message
      };
    }
  }
}

module.exports = new TechnicalAnalysisService();