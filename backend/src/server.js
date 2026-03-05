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
const dailyAnalysisRoutes = require('./routes/dailyAnalysisRoutes');


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

// Initialize database on startup (non-blocking)
// We start listening immediately so Render/Health checks succeed
initDatabase().then(async (success) => {
  if (success) {
    logger.info('Database ready, system fully functional');
    
    // Run initial analysis after DB is ready (non-blocking)
    setTimeout(async () => {
      logger.info('Running initial startup signal check...');
      await tradingSignal.processSignal().catch(e => logger.error(`Startup signal check failed: ${e.message}`));
    }, 5000); // Wait 5 seconds to let things settle
  } else {
    logger.warn('Database not ready, some features limited');
  }
}).catch(error => {
  logger.error(`Database initialization error: ${error.message}`);
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
app.use('/api/daily-analysis', dailyAnalysisRoutes);


// --- Frontend Static Serving (Monolithic Deployment) ---
const path = require('path');
const frontendPath = path.join(__dirname, '../../frontend');

// Serve static files from the frontend directory
app.use(express.static(frontendPath));

// Serve analysis images from data directory
const dataPath = path.join(__dirname, '../data');
app.use('/api/data', express.static(dataPath));
app.use('/api/data/predictions', express.static(path.join(dataPath, 'predictions')));
app.use('/api/data/graphs', express.static(path.join(dataPath, 'graphs')));

// Fallback all other GET requests to the main LIFF enhanced settings page
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'liff-enhanced-settings.html'));
});

// Start server
app.listen(config.server.port, () => {
  logger.info(`🚀 Server started on port ${config.server.port}`);
  
  // Send startup message to both LINE and Telegram
  const startupMsg = '🚀 Gold Trading System Started!';
  lineNotifier.sendMessage(startupMsg).catch(e => logger.error(`Error sending LINE startup message: ${e.message}`));
  telegramNotifier.sendMessage(startupMsg).catch(e => logger.error(`Error sending Telegram startup message: ${e.message}`));

  // --- Multi-Timeframe Scheduling System ---
  
  const schedules = [
    { cron: '*/5 * * * *', symbols: ['XRP/USDT'], label: '5m' },
    { cron: '*/15 * * * *', symbols: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'], label: '15m' },
    { cron: '0 * * * *', symbols: ['XAUUSD', 'SOL/USDT', 'DOGE/USDT'], label: '1h' }
  ];

  schedules.forEach(group => {
    cron.schedule(group.cron, async () => {
      logger.info(`⏰ [${group.label}] Scheduled check triggered for: ${group.symbols.join(', ')}`);
      for (const symbol of group.symbols) {
        await tradingSignal.processSignal(symbol).catch(e => 
          logger.error(`Error in scheduled check for ${symbol}: ${e.message}`)
        );
      }
    });
  });

  logger.info(`✅ Multi-timeframe scheduler initialized for ${schedules.length} frequency groups`);

  // --- Daily Analysis Pipeline ---
  // Run every day at 02:00 AM server time
  cron.schedule('0 2 * * *', async () => {
    logger.info('⏰ Starting Daily Analysis ML Pipeline for all pairs...');
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);
      
      const mlDir = path.join(__dirname, '../../ml-models/daily_pipeline');
      // Run the pipeline (this might take several minutes)
      logger.info('Running python daily_trading_pipeline.py...');
      const { stdout, stderr } = await execPromise('python daily_trading_pipeline.py', { cwd: mlDir, timeout: 600000 });
      logger.info(`Pipeline ML complete: ${stdout.substring(0, 100)}...`);
      
      // Call the internal upload API
      logger.info('Calling internal /api/daily-analysis/upload to sync to DB & Supabase...');
      const axios = require('axios');
      const response = await axios.post(`http://localhost:${config.server.port}/api/daily-analysis/upload`);
      logger.info(`Upload API result: Processed ${response.data.processed} pairs.`);
    } catch (e) {
      logger.error(`Error in daily analysis pipeline cron: ${e.message}`);
    }
  });
  logger.info('✅ Daily pipeline scheduler initialized (02:00 AM)');
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