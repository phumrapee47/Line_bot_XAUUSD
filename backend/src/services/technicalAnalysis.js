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
      });

      // Validate the result
      const priceData = {
        price: result.price,
        tp: result.tp,
        sl: result.sl,
        probability: result.probability
      };

      // Use validation service to check and fallback if needed
      // (Assuming priceValidation supports pair-specific caching or we just use general fallback)
      const validatedPrice = priceValidation.getPriceWithFallback(priceData);

      return {
        pairCode: pairCode,
        probability: validatedPrice.probability,
        price: validatedPrice.price,
        tp: validatedPrice.tp,
        sl: validatedPrice.sl,
        source: validatedPrice.source,
        isValid: validatedPrice.isValid
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