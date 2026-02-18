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
    columnName: 'user_id',
    unique: true,
    allowNull: false
  },
  // Technical Analysis Parameters
  rsiPeriod: {
    type: DataTypes.INTEGER,
    columnName: 'rsi_period',
    defaultValue: 14
  },
  smaShort: {
    type: DataTypes.INTEGER,
    columnName: 'sma_short',
    defaultValue: 20
  },
  smaLong: {
    type: DataTypes.INTEGER,
    columnName: 'sma_long',
    defaultValue: 50
  },
  atrPeriod: {
    type: DataTypes.INTEGER,
    columnName: 'atr_period',
    defaultValue: 7
  },
  // Weighting
  rsiWeight: {
    type: DataTypes.DECIMAL(3, 2),
    columnName: 'rsi_weight',
    defaultValue: 0.30
  },
  smaWeight: {
    type: DataTypes.DECIMAL(3, 2),
    columnName: 'sma_weight',
    defaultValue: 0.20
  },
  technicalWeight: {
    type: DataTypes.DECIMAL(3, 2),
    columnName: 'technical_weight',
    defaultValue: 0.60
  },
  newsWeight: {
    type: DataTypes.DECIMAL(3, 2),
    columnName: 'news_weight',
    defaultValue: 0.40
  },
  // Risk Management
  maxDailyTrades: {
    type: DataTypes.INTEGER,
    columnName: 'max_daily_trades',
    defaultValue: 10
  },
  maxLossPerDay: {
    type: DataTypes.DECIMAL(10, 2),
    columnName: 'max_loss_per_day'
  },
  positionSize: {
    type: DataTypes.DECIMAL(6, 2),
    columnName: 'position_size'
  },
  // History
  historyPeriod: {
    type: DataTypes.STRING(20),
    columnName: 'history_period',
    defaultValue: '60d'
  },
  // Timestamps
  createdAt: {
    type: DataTypes.DATE,
    columnName: 'created_at',
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    columnName: 'updated_at',
    defaultValue: DataTypes.NOW,
    onUpdate: DataTypes.NOW
  }
}, {
  tableName: 'user_trading_parameters',
  timestamps: true,
  underscored: true,
    // indexes: [
    //   // { fields: ['user_id'], unique: true } - Redundant with column definition
    // ]
});

module.exports = UserTradingParameters;
