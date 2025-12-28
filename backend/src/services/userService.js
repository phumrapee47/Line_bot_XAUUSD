const User = require('../models/User');
const TradingParameters = require('../models/TradingParameters');
const logger = require('../utils/logger');

class UserService {
  // Create or update user
  async syncLineUser(lineUserId, profile) {
    try {
      const [user, created] = await User.findOrCreate({
        where: { lineUserId },
        defaults: {
          lineUserId,
          displayName: profile.displayName || null,
          pictureUrl: profile.pictureUrl || null,
          statusMessage: profile.statusMessage || null
        }
      });

      // Update profile if exists
      if (!created) {
        await user.update({
          displayName: profile.displayName || user.displayName,
          pictureUrl: profile.pictureUrl || user.pictureUrl,
          statusMessage: profile.statusMessage || user.statusMessage
        });
      }

      // Create default trading parameters if not exists
      const [params] = await TradingParameters.findOrCreate({
        where: { userId: user.id },
        defaults: { userId: user.id }
      });

      logger.info(`User synced: ${lineUserId}`);
      return { user, params, created };
    } catch (error) {
      logger.error(`Error syncing user: ${error.message}`);
      throw error;
    }
  }

  // Get user with parameters
  async getUserWithParams(lineUserId) {
    try {
      const user = await User.findOne({
        where: { lineUserId },
        include: [TradingParameters]
      });

      if (!user) {
        return null;
      }

      return {
        user: user.toJSON(),
        params: user.TradingParameter?.toJSON() || null
      };
    } catch (error) {
      logger.error(`Error getting user: ${error.message}`);
      throw error;
    }
  }

  // Update user trading parameters
  async updateUserParameters(lineUserId, parameters) {
    try {
      const user = await User.findOne({ where: { lineUserId } });

      if (!user) {
        throw new Error('User not found');
      }

      const [params] = await TradingParameters.findOrCreate({
        where: { userId: user.id },
        defaults: { userId: user.id, ...parameters }
      });

      await params.update(parameters);
      logger.info(`Parameters updated for user: ${lineUserId}`);
      return params.toJSON();
    } catch (error) {
      logger.error(`Error updating parameters: ${error.message}`);
      throw error;
    }
  }

  // Get user parameters
  async getUserParameters(lineUserId) {
    try {
      const user = await User.findOne({ where: { lineUserId } });

      if (!user) {
        return null;
      }

      const params = await TradingParameters.findOne({
        where: { userId: user.id }
      });

      return params?.toJSON() || null;
    } catch (error) {
      logger.error(`Error getting parameters: ${error.message}`);
      throw error;
    }
  }

  // Reset user parameters to default
  async resetUserParameters(lineUserId) {
    try {
      const user = await User.findOne({ where: { lineUserId } });

      if (!user) {
        throw new Error('User not found');
      }

      const params = await TradingParameters.findOne({
        where: { userId: user.id }
      });

      if (!params) {
        throw new Error('Parameters not found');
      }

      const defaults = {
        rsiPeriod: 14,
        smaShort: 20,
        smaLong: 50,
        atrPeriod: 7,
        rsiWeight: 0.3,
        smaWeight: 0.2,
        tpMultiplier: 2.0,
        slMultiplier: 1.0,
        historyPeriod: '60d'
      };

      await params.update(defaults);
      logger.info(`Parameters reset for user: ${lineUserId}`);
      return params.toJSON();
    } catch (error) {
      logger.error(`Error resetting parameters: ${error.message}`);
      throw error;
    }
  }

  // Get all users
  async getAllUsers(limit = 100, offset = 0) {
    try {
      const users = await User.findAll({
        include: [TradingParameters],
        limit,
        offset,
        order: [['updatedAt', 'DESC']]
      });

      return users.map(u => ({
        user: u.toJSON(),
        params: u.TradingParameter?.toJSON() || null
      }));
    } catch (error) {
      logger.error(`Error getting users: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new UserService();
