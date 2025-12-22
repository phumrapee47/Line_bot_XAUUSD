const { spawn } = require('child_process');
const logger = require('../utils/logger');
const path = require('path');

class PythonBridge {
  async runPythonScript(scriptPath, args = []) {
    return new Promise((resolve, reject) => {
      const python = spawn('python', [scriptPath, ...args]);
      
      let dataString = '';
      let errorString = '';

      python.stdout.on('data', (data) => {
        dataString += data.toString();
      });

      python.stderr.on('data', (data) => {
        errorString += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          logger.error(`Python script error: ${errorString}`);
          reject(new Error(errorString));
          return;
        }

        try {
          const result = JSON.parse(dataString);
          resolve(result);
        } catch (error) {
          logger.error(`Error parsing Python output: ${error.message}`);
          reject(error);
        }
      });
    });
  }

  async getTechnicalAnalysis() {
    try {
      const scriptPath = path.join(__dirname, '../../..', 'ml-models', 'technical_model.py');
      const result = await this.runPythonScript(scriptPath);
      logger.info(`Technical analysis completed: prob=${result.probability}`);
      return result;
    } catch (error) {
      logger.error(`Technical analysis failed: ${error.message}`);
      throw error;
    }
  }

  async getNewsAnalysis() {
    try {
      const scriptPath = path.join(__dirname, '../../..', 'ml-models', 'news_model.py');
      const result = await this.runPythonScript(scriptPath);
      logger.info(`News analysis completed: score=${result.score}`);
      return result;
    } catch (error) {
      logger.error(`News analysis failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new PythonBridge();