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

  async getTechnicalAnalysis() {
    try {
      // Path works both locally and on Render
      // Local: backend/src/models -> ../../../ml-models = ml-models
      // Render: /opt/render/project/src/backend/src/models -> ../../../ml-models = /opt/render/project/src/ml-models
      const scriptPath = path.join(__dirname, '../../../ml-models', 'technical_model.py');
      logger.info(`Running technical analysis script: ${scriptPath}`);
      logger.info(`Python environment PATH: ${process.env.PATH}`);
      const result = await this.runPythonScript(scriptPath);
      logger.info(`Technical analysis completed: prob=${result.probability}, price=${result.price}, tp=${result.tp}, sl=${result.sl}`);
      return result;
    } catch (error) {
      logger.error(`Technical analysis failed: ${error.message}`);
      throw error;
    }
  }

  async getNewsAnalysis() {
    try {
      const scriptPath = path.join(__dirname, '../../../ml-models', 'news_model.py');
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