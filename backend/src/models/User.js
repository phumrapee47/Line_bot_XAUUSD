const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // LINE Integration
  lineUserId: {
    type: DataTypes.STRING,
    field: 'line_user_id',
    allowNull: true,
    comment: 'LINE User ID'
  },
  displayName: {
    type: DataTypes.STRING,
    field: 'display_name',
    allowNull: true,
    comment: 'User display name from LINE'
  },
  pictureUrl: {
    type: DataTypes.STRING,
    field: 'picture_url',
    allowNull: true,
    comment: 'User profile picture URL'
  },
  statusMessage: {
    type: DataTypes.STRING,
    field: 'status_message',
    allowNull: true
  },
  // Telegram Integration
  telegramUserId: {
    type: DataTypes.STRING,
    field: 'telegram_user_id',
    allowNull: true,
    comment: 'Telegram User ID'
  },
  telegramFirstName: {
    type: DataTypes.STRING,
    field: 'telegram_first_name',
    allowNull: true
  },
  telegramLastName: {
    type: DataTypes.STRING,
    field: 'telegram_last_name',
    allowNull: true
  },
  telegramUsername: {
    type: DataTypes.STRING,
    field: 'telegram_username',
    allowNull: true
  },
  // User Status
  isActive: {
    type: DataTypes.BOOLEAN,
    field: 'is_active',
    defaultValue: true
  },
  isPremium: {
    type: DataTypes.BOOLEAN,
    field: 'is_premium',
    defaultValue: false
  },
  // Personal Info
  email: {
    type: DataTypes.STRING,
    field: 'email',
    allowNull: true
  },
  language: {
    type: DataTypes.STRING(10),
    field: 'language',
    defaultValue: 'th'
  },
  timezone: {
    type: DataTypes.STRING(50),
    field: 'timezone',
    defaultValue: 'Asia/Bangkok'
  },
  // Timestamps
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
  },
  lastLogin: {
    type: DataTypes.DATE,
    field: 'last_login',
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['line_user_id'], unique: true },
    { fields: ['telegram_user_id'], unique: true },
    { fields: ['email'], unique: true },
    { fields: ['is_active'] },
    { fields: ['created_at'] }
  ]
});

module.exports = User;
