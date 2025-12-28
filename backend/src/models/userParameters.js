const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Path to parameters file
const PARAMS_FILE = path.join(__dirname, '../../data/user_parameters.json');

// Create directory if not exists
const dataDir = path.dirname(PARAMS_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize file if not exists
if (!fs.existsSync(PARAMS_FILE)) {
  fs.writeFileSync(PARAMS_FILE, '{}', 'utf-8');
}

// Default parameters
const DEFAULT_PARAMS = {
  rsi_period: 14,
  sma_short: 20,
  sma_long: 50,
  atr_period: 7,
  rsi_weight: 0.3,
  sma_weight: 0.2,
  tp_multiplier: 2.0,
  sl_multiplier: 1.0,
  history_period: "60d"
};

const userParameters = {
  // Get user parameters
  getParams: (userId) => {
    try {
      const data = JSON.parse(fs.readFileSync(PARAMS_FILE, 'utf-8'));
      return data[userId] || { ...DEFAULT_PARAMS };
    } catch (error) {
      logger.error(`Error reading parameters: ${error.message}`);
      return { ...DEFAULT_PARAMS };
    }
  },

  // Save user parameters
  saveParams: (userId, params) => {
    try {
      const data = JSON.parse(fs.readFileSync(PARAMS_FILE, 'utf-8'));
      data[userId] = { ...DEFAULT_PARAMS, ...params, updatedAt: new Date().toISOString() };
      fs.writeFileSync(PARAMS_FILE, JSON.stringify(data, null, 2), 'utf-8');
      logger.info(`Parameters saved for user: ${userId}`);
      return data[userId];
    } catch (error) {
      logger.error(`Error saving parameters: ${error.message}`);
      throw error;
    }
  },

  // Get all parameters
  getAllParams: () => {
    try {
      return JSON.parse(fs.readFileSync(PARAMS_FILE, 'utf-8'));
    } catch (error) {
      logger.error(`Error reading all parameters: ${error.message}`);
      return {};
    }
  },

  // Reset to default
  resetParams: (userId) => {
    try {
      const data = JSON.parse(fs.readFileSync(PARAMS_FILE, 'utf-8'));
      data[userId] = { ...DEFAULT_PARAMS, updatedAt: new Date().toISOString() };
      fs.writeFileSync(PARAMS_FILE, JSON.stringify(data, null, 2), 'utf-8');
      return data[userId];
    } catch (error) {
      logger.error(`Error resetting parameters: ${error.message}`);
      throw error;
    }
  },

  // Validate parameters
  validateParams: (params) => {
    const rules = {
      rsi_period: { min: 5, max: 30 },
      sma_short: { min: 5, max: 50 },
      sma_long: { min: 20, max: 200 },
      atr_period: { min: 3, max: 20 },
      rsi_weight: { min: 0, max: 1 },
      sma_weight: { min: 0, max: 1 },
      tp_multiplier: { min: 0.5, max: 5.0 },
      sl_multiplier: { min: 0.3, max: 3.0 }
    };

    for (const [key, value] of Object.entries(params)) {
      if (rules[key]) {
        const { min, max } = rules[key];
        if (value < min || value > max) {
          return {
            valid: false,
            error: `${key} must be between ${min} and ${max}`
          };
        }
      }
    }

    return { valid: true };
  },

  getDefaults: () => ({ ...DEFAULT_PARAMS })
};

module.exports = userParameters;