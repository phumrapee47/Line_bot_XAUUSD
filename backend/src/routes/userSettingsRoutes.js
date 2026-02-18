const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Database disabled for development - return mock data

// Get all available trading pairs
router.get('/trading-pairs', async (req, res) => {
  try {
    const pairs = [
      { id: 1, symbol: 'XAUUSD', name: 'Gold/USD', modelAvailable: true },
      { id: 2, symbol: 'EURUSD', name: 'EUR/USD', modelAvailable: true },
      { id: 3, symbol: 'GBPUSD', name: 'GBP/USD', modelAvailable: true }
    ];
    res.json({
      success: true,
      data: pairs
    });
  } catch (error) {
    logger.error('Error fetching trading pairs:', error);
    res.status(500).json({
      success: false,
      error: 'Database disabled in development mode'
    });
  }
});

// Get user settings - stub response (database disabled)
router.get('/users/:userId', async (req, res) => {
  res.status(503).json({
    success: false,
    error: 'Database disabled in development mode - Telegram/LINE notifications ready'
  });
});

// Save user settings - stub response (database disabled)
router.post('/users/:userId/settings', async (req, res) => {
  res.status(503).json({
    success: false,
    error: 'Database disabled in development mode'
  });
});

// Reset user settings - stub response (database disabled)
router.post('/users/:userId/settings/reset', async (req, res) => {
  res.status(503).json({
    success: false,
    error: 'Database disabled in development mode'
  });
});

module.exports = router;
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
    logger.error('Error fetching user settings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Save all user settings (pairs, preferences, parameters)
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
        firstName: 'User',
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
          tradingPairId: pair.tradingPairId,
          buyThreshold: pair.buyThreshold || 50,
          sellThreshold: pair.sellThreshold || 50,
          tpMultiplier: pair.tpMultiplier || null,
          slMultiplier: pair.slMultiplier || null
        });
      }
    }

    // Update notification preferences
    if (notificationPreferences) {
      const [prefs] = await UserNotificationPreferences.findOrCreate({
        where: { userId: user.id },
        defaults: {
          userId: user.id,
          lineEnabled: true,
          telegramEnabled: false,
          buySignalsEnabled: true,
          sellSignalsEnabled: true,
          quietHoursEnabled: false,
          quietHourStart: '22:00',
          quietHourEnd: '06:00',
          frequency: 'instant'
        }
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
        defaults: {
          userId: user.id,
          rsiPeriod: 14,
          smaShort: 20,
          smaLong: 50,
          atrPeriod: 7,
          rsiWeight: 0.3,
          smaWeight: 0.2
        }
      });

      await params.update({
        rsiPeriod: tradingParameters.rsiPeriod || 14,
        smaShort: tradingParameters.smaShort || 20,
        smaLong: tradingParameters.smaLong || 50,
        atrPeriod: tradingParameters.atrPeriod || 7,
        rsiWeight: tradingParameters.rsiWeight || 0.3,
        smaWeight: tradingParameters.smaWeight || 0.2
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
    logger.error('Error saving user settings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Reset user settings to defaults
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
        smaWeight: 0.2
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
    logger.error('Error resetting user settings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
