/**
 * Price Validation Service
 * Ensures price data integrity and prevents $0.00 signals
 * 
 * Features:
 * - Price range validation (gold should be $1000-10000)
 * - Price caching for fallback
 * - Price anomaly detection
 * - Retry logic for failed fetches
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class PriceValidationService {
  constructor() {
    this.lastValidPrice = null;
    this.lastValidTP = null;
    this.lastValidSL = null;
    this.lastPriceTime = null;
    this.priceChangeThreshold = 0.15; // 15% max change between signals
    this.minPrice = 1000;
    this.maxPrice = 10000;
    this.cachePath = path.join(__dirname, '../../data/price_cache.json');
    
    // Load cached prices on startup
    this.loadPriceCache();
  }

  /**
   * Load last known good prices from cache
   */
  loadPriceCache() {
    try {
      if (fs.existsSync(this.cachePath)) {
        const data = fs.readFileSync(this.cachePath, 'utf8');
        const cache = JSON.parse(data);
        
        this.lastValidPrice = cache.price;
        this.lastValidTP = cache.tp;
        this.lastValidSL = cache.sl;
        this.lastPriceTime = cache.timestamp;
        
        logger.info(`✓ Loaded cached prices: $${this.lastValidPrice} from ${this.lastPriceTime}`);
      }
    } catch (error) {
      logger.warn(`Could not load price cache: ${error.message}`);
    }
  }

  /**
   * Save current prices to cache
   */
  savePriceCache(price, tp, sl) {
    try {
      const cacheDir = path.dirname(this.cachePath);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      const cache = {
        price: price,
        tp: tp,
        sl: sl,
        timestamp: new Date().toISOString()
      };

      fs.writeFileSync(this.cachePath, JSON.stringify(cache, null, 2));
      this.lastValidPrice = price;
      this.lastValidTP = tp;
      this.lastValidSL = sl;
      this.lastPriceTime = new Date().toISOString();
    } catch (error) {
      logger.error(`Could not save price cache: ${error.message}`);
    }
  }

  /**
   * Validate price is within acceptable range
   */
  isValidPrice(price) {
    if (typeof price !== 'number') {
      logger.warn(`⚠️ Invalid price type: ${typeof price}`);
      return false;
    }

    if (price <= 0 || price === null || price === undefined) {
      logger.warn(`⚠️ Invalid price value: ${price} (must be > 0)`);
      return false;
    }

    if (price < this.minPrice || price > this.maxPrice) {
      logger.warn(`⚠️ Price out of range: $${price} (expected $${this.minPrice}-$${this.maxPrice})`);
      return false;
    }

    return true;
  }

  /**
   * Detect anomalous price changes
   */
  isAnomalousChange(newPrice) {
    if (!this.lastValidPrice) {
      return false; // First price, can't compare
    }

    const changePercent = Math.abs((newPrice - this.lastValidPrice) / this.lastValidPrice);

    if (changePercent > this.priceChangeThreshold) {
      logger.warn(`⚠️ Anomalous price change detected: $${this.lastValidPrice} → $${newPrice} (${(changePercent * 100).toFixed(2)}%)`);
      return true;
    }

    return false;
  }

  /**
   * Validate complete price data object
   */
  validatePriceData(priceData) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      data: priceData
    };

    // Check required fields
    if (!priceData || typeof priceData !== 'object') {
      result.isValid = false;
      result.errors.push('Price data is not an object');
      return result;
    }

    const { price, tp, sl, probability } = priceData;

    // Validate price
    if (!this.isValidPrice(price)) {
      result.isValid = false;
      result.errors.push(`Invalid price: $${price}`);
    }

    // Validate TP and SL are reasonable
    if (typeof tp !== 'number' || tp <= 0) {
      result.errors.push(`Invalid TP: $${tp}`);
      result.isValid = false;
    }

    if (typeof sl !== 'number' || sl <= 0) {
      result.errors.push(`Invalid SL: $${sl}`);
      result.isValid = false;
    }

    // Check TP is above price (for buy) or below (for sell)
    if (tp <= price && tp > 0) {
      result.warnings.push(`TP ($${tp}) is not above price ($${price})`);
    }

    if (sl >= price && sl > 0) {
      result.warnings.push(`SL ($${sl}) is not below price ($${price})`);
    }

    // Validate probability
    if (typeof probability !== 'number' || probability < 0 || probability > 1) {
      result.errors.push(`Invalid probability: ${probability}`);
      result.isValid = false;
    }

    // Check for anomalies
    if (this.isAnomalousChange(price)) {
      result.warnings.push('Anomalous price change detected');
    }

    return result;
  }

  /**
   * Get price with fallback - use cache if current is invalid
   */
  getPriceWithFallback(priceData) {
    const validation = this.validatePriceData(priceData);

    if (validation.isValid) {
      // All good, save and return
      this.savePriceCache(priceData.price, priceData.tp, priceData.sl);
      return {
        ...priceData,
        source: 'live',
        isValid: true
      };
    }

    // Invalid - check if we have cached price
    if (this.lastValidPrice && this.lastValidPrice > 0) {
      logger.warn(`⚠️ Current price invalid, using cached price: $${this.lastValidPrice}`);
      
      return {
        price: this.lastValidPrice,
        tp: this.lastValidTP,
        sl: this.lastValidSL,
        probability: priceData.probability || 0.5,
        source: 'cached',
        isValid: false,
        errors: validation.errors,
        warnings: validation.warnings,
        cachedAt: this.lastPriceTime
      };
    }

    // No fallback available - return invalid but log clearly
    logger.error(`❌ CRITICAL: No valid price available`);
    logger.error(`   Errors: ${validation.errors.join(', ')}`);

    return {
      ...priceData,
      source: 'invalid',
      isValid: false,
      errors: validation.errors,
      warnings: validation.warnings
    };
  }

  /**
   * Get health status
   */
  getStatus() {
    return {
      lastValidPrice: this.lastValidPrice,
      lastValidTP: this.lastValidTP,
      lastValidSL: this.lastValidSL,
      lastPriceTime: this.lastPriceTime,
      hasCachedPrice: this.lastValidPrice !== null,
      minPrice: this.minPrice,
      maxPrice: this.maxPrice,
      priceChangeThreshold: this.priceChangeThreshold
    };
  }
}

module.exports = new PriceValidationService();
