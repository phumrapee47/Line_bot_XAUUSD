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
    field: 'telegram_user_id',
    allowNull: false,
    comment: 'Telegram User ID'
  },
  firstName: {
    type: DataTypes.STRING,
    field: 'first_name',
    allowNull: true,
    comment: 'First name from Telegram'
  },
  lastName: {
    type: DataTypes.STRING,
    field: 'last_name',
    allowNull: true,
    comment: 'Last name from Telegram'
  },
  username: {
    type: DataTypes.STRING,
    field: 'username',
    allowNull: true,
    comment: 'Telegram username'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    field: 'is_active',
    defaultValue: true,
    comment: 'Is subscriber active (true = receiving messages)'
  },
  subscriptionDate: {
    type: DataTypes.DATE,
    field: 'subscription_date',
    defaultValue: DataTypes.NOW,
    comment: 'Date when subscribed'
  },
  lastMessageDate: {
    type: DataTypes.DATE,
    field: 'last_message_date',
    allowNull: true,
    comment: 'Last message sent date'
  },
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
  tableName: 'telegram_subscribers',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['telegram_user_id'], unique: true },
    { fields: ['is_active'] }
  ]
});

module.exports = TelegramSubscriber;
