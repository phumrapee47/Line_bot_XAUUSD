const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  lineUserId: {
    type: DataTypes.STRING,
    columnName: 'line_user_id',
    unique: true,
    allowNull: false,
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
  tableName: 'users',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['line_user_id'], unique: true }
  ]
});

module.exports = User;
