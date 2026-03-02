const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const logger = require('../utils/logger');

class SupabaseService {
  constructor() {
    if (config.supabase.url && config.supabase.key) {
      this.supabase = createClient(config.supabase.url, config.supabase.key);
      logger.info('Supabase client initialized');
    } else {
      logger.warn('Supabase credentials missing. Storage features will be disabled.');
    }
  }

  /**
   * Upload a local file to Supabase Storage
   * @param {string} localFilePath Path to the local file
   * @param {string} destinationPath Path in the bucket (e.g., 'predictions/image.png')
   * @returns {Promise<string|null>} The public URL of the uploaded file
   */
  async uploadFile(localFilePath, destinationPath) {
    if (!this.supabase) {
      logger.error('Supabase client not initialized');
      return null;
    }

    try {
      if (!fs.existsSync(localFilePath)) {
        logger.error(`File not found: ${localFilePath}`);
        return null;
      }

      const fileBuffer = fs.readFileSync(localFilePath);
      const fileExt = path.extname(localFilePath).toLowerCase();
      let contentType = 'application/octet-stream';
      
      if (fileExt === '.png') contentType = 'image/png';
      else if (fileExt === '.jpg' || fileExt === '.jpeg') contentType = 'image/jpeg';
      else if (fileExt === '.json') contentType = 'application/json';

      const { data, error } = await this.supabase.storage
        .from(config.supabase.bucket)
        .upload(destinationPath, fileBuffer, {
          contentType,
          upsert: true
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: publicUrlData } = this.supabase.storage
        .from(config.supabase.bucket)
        .getPublicUrl(destinationPath);

      logger.info(`File uploaded to Supabase: ${destinationPath}`);
      return publicUrlData.publicUrl;
    } catch (error) {
      logger.error(`Error uploading to Supabase: ${error.message}`);
      return null;
    }
  }

  /**
   * Check if Supabase is enabled
   */
  isEnabled() {
    return !!this.supabase;
  }
}

module.exports = new SupabaseService();
