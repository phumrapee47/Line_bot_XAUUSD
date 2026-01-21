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

  async sendTradingSignal(signalData) {
    // Safety check: Prevent sending $0.00 signals
    if (signalData.price === 0 || signalData.price === undefined || signalData.price === null) {
      logger.error('❌ BLOCKED: Cannot send signal - price is $0.00 or undefined');
      logger.error(`   Signal: ${signalData.signal}, TP: ${signalData.tp}, SL: ${signalData.sl}`);
      logger.error(`   This indicates a critical Python script error or network issue`);
      logger.error(`   Full signal data: ${JSON.stringify(signalData)}`);
      return false;
    }

    if (signalData.tp === 0 || signalData.tp === undefined || signalData.tp === null) {
      logger.error('❌ BLOCKED: Cannot send signal - TP is $0.00 or undefined');
      logger.error(`   Price: $${signalData.price}, SL: ${signalData.sl}`);
      return false;
    }

    if (signalData.sl === 0 || signalData.sl === undefined || signalData.sl === null) {
      logger.error('❌ BLOCKED: Cannot send signal - SL is $0.00 or undefined');
      logger.error(`   Price: $${signalData.price}, TP: ${signalData.tp}`);
      return false;
    }

    // Validate confidence
    if (typeof signalData.confidence !== 'number' || signalData.confidence < 0 || signalData.confidence > 1) {
      logger.warn(`⚠️ WARNING: Invalid confidence value: ${signalData.confidence}`);
    }

    const message = `
🔔 Gold Trading Signal 🔔
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

    logger.info(`✓ Sending valid trading signal - Price: $${signalData.price.toFixed(2)}`);
    return await this.sendMessage(message);
  }
}

module.exports = new LineNotifier();