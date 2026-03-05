const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * DailyAnalysis model
 * Stores Gemini AI analysis results + Supabase image URLs per pair per day
 */
const DailyAnalysis = sequelize.define('DailyAnalysis', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  pairId: {
    type: DataTypes.INTEGER,
    field: 'pair_id',
    allowNull: true,
    references: { model: 'trading_pairs', key: 'id' }
  },
  pairCode: {
    type: DataTypes.STRING(20),
    field: 'pair_code',
    allowNull: false
  },
  analysis: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  predictionImageUrl: {
    type: DataTypes.TEXT,
    field: 'prediction_image_url',
    allowNull: true
  },
  graphImageUrl: {
    type: DataTypes.TEXT,
    field: 'graph_image_url',
    allowNull: true
  },
  analysisDate: {
    type: DataTypes.DATEONLY,
    field: 'analysis_date',
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'daily_analyses',
  timestamps: true,
  underscored: true,
  updatedAt: 'updated_at',
  createdAt: 'created_at',
  indexes: [
    { fields: ['pair_code'] },
    { fields: ['analysis_date'] }
  ]
});

module.exports = DailyAnalysis;
