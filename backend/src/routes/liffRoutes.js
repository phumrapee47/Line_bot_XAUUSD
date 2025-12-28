const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const logger = require('../utils/logger');

// Get user profile with parameters
router.get('/user/profile', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const userData = await userService.getUserWithParams(userId);
    
    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    logger.error(`Error getting user profile: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get user parameters
router.get('/parameters', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const params = await userService.getUserParameters(userId);
    
    if (!params) {
      return res.status(404).json({ error: 'Parameters not found' });
    }

    res.json({
      success: true,
      data: params
    });
  } catch (error) {
    logger.error(`Error getting parameters: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Save user parameters
router.post('/parameters', async (req, res) => {
  try {
    const { userId, parameters } = req.body;
    
    if (!userId || !parameters) {
      return res.status(400).json({ error: 'userId and parameters are required' });
    }

    // Validate parameters
    const validParams = {
      rsiPeriod: parameters.rsi_period || parameters.rsiPeriod,
      smaShort: parameters.sma_short || parameters.smaShort,
      smaLong: parameters.sma_long || parameters.smaLong,
      atrPeriod: parameters.atr_period || parameters.atrPeriod,
      rsiWeight: parameters.rsi_weight || parameters.rsiWeight,
      smaWeight: parameters.sma_weight || parameters.smaWeight,
      tpMultiplier: parameters.tp_multiplier || parameters.tpMultiplier,
      slMultiplier: parameters.sl_multiplier || parameters.slMultiplier,
      historyPeriod: parameters.history_period || parameters.historyPeriod
    };

    const saved = await userService.updateUserParameters(userId, validParams);
    res.json({
      success: true,
      data: saved,
      message: 'Parameters updated successfully'
    });
  } catch (error) {
    logger.error(`Error saving parameters: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Reset parameters to default
router.post('/parameters/reset', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const reset = await userService.resetUserParameters(userId);
    res.json({
      success: true,
      data: reset,
      message: 'Parameters reset to default'
    });
  } catch (error) {
    logger.error(`Error resetting parameters: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Sync LINE user profile
router.post('/user/sync', async (req, res) => {
  try {
    const { lineUserId, profile } = req.body;
    
    if (!lineUserId) {
      return res.status(400).json({ error: 'lineUserId is required' });
    }

    const result = await userService.syncLineUser(lineUserId, profile || {});
    res.json({
      success: true,
      data: {
        user: result.user.toJSON(),
        params: result.params.toJSON(),
        isNewUser: result.created
      }
    });
  } catch (error) {
    logger.error(`Error syncing user: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;