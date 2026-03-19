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
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173', // Admin Dashboard local
    'https://admin-dashboard-signal-trading-project.onrender.com' // Admin Dashboard prod
  ].filter(Boolean);

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*'); // Fallback
  }
  
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-admin-secret');
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

// ==============================================================
// Admin Broadcast API
// POST /api/broadcast
// Headers: x-admin-secret: <ADMIN_SECRET from .env>
// Body: { message, channel ('line'|'telegram'|'both'), tier ('all'|'subscription'|'unsubscription') }
// ==============================================================
app.post('/api/broadcast', async (req, res) => {
  const secret = req.headers['x-admin-secret'];
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret || secret !== adminSecret) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid admin secret' });
  }

  const { message, channel = 'both', tier = 'all' } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }

  try {
    const userSettingsService = require('./services/userSettingsService');

    // Build list of recipient user IDs
    const lineUsers = (channel === 'line' || channel === 'both')
      ? await userSettingsService.getActiveUsersForBroadcasting('line')
      : [];
    const telegramUsers = (channel === 'telegram' || channel === 'both')
      ? await userSettingsService.getActiveUsersForBroadcasting('telegram')
      : [];

    // Filter by tier if specified
    const filterByTier = (users) => {
      if (tier === 'all') return users;
      return users.filter(u => u.subscription_type === tier);
    };

    const lineIds = filterByTier(lineUsers).map(u => u.line_user_id).filter(Boolean);
    const telegramIds = filterByTier(telegramUsers).map(u => u.telegram_user_id).filter(Boolean);

    logger.info(`📢 Admin Broadcast: "${message.substring(0, 40)}..." → LINE: ${lineIds.length}, Telegram: ${telegramIds.length}`);

    const results = await Promise.allSettled([
      lineIds.length > 0 ? lineNotifier.sendToMultipleUsers(message, lineIds) : Promise.resolve([]),
      telegramIds.length > 0 ? telegramNotifier.sendToMultipleUsers(message, telegramIds) : Promise.resolve([])
    ]);

    res.json({
      success: true,
      data: {
        lineSent: lineIds.length,
        telegramSent: telegramIds.length,
        total: lineIds.length + telegramIds.length
      }
    });
  } catch (error) {
    logger.error(`Broadcast error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});



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

  // --- Async Queue for Signal Processing ---
  // FIX: Enqueue ML jobs to avoid Out-Of-Memory (OOM) crashes by running them sequentially
  const signalProcessingQueue = [];
  let isProcessingSignals = false;

  const processNextSignal = async () => {
    if (isProcessingSignals) return;
    isProcessingSignals = true;
    
    while (signalProcessingQueue.length > 0) {
      const symbol = signalProcessingQueue.shift();
      try {
        await tradingSignal.processSignal(symbol);
      } catch (e) {
        logger.error(`Error in scheduled check for ${symbol}: ${e.message}`);
      }
    }
    
    isProcessingSignals = false;
  };

  const schedules = [
    { cron: '*/15 * * * *', symbols: ['XRP/USDT', 'BNB/USDT'], label: '15m' },
    { cron: '0 * * * *',   symbols: ['BTC/USDT', 'XAUUSD'],   label: '1h'  },
    { cron: '0 */4 * * *', symbols: ['ETH/USDT', 'SOL/USDT', 'DOGE/USDT'], label: '4h' }
  ];

  schedules.forEach(group => {
    cron.schedule(group.cron, async () => {
      logger.info(`⏰ [${group.label}] Scheduled check triggered. Adding to queue: ${group.symbols.join(', ')}`);
      for (const symbol of group.symbols) {
        // Only queue it if it's not already in the queue
        if (!signalProcessingQueue.includes(symbol)) {
          signalProcessingQueue.push(symbol);
        }
      }
      processNextSignal();
    });
  });

  logger.info(`✅ Multi-timeframe scheduler initialized for ${schedules.length} frequency groups (QUEUED)`);

  // --- Daily Analysis Pipeline Logic ---
  const runDailyPipeline = async () => {
    logger.info('Starting Daily Analysis ML Pipeline...');
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);
      
      const mlDir = path.join(__dirname, '../../ml-models/daily_pipeline');
      
      // 1. Run the pipeline (this might take several minutes)
      logger.info('Step 1: Running python daily_trading_pipeline.py...');
      // FIX: Increase maxBuffer to 50MB to prevent Node from dropping the process if python logs are too verbose
      const { stdout, stderr } = await execPromise('python daily_trading_pipeline.py', { 
        cwd: mlDir, 
        timeout: 1800000, 
        maxBuffer: 1024 * 1024 * 50 
      }); 
      if (stdout) {
        const lastLines = stdout.split('\n').filter(l => l.trim()).slice(-5).join(' | ');
        logger.info(`ML pipeline stdout (last bits): ${lastLines}...`);
      }
      if (stderr) logger.warn(`ML pipeline stderr: ${stderr}`);

      // 2. Call the internal upload API to sync to DB & Supabase
      logger.info('Step 2: Syncing results to Database & Supabase...');
      const axios = require('axios');
      const response = await axios.post(`http://localhost:${config.server.port}/api/daily-analysis/upload`);
      const { processed = 0 } = response.data;
      logger.info(`✅ Daily pipeline complete: ${processed} pairs processed.`);
      return { success: true, processed, stdout };
    } catch (e) {
      logger.error(`❌ Fatal error in daily analysis pipeline: ${e.message}`);
      return { success: false, error: e.message };
    }
  };

  // Endpoint to manually trigger the pipeline (useful for UptimeRobot / cron-job.org)
  app.post('/api/trigger-daily-pipeline', async (req, res) => {
    logger.info('Manual trigger: Daily Pipeline');
    
    // We start the pipeline asynchronously and return immediately so the Webhook doesn't timeout
    runDailyPipeline();
    
    res.json({ success: true, message: 'Daily pipeline triggered and is running in the background.' });
  });

  // Run every day at 02:05 AM Bangkok time (if server is awake)
  // FIX: Staggered from 02:00 to 02:05 to avoid simultaneous execution with the top-of-the-hour 1h/4h jobs
  cron.schedule('5 2 * * *', async () => {
    logger.info('⏰ [Bangkok 02:05 AM] Scheduled check: Starting Daily Analysis ML Pipeline...');
    await runDailyPipeline();
  }, {
    timezone: "Asia/Bangkok"
  });
  logger.info('✅ Daily pipeline scheduler initialized (02:05 AM, Asia/Bangkok)');
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