const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

class LineNotifier {
  constructor() {
    this.token = config.line.channelAccessToken;
    this.secret = config.line.channelSecret;
    this.userId = config.line.userId;
    this.useBroadcast = config.line.useBroadcast || true;
    
    // Log token status for debugging
    if (!this.token) {
      logger.warn('⚠️ LINE_CHANNEL_ACCESS_TOKEN is not set!');
    }
    if (!this.secret) {
      logger.warn('⚠️ LINE_CHANNEL_SECRET is not set!');
    }
  }

  async sendMessage(message) {
    try {
      // ถ้ากำหนด userId ให้ส่งแบบ Push ไปเฉพาะคนนั้น
      if (this.userId) {
        return await this.sendPushMessage(message, this.userId);
      }
      
      // ถ้าไม่มี userId ให้ใช้ Broadcast (ทุกคนรับ)
      if (this.useBroadcast) {
        return await this.sendBroadcastMessage(message);
      }

      logger.warn('No userId or broadcast configured, skipping notification');
      return false;
    } catch (error) {
      logger.error(`Error sending LINE message: ${error.message}`);
      return false;
    }
  }

  async sendPushMessage(message, userId) {
    try {
      const response = await axios.post(
        'https://api.line.me/v2/bot/message/push',
        {
          to: userId,
          messages: [
            {
              type: 'text',
              text: message
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          }
        }
      );

      if (response.status === 200) {
        logger.info('LINE message sent to user successfully');
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Error sending LINE push message: ${error.message}`);
      return false;
    }
  }

  async sendBroadcastMessage(message) {
    try {
      const response = await axios.post(
        'https://api.line.me/v2/bot/message/broadcast',
        {
          messages: [
            {
              type: 'text',
              text: message
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          }
        }
      );

      if (response.status === 200) {
        logger.info('LINE broadcast message sent to all users');
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Error sending LINE broadcast message: ${error.message}`);
      return false;
    }
  }

  async sendToMultipleUsers(message, userIds) {
    try {
      if (!userIds || userIds.length === 0) {
        return [];
      }

      logger.info(`📤 Sending LINE message to ${userIds.length} users...`);
      
      const promises = userIds.map(userId =>
        this.sendPushMessage(message, userId).catch(err => {
          logger.error(`Failed to send LINE message to ${userId}: ${err.message}`);
          return false;
        })
      );

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r).length;
      logger.info(`✅ Sent successfully to ${successCount}/${userIds.length} LINE users`);
      return results;
    } catch (error) {
      logger.error(`Error sending to multiple LINE users: ${error.message}`);
      return [];
    }
  }

  async sendTradingSignal(signalData, userIds = null) {
    // Safety check: Prevent sending $0.00 signals
    if (signalData.price === 0 || signalData.price === undefined || signalData.price === null) {
      logger.error('❌ BLOCKED: Cannot send signal - price is $0.00 or undefined');
      return false;
    }

    const isXAUUSD = signalData.pairCode === 'XAUUSD';
    const conf = typeof signalData.confidence === 'number'
      ? (signalData.confidence > 1 ? signalData.confidence : signalData.confidence * 100).toFixed(2)
      : '0.00';
    const techScore = typeof signalData.technicalProb === 'number'
      ? (signalData.technicalProb * 100).toFixed(2) : conf;

    // Use custom message from model if available (e.g. for Crypto)
    const message = signalData.message || (() => {
      const tp = signalData.tp ? `$${Number(signalData.tp).toFixed(2)}` : 'N/A';
      const sl = signalData.sl ? `$${Number(signalData.sl).toFixed(2)}` : 'N/A';
      const price = signalData.price ? `$${Number(signalData.price).toFixed(2)}` : 'N/A';
      const newsLine = isXAUUSD
        ? `📰 News Score: ${signalData.newsScore ? (signalData.newsScore * 100).toFixed(2) : '0.00'}%\n`
        : '';
      return (
`🔔 ${pairName} Trading Signal 🔔\n` +
`━━━━━━━━━━━━━━━━━━\n` +
`Signal: ${signalData.signal}\n` +
`Confidence: ${conf}%\n\n` +
`📊 Technical Score: ${techScore}%\n` +
newsLine +
`\n💰 Entry: ${price}\n` +
`🎯 Take Profit: ${tp}\n` +
`🛡️ Stop Loss: ${sl}\n\n` +
`⏰ Time: ${signalData.timestamp}\n` +
`━━━━━━━━━━━━━━━━━━`
      );
    })();

    if (userIds && userIds.length > 0) {
      return await this.sendToMultipleUsers(message, userIds);
    } else {
      return await this.sendMessage(message);
    }
  }
}

module.exports = new LineNotifier();