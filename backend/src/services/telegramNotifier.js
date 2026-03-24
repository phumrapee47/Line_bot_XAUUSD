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
        const status = error.response.status;
        const description = error.response.data?.description || '';
        logger.error(`Telegram API Error: ${status} - ${description}`);

        // If user blocked the bot or chat not found, deactivate them
        if (status === 400 && (description.includes('chat not found') || description.includes('bot was blocked'))) {
          try {
            const TelegramSubscriber = require('../models/TelegramSubscriber');
            await TelegramSubscriber.update({ isActive: false }, { where: { telegram_user_id: userId.toString() } });
            logger.warn(`🚫 User ${userId} has blocked/deleted the bot. Deactivated in database.`);
          } catch (dbErr) {
            logger.error(`Failed to deactivate Telegram user ${userId}: ${dbErr.message}`);
          }
        }
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

  async sendTradingSignal(signalData, userIds = null) {
    // Safety check: Prevent sending $0.00 signals (same as LINE)
    if (signalData.price === 0 || signalData.price === undefined || signalData.price === null) {
      logger.error('❌ TELEGRAM BLOCKED: Cannot send signal - price is $0.00 or undefined');
      return false;
    }

    const isXAUUSD = signalData.pairCode === 'XAUUSD';
    const conf = typeof signalData.confidence === 'number'
      ? (signalData.confidence > 1 ? signalData.confidence : signalData.confidence * 100).toFixed(2)
      : '0.00';
    const techScore = typeof signalData.technicalProb === 'number'
      ? (signalData.technicalProb * 100).toFixed(2) : conf;
    
    const pairName = signalData.symbol || signalData.pairCode || 'Unknown';

    // Use custom message from model if available (e.g. for Crypto)
    let message = signalData.message;
    
    if (!message) {
      const formatPrice = (p) => {
        const val = Number(p);
        if (isNaN(val) || val === 0) return 'N/A';
        if (val >= 100) return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (val >= 1) return `$${val.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
        if (val >= 0.0001) return `$${val.toFixed(6)}`;
        return `$${val.toFixed(8)}`;
      };

      const tp = formatPrice(signalData.tp);
      const sl = formatPrice(signalData.sl);
      const price = formatPrice(signalData.price);
      const newsLine = isXAUUSD
        ? `📰 News Score: ${signalData.newsScore ? (signalData.newsScore * 100).toFixed(2) : '0.00'}%\n`
        : '';
        
      const notesLine = (signalData.notes && signalData.notes.length > 0)
        ? `\n📌 Notes:\n${signalData.notes.join('\n')}\n`
        : '';

      message = (
`🔔 <b>${pairName} Trading Signal</b> 🔔\n` +
`━━━━━━━━━━━━━━━━━━\n` +
`Signal: ${signalData.signal}\n` +
`Confidence: ${conf}%\n\n` +
`📊 Technical Score: ${techScore}%\n` +
newsLine +
`\n💰 Entry: ${price}\n` +
`🎯 Take Profit: ${tp}\n` +
`🛡️ Stop Loss: ${sl}\n` +
notesLine +
`\n⏰ Time: ${new Date(signalData.timestamp).toLocaleString('th-TH')}\n` +
`━━━━━━━━━━━━━━━━━━`
      );
    }

    if (Array.isArray(userIds)) {
      if (userIds.length > 0) {
        return await this.sendToMultipleUsers(message, userIds);
      } else {
        logger.info('No Telegram users targeted for this signal, skipping notification.');
        return [];
      }
    } else {
      return await this.sendMessage(message);
    }
  }

  /**
   * Handle incoming updates from Telegram Webhook
   * @param {Object} update 
   */
  async handleWebhook(update) {
    try {
      if (!update.message || !update.message.text) return;

      const message = update.message;
      const text = message.text.trim();
      const chatId = message.chat.id;

      // Handle /link <CODE>
      if (text.startsWith('/link')) {
        const parts = text.split(' ');
        if (parts.length < 2) {
          await this.sendTelegramMessage('⚠️ Please provide the link code. Format: <code>/link 123456</code>', chatId);
          return;
        }

        const code = parts[1];
        const linkHandler = require('./linkHandler');
        const result = await linkHandler.verifyCode(code, {
          id: message.from.id,
          username: message.from.username,
          first_name: message.from.first_name,
          last_name: message.from.last_name
        });

        if (result.success) {
          await this.sendTelegramMessage(`✅ <b>Success!</b>\nYour Telegram account has been linked to your LINE account.\nYou will now receive trading signals here.`, chatId);
        } else {
          await this.sendTelegramMessage(`❌ <b>Linking Failed</b>\n${result.message}`, chatId);
        }
      } else if (text === '/start') {
        await this.sendTelegramMessage('👋 Welcome to the Gold Trading Bot!\nTo link your account, please go to the LINE bot settings and request a link code, then type <code>/link YOUR_CODE</code> here.', chatId);
      }
    } catch (error) {
      logger.error(`Error in Telegram handleWebhook: ${error.message}`);
    }
  }
}


module.exports = new TelegramNotifier();
