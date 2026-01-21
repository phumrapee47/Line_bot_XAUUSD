const express = require('express');
const cron = require('node-cron');
const config = require('./config/config');
const tradingSignal = require('./services/tradingSignal');
const lineNotifier = require('./services/lineNotifier');
const priceValidation = require('./services/priceValidation');
const logger = require('./utils/logger');
const liffRoutes = require('./routes/liffRoutes');
const healthCheckRoutes = require('./routes/healthCheck');
const initDatabase = require('./config/initDatabase');

const app = express();
app.use(express.json());

// Initialize database on startup
initDatabase().catch(error => {
  logger.error(`Failed to initialize database: ${error.message}`);
  process.exit(1);
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
    config: {
      checkInterval: config.scheduler.checkInterval,
      buyThreshold: config.trading.buyThreshold,
      sellThreshold: config.trading.sellThreshold
    }
  });
});

// LINE Webhook endpoint (for webhook validation)
app.post('/webhook', (req, res) => {
  logger.info('LINE Webhook received');
  res.status(200).json({ success: true });
});

app.use('/api/liff', liffRoutes);

// Start server
app.listen(config.server.port, async () => {
  logger.info(`Server started on port ${config.server.port}`);
  logger.info('Gold Trading System initialized');

  // Send startup notification
  await lineNotifier.sendMessage('🚀 Gold Trading System Started!');

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
  await lineNotifier.sendMessage('⏹️ Gold Trading System Stopped');
  process.exit(0);
});