const { User } = require('../models');
const { Op } = require('sequelize');
const crypto = require('crypto');
const logger = require('../utils/logger');

class LinkHandler {
  /**
   * Generates a 6-digit random code and saves it to the user.
   * @param {string} lineUserId 
   * @returns {Object} { code, expiresAt }
   */
  async generateCode(lineUserId) {
    try {
      // Find or create user
      let [user] = await User.findOrCreate({
        where: { lineUserId },
        defaults: { isActive: true }
      });

      // Generate a 6-digit number
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      await user.update({
        linkCode: code,
        linkCodeExpiresAt: expiresAt
      });

      logger.info(`Generated link code for user ${lineUserId}: ${code}`);
      return { code, expiresAt };
    } catch (error) {
      logger.error(`Error generating link code: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verifies the code and links the Telegram user ID to the user record.
   * @param {string} code 
   * @param {Object} telegramData { id, username, first_name, last_name }
   * @returns {Object} { success, message, user }
   */
  async verifyCode(code, telegramData) {
    try {
      const user = await User.findOne({
        where: {
          linkCode: code,
          linkCodeExpiresAt: {
            [Op.gt]: new Date()
          }
        }
      });

      if (!user) {
        return { success: false, message: 'Invalid or expired code. Please request a new one.' };
      }

      // Check if this Telegram ID is already linked to another user
      const existingTelegramUser = await User.findOne({
        where: { 
          telegramUserId: telegramData.id.toString(),
          lineUserId: { [Op.ne]: user.lineUserId }
        }
      });

      if (existingTelegramUser) {
        return { success: false, message: 'This Telegram account is already linked to another LINE user.' };
      }

      // Update user with Telegram data
      await user.update({
        telegramUserId: telegramData.id.toString(),
        telegramUsername: telegramData.username,
        telegramFirstName: telegramData.first_name,
        telegramLastName: telegramData.last_name,
        linkCode: null, // Clear the code after use
        linkCodeExpiresAt: null
      });

      logger.info(`Successfully linked Telegram user ${telegramData.id} to LINE user ${user.lineUserId}`);
      return { success: true, message: 'Successfully linked!', user };
    } catch (error) {
      logger.error(`Error verifying link code: ${error.message}`);
      return { success: false, message: 'Internal server error occurred.' };
    }
  }

  /**
   * Checks the linking status of a LINE user.
   * @param {string} lineUserId 
   * @returns {Object} status
   */
  async getLinkStatus(lineUserId) {
    try {
      const user = await User.findOne({
        where: { lineUserId },
        attributes: ['telegramUserId', 'telegramUsername']
      });

      if (!user || !user.telegramUserId) {
        return { linked: false };
      }

      return { 
        linked: true, 
        telegramUsername: user.telegramUsername || user.telegramUserId 
      };
    } catch (error) {
      logger.error(`Error getting link status: ${error.message}`);
      return { linked: false, error: error.message };
    }
  }

  /**
   * Unlinks Telegram account from user.
   * @param {string} lineUserId 
   */
  async unlinkTelegram(lineUserId) {
    try {
      const user = await User.findOne({ where: { lineUserId } });
      if (user) {
        await user.update({
          telegramUserId: null,
          telegramUsername: null,
          telegramFirstName: null,
          telegramLastName: null
        });
        logger.info(`Unlinked Telegram for user ${lineUserId}`);
        return { success: true };
      }
      return { success: false, message: 'User not found' };
    } catch (error) {
      logger.error(`Error unlinking Telegram: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new LinkHandler();
