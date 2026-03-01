const User = require('../models/User');
const UserNotificationPreferences = require('../models/UserNotificationPreferences');
const UserTradingParameters = require('../models/UserTradingParameters');
const UserTradingPair = require('../models/UserTradingPair');
const TradingPair = require('../models/TradingPair');
const logger = require('../utils/logger');

class UserSettingsService {
  /**
   * Get complete user profile with all settings
   */
  async getUserProfile(userId) {
    try {
      const user = await User.findByPk(userId, {
        attributes: {
          exclude: ['createdAt', 'updatedAt']
        }
      });

      if (!user) {
        return null;
      }

      const notificationPrefs = await UserNotificationPreferences.findOne({
        where: { userId },
        attributes: { exclude: ['createdAt', 'updatedAt'] }
      });

      const tradingParams = await UserTradingParameters.findOne({
        where: { userId },
        attributes: { exclude: ['createdAt', 'updatedAt'] }
      });

      return {
        user: user.toJSON(),
        notificationPreferences: notificationPrefs?.toJSON(),
        tradingParameters: tradingParams?.toJSON()
      };
    } catch (error) {
      logger.error(`Error getting user profile: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user's selected trading pairs
   */
  async getUserTradingPairs(userId) {
    try {
      const pairs = await UserTradingPair.findAll({
        where: { userId },
        include: [
          {
            model: TradingPair,
            attributes: ['id', 'pairCode', 'pairName', 'assetType', 'modelAvailable']
          }
        ],
        attributes: {
          exclude: ['createdAt', 'updatedAt']
        }
      });

      return pairs.map(p => ({
        ...p.toJSON(),
        pair: p.TradingPair?.toJSON()
      }));
    } catch (error) {
      logger.error(`Error getting user trading pairs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create new user with all defaults
   */
  async createUser(userData) {
    try {
      // Create user
      const user = await User.create({
        lineUserId: userData.lineUserId,
        displayName: userData.displayName,
        pictureUrl: userData.pictureUrl,
        email: userData.email,
        language: userData.language || 'th',
        timezone: userData.timezone || 'Asia/Bangkok',
        subscriptionType: 'unsubscription' // Default to free tier
      });

      // Create default notification preferences
      await UserNotificationPreferences.create({
        userId: user.id,
        notifyLine: true,
        notifyTelegram: false
      });

      // Create default trading parameters (System Defaults)
      await UserTradingParameters.create({
        userId: user.id
      });

      // Add default pair (XAUUSD)
      const defaultPair = await TradingPair.findOne({
        where: { pairCode: 'XAUUSD' }
      });

      if (defaultPair) {
        await UserTradingPair.create({
          userId: user.id,
          pairId: defaultPair.id,
          isSelected: true
        });
      }

      logger.info(`✅ User created: ${user.id} (${userData.displayName})`);
      return user;
    } catch (error) {
      logger.error(`Error creating user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update user notification preferences
   */
  async updateNotificationPreferences(userId, preferences) {
    try {
      const [numUpdated, updatedRecords] = await UserNotificationPreferences.update(
        preferences,
        { where: { userId }, returning: true }
      );

      if (numUpdated === 0) {
        // Create if doesn't exist
        const created = await UserNotificationPreferences.create({
          userId,
          ...preferences
        });
        return created;
      }

      return updatedRecords[0];
    } catch (error) {
      logger.error(`Error updating notification preferences: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update user trading parameters
   */
  async updateTradingParameters(userId, parameters) {
    try {
      logger.warn(`🚫 User ${userId} attempted to update trading parameters. This action is now restricted.`);
      throw new Error('การปรับแต่งพารามิเตอร์ถูกระงับ (Paramiter editing is disabled)');
    } catch (error) {
      logger.error(`Error updating trading parameters: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add or update user trading pair
   */
  async updateUserTradingPair(userId, pairId, settings) {
    try {
      const user = await User.findByPk(userId);
      const pair = await TradingPair.findByPk(pairId);

      if (!user || !pair) {
        throw new Error('User or Trading Pair not found');
      }

      // Enforce subscription rules
      if (user.subscriptionType === 'unsubscription' && pair.pairCode !== 'XAUUSD') {
        throw new Error('Free tier users can only select XAUUSD');
      }

      const [record, created] = await UserTradingPair.findOrCreate({
        where: { userId, pairId },
        defaults: { ...settings, isSelected: true }
      });

      if (!created) {
        await record.update(settings);
      }

      logger.info(`✅ User trading pair updated: U${userId} - Pair${pairId}`);
      return record;
    } catch (error) {
      logger.error(`Error updating user trading pair: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add or remove trading pair for user
   */
  async toggleUserTradingPair(userId, pairCode, isSelected) {
    try {
      if (!isSelected) {
        // Allow removing any pair
      } else {
        const user = await User.findByPk(userId);
        if (user && user.subscriptionType === 'unsubscription' && pairCode !== 'XAUUSD') {
          throw new Error('Free tier users can only select XAUUSD');
        }
      }

      const pair = await TradingPair.findOne({
        where: { pairCode }
      });

      if (!pair) {
        throw new Error(`Trading pair not found: ${pairCode}`);
      }

      const [record] = await UserTradingPair.findOrCreate({
        where: { userId, pairId: pair.id },
        defaults: { isSelected }
      });

      await record.update({ isSelected });

      const action = isSelected ? 'enabled' : 'disabled';
      logger.info(`✅ Trading pair ${action}: ${pairCode} for user ${userId}`);
      return record;
    } catch (error) {
      logger.error(`Error toggling user trading pair: ${error.message}`);
      throw error;
    }
  }
  async linkTelegram(userId, telegramData) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      await user.update({
        telegramUserId: telegramData.telegramUserId,
        telegramFirstName: telegramData.firstName,
        telegramLastName: telegramData.lastName,
        telegramUsername: telegramData.username
      });

      // Enable telegram notifications
      await this.updateNotificationPreferences(userId, {
        notifyTelegram: true
      });

      logger.info(`✅ Telegram linked to user ${userId}`);
      return user;
    } catch (error) {
      logger.error(`Error linking Telegram: ${error.message}`);
      throw error;
    }
  }

  /**
   * Unlink Telegram from user
   */
  async unlinkTelegram(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      await user.update({
        telegramUserId: null,
        telegramFirstName: null,
        telegramLastName: null,
        telegramUsername: null
      });

      await this.updateNotificationPreferences(userId, {
        notifyTelegram: false
      });

      logger.info(`✅ Telegram unlinked from user ${userId}`);
      return user;
    } catch (error) {
      logger.error(`Error unlinking Telegram: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all active users for broadcasting (by channel)
   */
  async getActiveUsersForBroadcasting(channel = 'telegram', pairCode = null) {
    try {
      const notifyColumn = channel === 'telegram' ? 'notify_telegram' : 'notify_line';

      let query = `
        SELECT DISTINCT u.id, u.telegram_user_id, u.line_user_id, u.display_name, u.subscription_type
        FROM users u
        JOIN user_notification_preferences np ON u.id = np.user_id
        WHERE u.is_active = true AND np.${notifyColumn} = true
      `;

      if (pairCode) {
        query += `
          AND u.id IN (
            SELECT utp.user_id FROM user_trading_pairs utp
            JOIN trading_pairs tp ON utp.pair_id = tp.id
            WHERE tp.pair_code = '${pairCode}' AND utp.is_selected = true
          )
        `;
        
        // Enforce: Free users ONLY get XAUUSD
        if (pairCode !== 'XAUUSD') {
          query += ` AND u.subscription_type = 'subscription' `;
        }
      }

      const users = await sequelize.query(query, { type: sequelize.QueryTypes.SELECT });
      return users;
    } catch (error) {
      logger.error(`Error getting active users: ${error.message}`);
      throw error;
    }
  }

  /**
   * Record user login
   */
  async recordLogin(userId) {
    try {
      await User.update(
        { lastLogin: new Date() },
        { where: { id: userId } }
      );
    } catch (error) {
      logger.error(`Error recording login: ${error.message}`);
    }
  }
}

module.exports = new UserSettingsService();
