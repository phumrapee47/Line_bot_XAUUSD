/**
 * Health Check Routes
 * Provides endpoints to monitor system health and diagnose issues
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const priceValidation = require('../services/priceValidation');
const technicalAnalysis = require('../services/technicalAnalysis');
const newsAnalysis = require('../services/newsAnalysis');
const tradingSignal = require('../services/tradingSignal');

/**
 * GET /health
 * Basic system health check
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: {
      platform: process.platform,
      nodeVersion: process.version
    }
  });
});

/**
 * GET /health/prices
 * Check price validation status and cached prices
 */
router.get('/health/prices', (req, res) => {
  const status = priceValidation.getStatus();
  res.json({
    status: 'ok',
    priceValidation: status,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /health/signal
 * Generate a test signal and return result (doesn't send to LINE)
 */
router.get('/health/signal', async (req, res) => {
  try {
    logger.info('Health check: Generating test signal...');

    const signal = await tradingSignal.generateSignal();

    if (!signal) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to generate signal',
        timestamp: new Date().toISOString()
      });
    }

    // Check if signal contains valid prices
    const validation = {
      priceValid: signal.price > 0,
      tpValid: signal.tp > 0,
      slValid: signal.sl > 0,
      confidenceValid: signal.confidence >= 0 && signal.confidence <= 1
    };

    const allValid = Object.values(validation).every(v => v === true);

    res.json({
      status: allValid ? 'ok' : 'warning',
      signal: signal,
      validation: validation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Health check error: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /health/technical
 * Test technical analysis directly
 */
router.get('/health/technical', async (req, res) => {
  try {
    logger.info('Health check: Testing technical analysis...');

    const result = await technicalAnalysis.analyze();

    const validation = {
      priceValid: result.price > 0,
      tpValid: result.tp > 0,
      slValid: result.sl > 0,
      probabilityValid: result.probability >= 0 && result.probability <= 1
    };

    const allValid = Object.values(validation).every(v => v === true);

    res.json({
      status: allValid ? 'ok' : 'warning',
      result: result,
      validation: validation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Technical analysis health check error: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /health/news
 * Test news analysis directly
 */
router.get('/health/news', async (req, res) => {
  try {
    logger.info('Health check: Testing news analysis...');

    const result = await newsAnalysis.analyze();

    const validation = {
      scoreValid: result.score >= 0 && result.score <= 1
    };

    const allValid = Object.values(validation).every(v => v === true);

    res.json({
      status: allValid ? 'ok' : 'warning',
      result: result,
      validation: validation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`News analysis health check error: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /health/full
 * Complete system health check
 */
router.get('/health/full', async (req, res) => {
  try {
    logger.info('Health check: Running full system check...');

    const checks = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      prices: priceValidation.getStatus(),
      technical: null,
      news: null,
      signal: null,
      overallStatus: 'ok'
    };

    // Test technical
    try {
      checks.technical = await technicalAnalysis.analyze();
      if (!checks.technical || checks.technical.price === 0) {
        checks.overallStatus = 'warning';
      }
    } catch (error) {
      checks.technical = { error: error.message };
      checks.overallStatus = 'warning';
    }

    // Test news
    try {
      checks.news = await newsAnalysis.analyze();
    } catch (error) {
      checks.news = { error: error.message };
      checks.overallStatus = 'warning';
    }

    // Test signal generation
    try {
      checks.signal = await tradingSignal.generateSignal();
      if (!checks.signal || checks.signal.price === 0) {
        checks.overallStatus = 'warning';
      }
    } catch (error) {
      checks.signal = { error: error.message };
      checks.overallStatus = 'error';
    }

    const statusCode = checks.overallStatus === 'error' ? 500 : checks.overallStatus === 'warning' ? 206 : 200;
    res.status(statusCode).json(checks);
  } catch (error) {
    logger.error(`Full health check error: ${error.message}`);
    res.status(500).json({
      overallStatus: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
