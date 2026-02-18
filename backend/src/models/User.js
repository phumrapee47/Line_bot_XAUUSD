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
    columnName: 'line_user_id',
    unique: true,
    allowNull: true,
    comment: 'LINE User ID'
  },
  displayName: {
    type: DataTypes.STRING,
    columnName: 'display_name',
    allowNull: true,
    comment: 'User display name from LINE'
  },
  pictureUrl: {
    type: DataTypes.STRING,
    columnName: 'picture_url',
    allowNull: true,
    comment: 'User profile picture URL'
  },
  statusMessage: {
    type: DataTypes.STRING,
    columnName: 'status_message',
    allowNull: true
  },
  // Telegram Integration
  telegramUserId: {
    type: DataTypes.STRING,
    columnName: 'telegram_user_id',
    unique: true,
    allowNull: true,
    comment: 'Telegram User ID'
  },
  telegramFirstName: {
    type: DataTypes.STRING,
    columnName: 'telegram_first_name',
    allowNull: true
  },
  telegramLastName: {
    type: DataTypes.STRING,
    columnName: 'telegram_last_name',
    allowNull: true
  },
  telegramUsername: {
    type: DataTypes.STRING,
    columnName: 'telegram_username',
    allowNull: true
  },
  // User Status
  isActive: {
    type: DataTypes.BOOLEAN,
    columnName: 'is_active',
    defaultValue: true
  },
  isPremium: {
    type: DataTypes.BOOLEAN,
    columnName: 'is_premium',
    defaultValue: false
  },
  // Personal Info
  email: {
    type: DataTypes.STRING,
    columnName: 'email',
    unique: true,
    allowNull: true
  },
  language: {
    type: DataTypes.STRING(10),
    columnName: 'language',
    defaultValue: 'th'
  },
  timezone: {
    type: DataTypes.STRING(50),
    columnName: 'timezone',
    defaultValue: 'Asia/Bangkok'
  },
  // Timestamps
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
  },
  lastLogin: {
    type: DataTypes.DATE,
    columnName: 'last_login',
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
  indexes: [
    // { fields: ['line_user_id'], unique: true },
    // { fields: ['telegram_user_id'], unique: true },
    // { fields: ['email'], unique: true },
    { fields: ['is_active'] },
    { fields: ['created_at'] }
  ]
});

module.exports = User;
