const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

class TelegramNotifier {
  constructor() {
    this.botToken = config.telegram.botToken;
    this.enabled = config.telegram.enabled || false;
    this.userId = process.env.TELEGRAM_USER_ID;

    // Log token status for debugging
    if (!this.botToken) {
      logger.warn('⚠️ TELEGRAM_BOT_TOKEN is not set!');
    }
    if (!this.userId) {
      logger.warn('⚠️ TELEGRAM_USER_ID is not set!');
    }
  }

  async sendMessage(message) {
    try {
      if (!this.enabled || !this.botToken) {
        logger.debug('Telegram notifier is disabled or not configured');
        return false;
      }

      let userIds = [];

      // Try to get subscribers from database
      try {
        const TelegramSubscriber = require('../models/TelegramSubscriber');
        const subscribers = await TelegramSubscriber.findAll({
          where: { isActive: true },
          raw: true,
          attributes: ['telegram_user_id']
        });

        if (subscribers.length > 0) {
          userIds = subscribers.map(s => s.telegram_user_id);
          logger.info(`📤 Found ${userIds.length} active Telegram subscribers from database`);
        }
      } catch (dbError) {
        logger.warn(`Database lookup failed, using fallback: ${dbError.message}`);
        // Fallback to environment variable if database fails
        if (this.userId) {
          userIds = [this.userId];
          logger.info('📤 Using fallback Telegram user ID from environment');
        }
      }

      if (userIds.length === 0) {
        logger.warn('No Telegram user IDs available');
        return false;
      }

      // Send to all subscribers
      const results = await this.sendToMultipleUsers(message, userIds);
      return results.some(r => r); // Return true if at least one succeeded
    } catch (error) {
      logger.error(`Error sending Telegram message: ${error.message}`);
      return false;
    }
  }

  async sendTelegramMessage(message, userId) {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

      const response = await axios.post(
        url,
        {
          chat_id: userId,
          text: message,
          parse_mode: 'HTML'
        },
        {
          timeout: 5000
        }
      );

      if (response.data.ok) {
        logger.info(`✅ Telegram message sent to ${userId}`);
        return true;
      }
      return false;
    } catch (error) {
      if (error.response) {
        logger.error(`Telegram API Error: ${error.response.status} - ${error.response.data?.description || error.message}`);
      } else {
        logger.error(`Telegram Connection Error: ${error.message}`);
      }
      return false;
    }
  }

  // ส่งข้อความเข้าหลายๆ user
  async sendToMultipleUsers(message, userIds) {
    try {
      if (!userIds || userIds.length === 0) {
        return [];
      }

      logger.info(`📤 Sending message to ${userIds.length} Telegram users...`);
      
      const promises = userIds.map(userId =>
        this.sendTelegramMessage(message, userId).catch(err => {
          logger.error(`Failed to send to ${userId}: ${err.message}`);
          return false;
        })
      );

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r).length;
      logger.info(`✅ Sent successfully to ${successCount}/${userIds.length} Telegram users`);
      return results;
    } catch (error) {
      logger.error(`Error sending to multiple users: ${error.message}`);
      return [];
    }
  }

  getStatus() {
    return {
      enabled: this.enabled,
      hasToken: !!this.botToken,
      hasUserId: !!this.userId,
      configured: this.enabled && !!this.botToken
    };
  }

  async sendTradingSignal(signalData) {
    // Safety check: Prevent sending $0.00 signals (same as LINE)
    if (signalData.price === 0 || signalData.price === undefined || signalData.price === null) {
      logger.error('❌ TELEGRAM BLOCKED: Cannot send signal - price is $0.00 or undefined');
      return false;
    }

    if (signalData.tp === 0 || signalData.tp === undefined || signalData.tp === null) {
      logger.error('❌ TELEGRAM BLOCKED: Cannot send signal - TP is $0.00 or undefined');
      return false;
    }

    if (signalData.sl === 0 || signalData.sl === undefined || signalData.sl === null) {
      logger.error('❌ TELEGRAM BLOCKED: Cannot send signal - SL is $0.00 or undefined');
      return false;
    }

    const message = `
🔔 <b>Gold Trading Signal</b> 🔔
━━━━━━━━━━━━━━━━━━
Signal: ${signalData.signal}
Confidence: ${(signalData.confidence * 100).toFixed(2)}%

📊 Technical Score: ${(signalData.technicalProb * 100).toFixed(2)}%
📰 News Score: ${(signalData.newsScore * 100).toFixed(2)}%

💰 Current Price: $${signalData.price.toFixed(2)}
🎯 Take Profit: $${signalData.tp.toFixed(2)}
🛡️ Stop Loss: $${signalData.sl.toFixed(2)}

⏰ Time: ${new Date(signalData.timestamp).toLocaleString('th-TH')}
━━━━━━━━━━━━━━━━━━`;

    logger.info(`✓ Sending valid Telegram trading signal - Price: $${signalData.price.toFixed(2)}`);
    return await this.sendMessage(message);
  }
}


module.exports = new TelegramNotifier();
