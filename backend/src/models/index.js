const sequelize = require('../config/database');
const User = require('./User');
const TradingPair = require('./TradingPair');
const UserTradingPair = require('./UserTradingPair');
const UserNotificationPreferences = require('./UserNotificationPreferences');
const UserTradingParameters = require('./UserTradingParameters');
const TelegramSubscriber = require('./TelegramSubscriber');
const TradingSignal = require('./TradingSignal');
const DailyAnalysis = require('./DailyAnalysis');

// --- Associations ---

// User <-> UserTradingPair <-> TradingPair
User.hasMany(UserTradingPair, { foreignKey: 'userId', as: 'UserTradingPairs', onDelete: 'CASCADE' });
UserTradingPair.belongsTo(User, { foreignKey: 'userId', as: 'User' });

TradingPair.hasMany(UserTradingPair, { foreignKey: 'pairId', as: 'UserTradingPairs', onDelete: 'CASCADE' });
UserTradingPair.belongsTo(TradingPair, { foreignKey: 'pairId', as: 'TradingPair' });

// User <-> UserNotificationPreferences
User.hasOne(UserNotificationPreferences, { foreignKey: 'userId', as: 'UserNotificationPreference', onDelete: 'CASCADE' });
UserNotificationPreferences.belongsTo(User, { foreignKey: 'userId', as: 'User' });

// User <-> UserTradingParameters
// User.hasOne(UserTradingParameters, { foreignKey: 'userId', as: 'UserTradingParameter', onDelete: 'CASCADE' });
// UserTradingParameters.belongsTo(User, { foreignKey: 'userId', as: 'User' });

// TradingPair <-> TradingSignal
TradingPair.hasMany(TradingSignal, { foreignKey: 'pairId', onDelete: 'CASCADE' });
TradingSignal.belongsTo(TradingPair, { foreignKey: 'pairId' });

// Export models
module.exports = {
  sequelize,
  User,
  TradingPair,
  UserTradingPair,
  UserNotificationPreferences,
  UserTradingParameters,
  TelegramSubscriber,
  TradingSignal,
  DailyAnalysis
};
