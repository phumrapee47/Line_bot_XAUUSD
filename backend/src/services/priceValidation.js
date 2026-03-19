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
    this.priceCache = {}; // Object indexed by pairCode
    this.priceChangeThreshold = 0.50; // increased to 50% for crypto flexibility
    
    // Default ranges
    this.ranges = {
      'XAUUSD': { min: 1000, max: 10000 },
      'DEFAULT': { min: 0.0000001, max: 10000000 }
    };
    
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
        this.priceCache = JSON.parse(data);
        logger.info(`✓ Loaded price cache for ${Object.keys(this.priceCache).length} pairs`);
      }
    } catch (error) {
      logger.warn(`Could not load price cache: ${error.message}`);
    }
  }

  /**
   * Save current prices to cache
   */
  savePriceCache(pairCode, price, tp, sl) {
    try {
      const cacheDir = path.dirname(this.cachePath);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      this.priceCache[pairCode] = {
        price: price,
        tp: tp,
        sl: sl,
        timestamp: new Date().toISOString()
      };

      fs.writeFileSync(this.cachePath, JSON.stringify(this.priceCache, null, 2));
    } catch (error) {
      logger.error(`Could not save price cache: ${error.message}`);
    }
  }

  /**
   * Get range for a pair
   */
  getRange(pairCode) {
    return this.ranges[pairCode] || this.ranges['DEFAULT'];
  }

  /**
   * Validate price is within acceptable range
   */
  isValidPrice(pairCode, price) {
    if (typeof price !== 'number') {
      logger.warn(`⚠️ [${pairCode}] Invalid price type: ${typeof price}`);
      return false;
    }

    if (price <= 0 || price === null || price === undefined) {
      logger.warn(`⚠️ [${pairCode}] Invalid price value: ${price} (must be > 0)`);
      return false;
    }

    const range = this.getRange(pairCode);
    if (price < range.min || price > range.max) {
      logger.warn(`⚠️ [${pairCode}] Price out of range: $${price} (expected $${range.min}-$${range.max})`);
      return false;
    }

    return true;
  }

  /**
   * Detect anomalous price changes
   */
  isAnomalousChange(pairCode, newPrice) {
    const cached = this.priceCache[pairCode];
    if (!cached || !cached.price) {
      return false; // First price for this pairCode, can't compare
    }

    const changePercent = Math.abs((newPrice - cached.price) / cached.price);

    if (changePercent > this.priceChangeThreshold) {
      logger.warn(`⚠️ [${pairCode}] Anomalous price change detected: $${cached.price} → $${newPrice} (${(changePercent * 100).toFixed(2)}%)`);
      return true;
    }

    return false;
  }

  /**
   * Validate complete price data object
   */
  validatePriceData(pairCode, priceData) {
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
    if (!this.isValidPrice(pairCode, price)) {
      result.isValid = false;
      result.errors.push(`Invalid price: $${price}`);
    }

    // Validate TP and SL are reasonable (allow null for HOLD signals)
    if (tp !== null && tp !== undefined && typeof tp !== 'number') {
      result.errors.push(`Invalid TP: ${tp}`);
      result.isValid = false;
    }

    if (sl !== null && sl !== undefined && typeof sl !== 'number') {
      result.errors.push(`Invalid SL: ${sl}`);
      result.isValid = false;
    }

    // Validate probability (allow null/undefined for crypto)
    if (probability !== null && probability !== undefined && (typeof probability !== 'number' || probability < 0 || probability > 1)) {
      result.errors.push(`Invalid probability: ${probability}`);
      result.isValid = false;
    }

    // Check for anomalies
    if (this.isAnomalousChange(pairCode, price)) {
      result.warnings.push('Anomalous price change detected');
      // If crypto, we might allow it anyway but flag it
      if (pairCode === 'XAUUSD') {
        result.isValid = false; // Be strict with Gold
      }
    }

    return result;
  }

  /**
   * Get price with fallback - use cache if current is invalid
   */
  getPriceWithFallback(pairCode, priceData) {
    const validation = this.validatePriceData(pairCode, priceData);

    if (validation.isValid) {
      // All good, save and return
      this.savePriceCache(pairCode, priceData.price, priceData.tp, priceData.sl);
      return {
        ...priceData,
        source: 'live',
        isValid: true
      };
    }

    // Invalid - check if we have cached price for THIS pair
    const cached = this.priceCache[pairCode];
    if (cached && cached.price > 0) {
      logger.warn(`⚠️ [${pairCode}] Current price invalid, using cached price: $${cached.price}`);
      
      return {
        price: cached.price,
        tp: cached.tp,
        sl: cached.sl,
        probability: priceData.probability || 0.5,
        source: 'cached',
        isValid: false,
        errors: validation.errors,
        warnings: validation.warnings,
        cachedAt: cached.timestamp
      };
    }

    // No fallback available - return invalid but log clearly
    logger.error(`❌ [${pairCode}] CRITICAL: No valid price available`);
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
      cacheSize: Object.keys(this.priceCache).length,
      pairs: Object.keys(this.priceCache),
      ranges: this.ranges,
      priceChangeThreshold: this.priceChangeThreshold
    };
  }
}

module.exports = new PriceValidationService();
