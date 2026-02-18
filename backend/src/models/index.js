const sequelize = require('../config/database');
const User = require('./User');
const TradingPair = require('./TradingPair');
const UserTradingPair = require('./UserTradingPair');
const UserNotificationPreferences = require('./UserNotificationPreferences');
const UserTradingParameters = require('./UserTradingParameters');
const TelegramSubscriber = require('./TelegramSubscriber');

// Export models
module.exports = {
  sequelize,
  User,
  TradingPair,
  UserTradingPair,
  UserNotificationPreferences,
  UserTradingParameters,
  TelegramSubscriber
};
