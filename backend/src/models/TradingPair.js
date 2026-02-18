const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TradingPair = sequelize.define('TradingPair', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  pairCode: {
    type: DataTypes.STRING(20),
    columnName: 'pair_code',
    unique: true,
    allowNull: false,
    comment: 'XAUUSD, EURUSD, etc'
  },
  pairName: {
    type: DataTypes.STRING(100),
    columnName: 'pair_name',
    allowNull: false,
    comment: 'Gold/USD, Euro/USD'
  },
  pairSymbol: {
    type: DataTypes.STRING(10),
    columnName: 'pair_symbol',
    allowNull: false,
    comment: 'g, e, b (short code)'
  },
  assetType: {
    type: DataTypes.STRING(50),
    columnName: 'asset_type',
    allowNull: false,
    comment: 'commodity, forex, crypto, stock'
  },
  baseAsset: {
    type: DataTypes.STRING(50),
    columnName: 'base_asset',
    comment: 'Gold, Euro, Bitcoin'
  },
  quoteAsset: {
    type: DataTypes.STRING(50),
    columnName: 'quote_asset',
    comment: 'USD, EUR'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    columnName: 'is_active',
    defaultValue: true
  },
  minPrice: {
    type: DataTypes.DECIMAL(12, 2),
    columnName: 'min_price'
  },
  maxPrice: {
    type: DataTypes.DECIMAL(12, 2),
    columnName: 'max_price'
  },
  priceUpdateInterval: {
    type: DataTypes.INTEGER,
    columnName: 'price_update_interval',
    defaultValue: 1,
    comment: 'minutes'
  },
  modelAvailable: {
    type: DataTypes.BOOLEAN,
    columnName: 'model_available',
    defaultValue: true
  },
  technicalModelPath: {
    type: DataTypes.STRING(255),
    columnName: 'technical_model_path'
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
  tableName: 'trading_pairs',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['asset_type'] },
    { fields: ['is_active'] }
  ]
});

module.exports = TradingPair;
