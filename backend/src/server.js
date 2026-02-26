const express = require('express');
const cron = require('node-cron');
const config = require('./config/config');
const tradingSignal = require('./services/tradingSignal');
const lineNotifier = require('./services/lineNotifier');
const telegramNotifier = require('./services/telegramNotifier');
const priceValidation = require('./services/priceValidation');
const logger = require('./utils/logger');
const liffRoutes = require('./routes/liffRoutes');
const telegramRoutes = require('./routes/telegramRoutes');
const healthCheckRoutes = require('./routes/healthCheck');
const initDatabase = require('./config/initDatabase');
const userSettingsRoutes = require('./routes/userSettingsRoutes');

const app = express();
app.use(express.json());

// CORS Configuration for frontend access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Initialize database on startup (non-blocking - app continues without DB if it fails)
initDatabase().catch(error => {
  logger.warn(`Database initialization issue: ${error.message}`);
  // Continue running - Telegram and LINE will work without database
});

// Register health check routes
app.use('/health', healthCheckRoutes);

// Legacy health check endpoint (kept for compatibility)
app.get('/system-health', (req, res) => {
  res.json({ 
    status: 'running',
    timestamp: new Date().toISOString(),
    priceValidation: priceValidation.getStatus()
  });
});

// Manual trigger endpoint
app.post('/api/check-signal', async (req, res) => {
  try {
    logger.info('Manual signal check triggered via API');
    const signalData = await tradingSignal.processSignal();
    res.json({
      success: true,
      data: signalData
    });
  } catch (error) {
    logger.error(`API error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get current status
app.get('/api/status', (req, res) => {
  res.json({
    lastSignal: tradingSignal.lastSignal,
    lastSignalTime: tradingSignal.lastSignalTime,
    notifiers: {
      line: lineNotifier.getStatus ? lineNotifier.getStatus() : {},
      telegram: telegramNotifier.getStatus()
    },
    config: {
      checkInterval: config.scheduler.checkInterval,
      buyThreshold: config.trading.buyThreshold,
      sellThreshold: config.trading.sellThreshold
    }
  });
});

// Webhook routes
app.post('/webhook', (req, res) => {
  logger.info('LINE Webhook received');
  res.status(200).json({ success: true });
});

// Telegram Webhook
app.post('/telegram/webhook', async (req, res) => {
  try {
    // logger.debug('Telegram Webhook received:', JSON.stringify(req.body));
    await telegramNotifier.handleWebhook(req.body);
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Telegram Webhook Error:', error.message);
    res.status(500).json({ success: false });
  }
});

// Routes disabled during development (database disabled)
app.use('/api/liff', liffRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api', userSettingsRoutes);

// Start server
app.listen(config.server.port, async () => {
  logger.info(`🚀 Server started on port ${config.server.port}`);
  
  // Send startup message to both LINE and Telegram
  const startupMsg = '🚀 Gold Trading System Started!';
  await lineNotifier.sendMessage(startupMsg);
  await telegramNotifier.sendMessage(startupMsg);

  // Run immediately on startup
  await tradingSignal.processSignal();

  // Schedule cron job
  cron.schedule(config.scheduler.cronExpression, async () => {
    logger.info('Scheduled check triggered');
    await tradingSignal.processSignal();
  });

  logger.info(`Scheduled to run every ${config.scheduler.checkInterval} minutes`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  try {
    const shutdownMsg = '⏹️ Gold Trading System Stopped';
    await lineNotifier.sendMessage(shutdownMsg);
    await telegramNotifier.sendMessage(shutdownMsg);
  } catch (error) {
    logger.error('Error sending shutdown messages:', error.message);
  }
  process.exit(0);
});