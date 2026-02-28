const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { 
  User, 
  UserTradingPair, 
  TradingPair, 
  UserNotificationPreferences, 
  UserTradingParameters 
} = require('../models');

/**
 * GET /api/trading-pairs
 * Get all available trading pairs
 */
router.get('/trading-pairs', async (req, res) => {
  try {
    const pairs = await TradingPair.findAll({
      where: { isActive: true }
    });
    
    // Fallback if no pairs in DB yet
    if (pairs.length === 0) {
      return res.json({
        success: true,
        data: [
          { id: 1, pairCode: 'XAUUSD', pairName: 'Gold/USD', assetType: 'commodity', modelAvailable: true }
        ]
      });
    }

    res.json({
      success: true,
      data: pairs
    });
  } catch (error) {
    logger.error('Error fetching trading pairs:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/users/:userId
 * Get user settings including pairs, notifications and parameters
 */
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({
      where: { lineUserId: userId },
      include: [
        { model: UserTradingPair, include: [TradingPair] },
        { model: UserNotificationPreferences },
        { model: UserTradingParameters }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error(`Error fetching user settings for ${req.params.userId}:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/users/:userId/settings
 * Save all user settings (pairs, preferences, parameters)
 */
router.post('/users/:userId/settings', async (req, res) => {
  try {
    const { userId } = req.params;
    const { tradingPairs, notificationPreferences, tradingParameters } = req.body;

    let user = await User.findOne({
      where: { lineUserId: userId }
    });

    if (!user) {
      user = await User.create({
        lineUserId: userId,
        displayName: 'User',
        isActive: true
      });
    }

    // Update trading pairs
    if (tradingPairs && Array.isArray(tradingPairs)) {
      // Remove old selections
      await UserTradingPair.destroy({
        where: { userId: user.id }
      });

      // Add new selections
      for (const pair of tradingPairs) {
        await UserTradingPair.create({
          userId: user.id,
          pairId: pair.tradingPairId || pair.pairId,
          buyThreshold: pair.buyThreshold || 0.50,
          sellThreshold: pair.sellThreshold || 0.50,
          tpMultiplier: pair.tpMultiplier || null,
          slMultiplier: pair.slMultiplier || null
        });
      }
    }

    // Update notification preferences
    if (notificationPreferences) {
      const [prefs] = await UserNotificationPreferences.findOrCreate({
        where: { userId: user.id },
        defaults: { userId: user.id }
      });

      await prefs.update({
        lineEnabled: notificationPreferences.lineEnabled !== false,
        telegramEnabled: notificationPreferences.telegramEnabled !== false,
        buySignalsEnabled: notificationPreferences.buySignals !== false,
        sellSignalsEnabled: notificationPreferences.sellSignals !== false,
        quietHoursEnabled: notificationPreferences.quietHoursEnabled || false,
        quietHourStart: notificationPreferences.quietHourStart || '22:00',
        quietHourEnd: notificationPreferences.quietHourEnd || '06:00',
        frequency: notificationPreferences.frequency || 'instant'
      });
    }

    // Update trading parameters
    if (tradingParameters) {
      const [params] = await UserTradingParameters.findOrCreate({
        where: { userId: user.id },
        defaults: { userId: user.id }
      });

      await params.update({
        rsiPeriod: tradingParameters.rsiPeriod || 14,
        smaShort: tradingParameters.smaShort || 20,
        smaLong: tradingParameters.smaLong || 50,
        atrPeriod: tradingParameters.atrPeriod || 7,
        rsiWeight: tradingParameters.rsiWeight || 0.3,
        smaWeight: tradingParameters.smaWeight || 0.2,
        tpMultiplier: tradingParameters.tpMultiplier || 2.0,
        slMultiplier: tradingParameters.slMultiplier || 1.0,
        historyPeriod: tradingParameters.historyPeriod || '60d'
      });
    }

    const updatedUser = await User.findOne({
      where: { id: user.id },
      include: [
        { model: UserTradingPair, include: [TradingPair] },
        { model: UserNotificationPreferences },
        { model: UserTradingParameters }
      ]
    });

    res.json({
      success: true,
      message: 'Settings saved successfully',
      data: updatedUser
    });
  } catch (error) {
    logger.error(`Error saving settings for ${req.params.userId}:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/users/:userId/settings/reset
 * Reset user settings to defaults
 */
router.post('/users/:userId/settings/reset', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({
      where: { lineUserId: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Reset trading pairs (remove all)
    await UserTradingPair.destroy({
      where: { userId: user.id }
    });

    // Reset notification preferences to defaults
    await UserNotificationPreferences.update(
      {
        lineEnabled: true,
        telegramEnabled: false,
        buySignalsEnabled: true,
        sellSignalsEnabled: true,
        quietHoursEnabled: false,
        quietHourStart: '22:00',
        quietHourEnd: '06:00',
        frequency: 'instant'
      },
      { where: { userId: user.id } }
    );

    // Reset trading parameters to defaults
    await UserTradingParameters.update(
      {
        rsiPeriod: 14,
        smaShort: 20,
        smaLong: 50,
        atrPeriod: 7,
        rsiWeight: 0.3,
        smaWeight: 0.2,
        tpMultiplier: 2.0,
        slMultiplier: 1.0
      },
      { where: { userId: user.id } }
    );

    const updatedUser = await User.findOne({
      where: { id: user.id },
      include: [
        { model: UserTradingPair, include: [TradingPair] },
        { model: UserNotificationPreferences },
        { model: UserTradingParameters }
      ]
    });

    res.json({
      success: true,
      message: 'Settings reset to defaults',
      data: updatedUser
    });
  } catch (error) {
    logger.error(`Error resetting settings for ${req.params.userId}:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
