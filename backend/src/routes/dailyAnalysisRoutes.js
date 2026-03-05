const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { DailyAnalysis, TradingPair } = require('../models');
const supabaseService = require('../services/supabaseService');

const RESULTS_DIR = path.join(__dirname, '../../../backend/data/daily_results');

/**
 * POST /api/daily-analysis/upload
 * Read JSON results from daily pipeline, upload images to Supabase, save to DB
 * Called by the scheduler after daily pipeline finishes
 */
router.post('/upload', async (req, res) => {
  try {
    if (!fs.existsSync(RESULTS_DIR)) {
      return res.json({ success: true, message: 'No results directory found', processed: 0 });
    }

    const resultFiles = fs.readdirSync(RESULTS_DIR).filter(f => f.endsWith('_result.json'));

    if (resultFiles.length === 0) {
      return res.json({ success: true, message: 'No result files found', processed: 0 });
    }

    const processed = [];
    const errors = [];

    for (const file of resultFiles) {
      try {
        const filePath = path.join(RESULTS_DIR, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const { pairCode, predictionImage, graphImage, analysis, timestamp } = data;

        if (!pairCode) {
          logger.warn(`Skipping ${file}: missing pairCode`);
          continue;
        }

        // Upload prediction image to Supabase
        let predictionUrl = null;
        if (predictionImage && fs.existsSync(predictionImage)) {
          const destPath = `predictions/${pairCode}_${new Date(timestamp).toISOString().slice(0, 10)}.png`;
          predictionUrl = await supabaseService.uploadFile(predictionImage, destPath);
          logger.info(`Uploaded prediction image for ${pairCode}: ${predictionUrl}`);
        }

        // Upload graph image to Supabase
        let graphUrl = null;
        if (graphImage && fs.existsSync(graphImage)) {
          const destPath = `graphs/${pairCode}_graph_${new Date(timestamp).toISOString().slice(0, 10)}.png`;
          graphUrl = await supabaseService.uploadFile(graphImage, destPath);
          logger.info(`Uploaded graph image for ${pairCode}: ${graphUrl}`);
        }

        // Find pair in DB to get pairId
        const pair = await TradingPair.findOne({ where: { pairCode: pairCode } });

        // Upsert daily analysis record
        const analysisDate = new Date(timestamp).toISOString().slice(0, 10);
        const [record, created] = await DailyAnalysis.findOrCreate({
          where: { pairCode, analysisDate },
          defaults: {
            pairId: pair?.id || null,
            analysis,
            predictionImageUrl: predictionUrl,
            graphImageUrl: graphUrl,
            analysisDate
          }
        });

        if (!created) {
          await record.update({
            analysis,
            predictionImageUrl: predictionUrl,
            graphImageUrl: graphUrl
          });
        }

        processed.push({ pairCode, predictionUrl, graphUrl, created });
        logger.info(`✅ Daily analysis saved for ${pairCode}`);

      } catch (err) {
        logger.error(`Error processing ${file}: ${err.message}`);
        errors.push({ file, error: err.message });
      }
    }

    res.json({ success: true, processed: processed.length, results: processed, errors });
  } catch (error) {
    logger.error(`Error in daily analysis upload: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/daily-analysis/:pairCode
 * Return the latest analysis + image URLs for a given pair
 */
router.get('/:pairCode', async (req, res) => {
  try {
    const { pairCode } = req.params;

    const record = await DailyAnalysis.findOne({
      where: { pairCode },
      order: [['analysis_date', 'DESC'], ['created_at', 'DESC']]
    });

    if (!record) {
      return res.json({ success: false, message: `No analysis found for ${pairCode}` });
    }

    res.json({
      success: true,
      data: {
        pairCode: record.pairCode,
        analysis: record.analysis,
        predictionImageUrl: record.predictionImageUrl,
        graphImageUrl: record.graphImageUrl,
        analysisDate: record.analysisDate,
        createdAt: record.createdAt
      }
    });
  } catch (error) {
    logger.error(`Error fetching daily analysis: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/daily-analysis
 * Return latest analysis for all pairs
 */
router.get('/', async (req, res) => {
  try {
    // Get distinct pair codes, pick most recent per pair
    const { sequelize } = require('../models');
    const records = await sequelize.query(`
      SELECT DISTINCT ON (pair_code) pair_code, analysis, prediction_image_url, graph_image_url, analysis_date, created_at
      FROM daily_analyses
      ORDER BY pair_code, analysis_date DESC, created_at DESC
    `, { type: sequelize.QueryTypes.SELECT });

    res.json({ success: true, data: records });
  } catch (error) {
    logger.error(`Error fetching all daily analyses: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
