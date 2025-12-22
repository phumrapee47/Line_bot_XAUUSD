const pythonBridge = require('../models/pythonBridge');
const logger = require('../utils/logger');

class NewsAnalysisService {
  async analyze() {
    try {
      const result = await pythonBridge.getNewsAnalysis();
      
      return {
        score: result.score,
        newsCount: result.news_count || 0
      };
    } catch (error) {
      logger.error(`News analysis error: ${error.message}`);
      return {
        score: 0.5,
        newsCount: 0
      };
    }
  }
}

module.exports = new NewsAnalysisService();