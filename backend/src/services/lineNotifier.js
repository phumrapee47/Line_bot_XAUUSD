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

    const pairName = signalData.pairName || (signalData.pairCode === 'XAUUSD' ? 'Gold' : signalData.pairCode);
    const message = `
🔔 ${pairName} Trading Signal 🔔
━━━━━━━━━━━━━━━━━━
Signal: ${signalData.signal}
Confidence: ${(signalData.confidence * 100).toFixed(2)}%

📊 Technical Score: ${(signalData.technicalProb * 100).toFixed(2)}%
📰 News Score: ${(signalData.newsScore * 100).toFixed(2)}%

💰 Current Price: $${signalData.price.toFixed(2)}
🎯 Take Profit: $${signalData.tp.toFixed(2)}
🛡️ Stop Loss: $${signalData.sl.toFixed(2)}

⏰ Time: ${signalData.timestamp}
━━━━━━━━━━━━━━━━━━
    `.trim();

    if (userIds && userIds.length > 0) {
      return await this.sendToMultipleUsers(message, userIds);
    } else {
      return await this.sendMessage(message);
    }
  }
}

module.exports = new LineNotifier();