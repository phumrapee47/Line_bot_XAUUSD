const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserTradingParameters = sequelize.define('UserTradingParameters', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    field: 'user_id',
    allowNull: false
  },
  // Technical Analysis Parameters
  rsiPeriod: {
    type: DataTypes.INTEGER,
    field: 'rsi_period',
    defaultValue: 14
  },
  smaShort: {
    type: DataTypes.INTEGER,
    field: 'sma_short',
    defaultValue: 20
  },
  smaLong: {
    type: DataTypes.INTEGER,
    field: 'sma_long',
    defaultValue: 50
  },
  atrPeriod: {
    type: DataTypes.INTEGER,
    field: 'atr_period',
    defaultValue: 7
  },
  // Weighting
  rsiWeight: {
    type: DataTypes.DECIMAL(3, 2),
    field: 'rsi_weight',
    defaultValue: 0.30
  },
  smaWeight: {
    type: DataTypes.DECIMAL(3, 2),
    field: 'sma_weight',
    defaultValue: 0.20
  },
  technicalWeight: {
    type: DataTypes.DECIMAL(3, 2),
    field: 'technical_weight',
    defaultValue: 0.60
  },
  newsWeight: {
    type: DataTypes.DECIMAL(3, 2),
    field: 'news_weight',
    defaultValue: 0.40
  },
  // Risk Management
  maxDailyTrades: {
    type: DataTypes.INTEGER,
    field: 'max_daily_trades',
    defaultValue: 10
  },
  maxLossPerDay: {
    type: DataTypes.DECIMAL(10, 2),
    field: 'max_loss_per_day'
  },
  positionSize: {
    type: DataTypes.DECIMAL(6, 2),
    field: 'position_size'
  },
  // History
  historyPeriod: {
    type: DataTypes.STRING(20),
    field: 'history_period',
    defaultValue: '60d'
  },
  // Multipliers (Risk Management)
  tpMultiplier: {
    type: DataTypes.DECIMAL(4, 2),
    field: 'tp_multiplier',
    defaultValue: 2.00
  },
  slMultiplier: {
    type: DataTypes.DECIMAL(4, 2),
    field: 'sl_multiplier',
    defaultValue: 1.00
  },
  // Timestamps
  createdAt: {
    type: DataTypes.DATE,
    field: 'created_at',
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: 'updated_at',
    defaultValue: DataTypes.NOW,
    onUpdate: DataTypes.NOW
  }
}, {
  tableName: 'user_trading_parameters',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'], unique: true }
  ]
});

module.exports = UserTradingParameters;
