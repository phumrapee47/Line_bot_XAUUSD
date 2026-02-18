const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserTradingPair = sequelize.define('UserTradingPair', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    columnName: 'user_id',
    allowNull: false
  },
  pairId: {
    type: DataTypes.INTEGER,
    columnName: 'pair_id',
    allowNull: false
  },
  isSelected: {
    type: DataTypes.BOOLEAN,
    columnName: 'is_selected',
    defaultValue: true,
    comment: 'User wants to trade this pair'
  },
  // Pair-specific settings
  buyThreshold: {
    type: DataTypes.DECIMAL(3, 2),
    columnName: 'buy_threshold',
    comment: 'Buy signal threshold (0.60 = 60%)'
  },
  sellThreshold: {
    type: DataTypes.DECIMAL(3, 2),
    columnName: 'sell_threshold',
    comment: 'Sell signal threshold (0.40 = 40%)'
  },
  tpMultiplier: {
    type: DataTypes.DECIMAL(4, 2),
    columnName: 'tp_multiplier',
    comment: 'Take Profit multiplier'
  },
  slMultiplier: {
    type: DataTypes.DECIMAL(4, 2),
    columnName: 'sl_multiplier',
    comment: 'Stop Loss multiplier'
  },
  notifyPair: {
    type: DataTypes.BOOLEAN,
    columnName: 'notify_pair',
    defaultValue: true,
    comment: 'Send notifications for this pair'
  },
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
  tableName: 'user_trading_pairs',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['pair_id'] },
    { fields: ['is_selected'] }
  ]
});

module.exports = UserTradingPair;
