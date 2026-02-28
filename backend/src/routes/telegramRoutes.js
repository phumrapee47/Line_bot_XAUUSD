const express = require('express');
const TelegramSubscriber = require('../models/TelegramSubscriber');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * POST /api/telegram/subscribe
 * ให้ user subscribe เพื่อรับข้อความจากบอท
 */
router.post('/subscribe', async (req, res) => {
  try {
    const { telegramUserId, firstName, lastName, username } = req.body;

    // Validation
    if (!telegramUserId) {
      return res.status(400).json({
        success: false,
        error: 'telegramUserId is required'
      });
    }

    // Check if already exists
    const existing = await TelegramSubscriber.findOne({
      where: { telegramUserId },
      raw: true
    });

    if (existing) {
      // If exists but inactive, activate
      if (!existing.is_active) {
        await TelegramSubscriber.update(
          { isActive: true, updatedAt: new Date() },
          { where: { telegramUserId } }
        );
        logger.info(`✅ Telegram user ${telegramUserId} reactivated`);
        return res.json({
          success: true,
          message: 'Reactivated subscription',
          data: { telegramUserId }
        });
      }
      // Already active
      return res.json({
        success: true,
        message: 'Already subscribed',
        data: { telegramUserId }
      });
    }

    // Create new subscriber
    const subscriber = await TelegramSubscriber.create({
      telegramUserId,
      firstName: firstName || null,
      lastName: lastName || null,
      username: username || null,
      isActive: true
    });

    logger.info(`✅ New Telegram subscriber: ${telegramUserId}`);
    res.json({
      success: true,
      message: 'Subscription successful',
      data: subscriber
    });
  } catch (error) {
    logger.error(`Subscribe error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/telegram/unsubscribe
 * ให้ user unsubscribe (ยังเก็บข้อมูล แต่ไม่ส่งข้อความ)
 */
router.post('/unsubscribe', async (req, res) => {
  try {
    const { telegramUserId } = req.body;

    if (!telegramUserId) {
      return res.status(400).json({
        success: false,
        error: 'telegramUserId is required'
      });
    }

    const subscriber = await TelegramSubscriber.findOne({
      where: { telegramUserId }
    });

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        error: 'Subscriber not found'
      });
    }

    await subscriber.update({ isActive: false });
    logger.info(`⏹️ Telegram user ${telegramUserId} unsubscribed`);

    res.json({
      success: true,
      message: 'Unsubscription successful',
      data: { telegramUserId }
    });
  } catch (error) {
    logger.error(`Unsubscribe error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/telegram/status/:telegramUserId
 * ดูสถานะ subscription ของ user
 */
router.get('/status/:telegramUserId', async (req, res) => {
  try {
    const { telegramUserId } = req.params;

    const subscriber = await TelegramSubscriber.findOne({
      where: { telegramUserId },
      raw: true
    });

    if (!subscriber) {
      return res.json({
        success: true,
        subscribed: false,
        message: 'Not subscribed'
      });
    }

    res.json({
      success: true,
      subscribed: subscriber.is_active,
      data: {
        telegramUserId: subscriber.telegram_user_id,
        firstName: subscriber.first_name,
        lastName: subscriber.last_name,
        username: subscriber.username,
        isActive: subscriber.is_active,
        subscriptionDate: subscriber.subscription_date,
        lastMessageDate: subscriber.last_message_date
      }
    });
  } catch (error) {
    logger.error(`Status check error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/telegram/subscribers
 * ดูจำนวน subscribers ทั้งหมด (ADMIN ONLY)
 */
router.get('/subscribers', async (req, res) => {
  try {
    const total = await TelegramSubscriber.count();
    const active = await TelegramSubscriber.count({
      where: { isActive: true }
    });
    const inactive = await TelegramSubscriber.count({
      where: { isActive: false }
    });

    res.json({
      success: true,
      total,
      active,
      inactive,
      percentage: ((active / total) * 100).toFixed(2) + '%'
    });
  } catch (error) {
    logger.error(`Subscribers count error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/telegram/list
 * ดูรายชื่อ subscribers ทั้งหมด (ADMIN ONLY)
 */
router.get('/list', async (req, res) => {
  try {
    const subscribers = await TelegramSubscriber.findAll({
      attributes: ['id', 'telegram_user_id', 'first_name', 'last_name', 'username', 'is_active', 'subscription_date'],
      order: [['subscription_date', 'DESC']],
      raw: true
    });

    res.json({
      success: true,
      count: subscribers.length,
      data: subscribers
    });
  } catch (error) {
    logger.error(`Subscribers list error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/telegram/delete/:telegramUserId
 * ลบ subscriber ออกจากฐานข้อมูล (ADMIN ONLY)
 */
router.delete('/delete/:telegramUserId', async (req, res) => {
  try {
    const { telegramUserId } = req.params;

    const deleted = await TelegramSubscriber.destroy({
      where: { telegramUserId }
    });

    if (deleted === 0) {
      return res.status(404).json({
        success: false,
        error: 'Subscriber not found'
      });
    }

    logger.info(`🗑️ Telegram user ${telegramUserId} deleted`);
    res.json({
      success: true,
      message: 'Subscriber deleted',
      data: { telegramUserId }
    });
  } catch (error) {
    logger.error(`Delete subscriber error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/telegram/generate-link-code
 * LINE user ขอรหัสเพื่อเชื่อมต่อ Telegram
 */
router.post('/generate-link-code', async (req, res) => {
  try {
    const { lineUserId } = req.body;
    if (!lineUserId) {
      return res.status(400).json({ success: false, error: 'lineUserId is required' });
    }

    const linkHandler = require('../services/linkHandler');
    const { code, expiresAt } = await linkHandler.generateCode(lineUserId);

    res.json({
      success: true,
      data: { code, expiresAt }
    });
  } catch (error) {
    logger.error(`Generate link code error for ${req.body.lineUserId}: ${error.stack}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/telegram/link-status/:lineUserId
 * ตรวจสอบสถานะการเชื่อมต่อ Telegram
 */
router.get('/link-status/:lineUserId', async (req, res) => {
  try {
    const { lineUserId } = req.params;
    const linkHandler = require('../services/linkHandler');
    const status = await linkHandler.getLinkStatus(lineUserId);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error(`Get link status error for ${req.params.lineUserId}: ${error.stack}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/telegram/unlink
 * ยกเลิกการเชื่อมต่อ Telegram
 */
router.post('/unlink', async (req, res) => {
  try {
    const { lineUserId } = req.body;
    if (!lineUserId) {
      return res.status(400).json({ success: false, error: 'lineUserId is required' });
    }

    const linkHandler = require('../services/linkHandler');
    const result = await linkHandler.unlinkTelegram(lineUserId);

    res.json(result);
  } catch (error) {
    logger.error(`Unlink error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
