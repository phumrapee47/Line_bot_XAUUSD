const pythonBridge = require('../models/pythonBridge');
const logger = require('../utils/logger');

class TechnicalAnalysisService {
  async analyze() {
    try {
      const result = await pythonBridge.getTechnicalAnalysis();
      
      return {
        probability: result.probability,
        price: result.price,
        tp: result.tp,
        sl: result.sl
      };
    } catch (error) {
      logger.error(`Technical analysis error: ${error.message}`);
      return {
        probability: 0.5,
        price: 0,
        tp: 0,
        sl: 0
      };
    }
  }
}

module.exports = new TechnicalAnalysisService();