const pythonBridge = require('../models/pythonBridge');
const priceValidation = require('./priceValidation');
const logger = require('../utils/logger');

class TechnicalAnalysisService {
  constructor() {
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
    this.timeout = 30000; // 30 seconds
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
  async analyze() {
    try {
      logger.info('Starting technical analysis with safety checks...');

      // Retry logic: attempt up to 3 times
      let result = await this.retry(async () => {
        return await this.executeWithTimeout(
          pythonBridge.getTechnicalAnalysis(),
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
      const validatedPrice = priceValidation.getPriceWithFallback(priceData);

      // Log validation result
      if (!validatedPrice.isValid && validatedPrice.source === 'cached') {
        logger.warn(`⚠️ Using fallback cached price due to: ${validatedPrice.errors.join(', ')}`);
      }

      return {
        probability: validatedPrice.probability,
        price: validatedPrice.price,
        tp: validatedPrice.tp,
        sl: validatedPrice.sl,
        source: validatedPrice.source,
        isValid: validatedPrice.isValid
      };
    } catch (error) {
      logger.error(`❌ Technical analysis failed after retries: ${error.message}`);

      // Try to use fallback cache
      const cachedStatus = priceValidation.getStatus();
      if (cachedStatus.hasCachedPrice) {
        logger.warn(`⚠️ Using emergency fallback cache: $${cachedStatus.lastValidPrice}`);
        return {
          probability: 0.5,
          price: cachedStatus.lastValidPrice,
          tp: cachedStatus.lastValidTP,
          sl: cachedStatus.lastValidSL,
          source: 'fallback-cache',
          isValid: false
        };
      }

      // No cache available - return safe defaults
      return {
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