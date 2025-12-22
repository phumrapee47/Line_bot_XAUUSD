require('dotenv').config();

module.exports = {
  // LINE Configuration (Messaging API - Broadcast or Push)
  line: {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
    userId: process.env.LINE_USER_ID || null,  // Optional - ส่งไปเฉพาะคนนี้ถ้ากำหนด
    useBroadcast: process.env.USE_BROADCAST !== 'false'  // Default = true (ส่งให้ทุกคน)
  },

  // Model Configuration
  models: {
    technicalModelPath: process.env.TECHNICAL_MODEL_PATH,
    technicalWeight: parseFloat(process.env.TECHNICAL_WEIGHT) || 0.6,
    newsWeight: parseFloat(process.env.NEWS_WEIGHT) || 0.4
  },

  // Trading Configuration
  trading: {
    buyThreshold: parseFloat(process.env.BUY_THRESHOLD) || 0.60,
    sellThreshold: parseFloat(process.env.SELL_THRESHOLD) || 0.40
  },

  // Scheduler Configuration
  scheduler: {
    checkInterval: parseInt(process.env.CHECK_INTERVAL_MINUTES) || 60,
    cronExpression: `*/${parseInt(process.env.CHECK_INTERVAL_MINUTES) || 60} * * * *`
  },

  // News Configuration
  news: {
    rssUrl: process.env.NEWS_RSS_URL
  },

  // Server Configuration
  server: {
    port: parseInt(process.env.PORT) || 3000
  }
};