const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserNotificationPreferences = sequelize.define('UserNotificationPreferences', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    field: 'user_id',
    allowNull: false,
    comment: 'Link to users table'
  },
  // Channel Preferences
  notifyLine: {
    type: DataTypes.BOOLEAN,
    field: 'notify_line',
    defaultValue: true,
    comment: 'Enable LINE notifications'
  },
  notifyTelegram: {
    type: DataTypes.BOOLEAN,
    field: 'notify_telegram',
    defaultValue: true,
    comment: 'Enable Telegram notifications'
  },
  notifyEmail: {
    type: DataTypes.BOOLEAN,
    field: 'notify_email',
    defaultValue: false,
    comment: 'Enable Email notifications'
  },
  notifySms: {
    type: DataTypes.BOOLEAN,
    field: 'notify_sms',
    defaultValue: false,
    comment: 'Enable SMS notifications'
  },
  // Signal Types
  sendBuySignals: {
    type: DataTypes.BOOLEAN,
    field: 'send_buy_signals',
    defaultValue: true
  },
  sendSellSignals: {
    type: DataTypes.BOOLEAN,
    field: 'send_sell_signals',
    defaultValue: true
  },
  sendHoldSignals: {
    type: DataTypes.BOOLEAN,
    field: 'send_hold_signals',
    defaultValue: false
  },
  // Quiet Hours
  quietHoursEnabled: {
    type: DataTypes.BOOLEAN,
    field: 'quiet_hours_enabled',
    defaultValue: false
  },
  quietHoursStart: {
    type: DataTypes.STRING(5),
    field: 'quiet_hours_start',
    comment: 'HH:MM format'
  },
  quietHoursEnd: {
    type: DataTypes.STRING(5),
    field: 'quiet_hours_end',
    comment: 'HH:MM format'
  },
  timezone: {
    type: DataTypes.STRING(50),
    defaultValue: 'Asia/Bangkok'
  },
  // Thresholds
  minConfidenceThreshold: {
    type: DataTypes.DECIMAL(3, 2),
    field: 'min_confidence_threshold',
    defaultValue: 0.60
  },
  // Frequency
  maxAlertsPerDay: {
    type: DataTypes.INTEGER,
    field: 'max_alerts_per_day',
    defaultValue: 10
  },
  alertFrequency: {
    type: DataTypes.STRING(50),
    field: 'alert_frequency',
    defaultValue: 'all',
    comment: 'all, hourly, daily, weekly'
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
  }
}, {
  tableName: 'user_notification_preferences',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'], unique: true }
  ]
});

module.exports = UserNotificationPreferences;
