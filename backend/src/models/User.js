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
    unique: true,
    allowNull: false,
    comment: 'LINE User ID'
  },
  displayName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'User display name from LINE'
  },
  pictureUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'User profile picture URL'
  },
  statusMessage: {
    type: DataTypes.STRING,
    allowNull: true
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
  tableName: 'users',
  indexes: [
    { fields: ['lineUserId'], unique: true }
  ]
});

module.exports = User;
