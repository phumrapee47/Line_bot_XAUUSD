const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const logger = require('../utils/logger');

// Get LIFF configuration (public endpoint)
router.get('/config', (req, res) => {
  try {
    const liffId = process.env.LIFF_ID;
    
    if (!liffId) {
      return res.status(500).json({ 
        success: false, 
        error: 'LIFF_ID not configured' 
      });
    }

    res.json({
      success: true,
      liffId: liffId
    });
  } catch (error) {
    logger.error(`Error getting LIFF config: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get user profile with parameters and subscription status
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

    // Include subscription info
    res.json({
      success: true,
      data: {
        ...userData,
        subscriptionType: userData.user.subscriptionType || 'unsubscription'
      }
    });
  } catch (error) {
    logger.error(`Error getting user profile: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Save user parameters (Restricted)
router.post('/parameters', async (req, res) => {
  try {
    res.status(403).json({
      success: false,
      error: 'การปรับแต่งพารามิเตอร์ถูกระงับ (Parameter editing is restricted)'
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