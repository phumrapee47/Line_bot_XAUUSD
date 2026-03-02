const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TradingSignal = sequelize.define('TradingSignal', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  pairId: {
    type: DataTypes.INTEGER,
    field: 'pair_id',
    allowNull: false,
    references: {
      model: 'trading_pairs',
      key: 'id'
    }
  },
  signal: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'BUY, SELL, or HOLD'
  },
  confidence: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  tp: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  sl: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'trading_signals',
  timestamps: false,
  underscored: true,
  indexes: [
    { fields: ['pair_id'] },
    { fields: ['timestamp'] }
  ]
});

module.exports = TradingSignal;
