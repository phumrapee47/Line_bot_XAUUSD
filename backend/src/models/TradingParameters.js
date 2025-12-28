const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const TradingParameters = sequelize.define('TradingParameters', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  rsiPeriod: {
    type: DataTypes.INTEGER,
    defaultValue: 14,
    validate: { min: 5, max: 30 }
  },
  smaShort: {
    type: DataTypes.INTEGER,
    defaultValue: 20,
    validate: { min: 5, max: 50 }
  },
  smaLong: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
    validate: { min: 20, max: 200 }
  },
  atrPeriod: {
    type: DataTypes.INTEGER,
    defaultValue: 7,
    validate: { min: 3, max: 20 }
  },
  rsiWeight: {
    type: DataTypes.FLOAT,
    defaultValue: 0.3,
    validate: { min: 0, max: 1 }
  },
  smaWeight: {
    type: DataTypes.FLOAT,
    defaultValue: 0.2,
    validate: { min: 0, max: 1 }
  },
  tpMultiplier: {
    type: DataTypes.FLOAT,
    defaultValue: 2.0,
    validate: { min: 0.5, max: 5.0 }
  },
  slMultiplier: {
    type: DataTypes.FLOAT,
    defaultValue: 1.0,
    validate: { min: 0.3, max: 3.0 }
  },
  historyPeriod: {
    type: DataTypes.STRING,
    defaultValue: '60d'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    onUpdate: DataTypes.NOW
  }
}, {
  tableName: 'trading_parameters',
  indexes: [
    { fields: ['userId'], unique: true }
  ]
});

// Association
User.hasOne(TradingParameters, { foreignKey: 'userId', onDelete: 'CASCADE' });
TradingParameters.belongsTo(User, { foreignKey: 'userId' });

module.exports = TradingParameters;
