const { spawn } = require('child_process');
const logger = require('../utils/logger');
const path = require('path');

class PythonBridge {
  async runPythonScript(scriptPath, args = []) {
    return new Promise((resolve, reject) => {
      // Try to use full Python path explicitly
      let pythonCmd = 'python';
      if (process.platform === 'win32') {
        // Windows: Check if Python is in AppData
        const windowsPythonPath = process.env.PYTHON_PATH || 'python';
        pythonCmd = windowsPythonPath;
      }
      const python = spawn(pythonCmd, [scriptPath, ...args]);
      
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

  async getTechnicalAnalysis(pairCode = 'XAUUSD') {
    try {
      // Mapping pairCode to model script
      const modelMapping = {
        'XAUUSD': 'xauusdmodel/technical_model.py',
        // Generic fallback for any other symbol to use the crypto script
        'DEFAULT_CRYPTO': 'cryptomodel/technical_model.py'
      };

      let scriptName = modelMapping[pairCode];
      if (!scriptName) {
        // If it's a crypto pair (like BTCUSDT or BTC), use the crypto model
        scriptName = modelMapping['DEFAULT_CRYPTO'];
      }
      const scriptPath = path.join(__dirname, '../../../ml-models', scriptName);
      
      logger.info(`Running technical analysis script for ${pairCode}: ${scriptPath}`);
      
      const result = await this.runPythonScript(scriptPath, [pairCode]);
      logger.info(`Technical analysis completed for ${pairCode}: prob=${result.probability}, price=${result.price}`);
      return result;
    } catch (error) {
      logger.error(`Technical analysis failed for ${pairCode}: ${error.message}`);
      throw error;
    }
  }

  async getNewsAnalysis() {
    try {
      const scriptPath = path.join(__dirname, '../../../ml-models/xauusdmodel', 'news_model.py');
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