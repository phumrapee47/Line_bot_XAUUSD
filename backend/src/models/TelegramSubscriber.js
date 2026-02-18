const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TelegramSubscriber = sequelize.define('TelegramSubscriber', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  telegramUserId: {
    type: DataTypes.STRING,
    columnName: 'telegram_user_id',
    unique: true,
    allowNull: false,
    comment: 'Telegram User ID'
  },
  firstName: {
    type: DataTypes.STRING,
    columnName: 'first_name',
    allowNull: true,
    comment: 'First name from Telegram'
  },
  lastName: {
    type: DataTypes.STRING,
    columnName: 'last_name',
    allowNull: true,
    comment: 'Last name from Telegram'
  },
  username: {
    type: DataTypes.STRING,
    columnName: 'username',
    allowNull: true,
    comment: 'Telegram username'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    columnName: 'is_active',
    defaultValue: true,
    comment: 'Is subscriber active (true = receiving messages)'
  },
  subscriptionDate: {
    type: DataTypes.DATE,
    columnName: 'subscription_date',
    defaultValue: DataTypes.NOW,
    comment: 'Date when subscribed'
  },
  lastMessageDate: {
    type: DataTypes.DATE,
    columnName: 'last_message_date',
    allowNull: true,
    comment: 'Last message sent date'
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
  tableName: 'telegram_subscribers',
  timestamps: true,
  underscored: true,
    // indexes: [
    //   { fields: ['is_active'] }
    // ]
});

module.exports = TelegramSubscriber;
