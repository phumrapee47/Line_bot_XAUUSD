const { 
  User, 
  UserNotificationPreferences, 
  UserTradingParameters, 
  UserTradingPair, 
  TradingPair,
  sequelize
} = require('../models');
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
            as: 'TradingPair',
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
   * Helper to retry DB operations on timeout
   */
  async withRetry(operation, maxRetries = 3, delay = 2000) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        // Only retry on timeout or connection errors
        const isTimeout = error.message?.includes('timeout') || error.name?.includes('Timeout');
        if (isTimeout && i < maxRetries - 1) {
          logger.warn(`⚠️ DB Operation Timeout (Attempt ${i + 1}/${maxRetries}). Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  /**
   * Get all active users for broadcasting (by channel)
   */
  async getActiveUsersForBroadcasting(channel = 'telegram', pairCode = null) {
    return this.withRetry(async () => {
      try {
        const notifyColumn = channel === 'telegram' ? 'notifyTelegram' : 'notifyLine';
        
        const where = {
          isActive: true
        };

        const include = [
          {
            model: UserNotificationPreferences,
            as: 'UserNotificationPreference',
            where: {
              [notifyColumn]: true
            },
            required: true
          }
        ];

        if (pairCode) {
          include.push({
            model: UserTradingPair,
            as: 'UserTradingPairs',
            where: {
              isSelected: true
            },
            required: true,
            include: [
              {
                model: TradingPair,
                as: 'TradingPair',
                where: {
                  pairCode: pairCode
                },
                required: true
              }
            ]
          });

          // Enforce: Free users ONLY get XAUUSD
          if (pairCode !== 'XAUUSD') {
            where.subscriptionType = 'subscription';
          }
        }

        const users = await User.findAll({
          where,
          include,
          attributes: ['id', 'telegramUserId', 'lineUserId', 'displayName', 'subscriptionType'],
          // Increase per-query timeout slightly for this specific slow join
          timeout: 45000 
        });

        return users.map(u => u.get({ plain: true }));
      } catch (error) {
        logger.error(`Error in getActiveUsersForBroadcasting: ${error.message}`);
        throw error;
      }
    });
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
