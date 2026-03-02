const supabaseService = require('./src/services/supabaseService');
const logger = require('./src/utils/logger');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function testUpload() {
  logger.info('Starting Supabase upload test...');
  
  if (!supabaseService.isEnabled()) {
    logger.error('Supabase is not enabled. Check your environment variables.');
    return;
  }

  // Create a dummy test file
  const testFilePath = path.join(__dirname, 'test_image.txt');
  fs.writeFileSync(testFilePath, 'This is a test file for Supabase Storage ' + new Date().toISOString());

  try {
    const destination = `tests/test_${Date.now()}.txt`;
    const publicUrl = await supabaseService.uploadFile(testFilePath, destination);
    
    if (publicUrl) {
      logger.info('✅ Test upload successful!');
      logger.info(`Public URL: ${publicUrl}`);
    } else {
      logger.error('❌ Test upload failed.');
    }
  } catch (error) {
    logger.error(`Test error: ${error.message}`);
  } finally {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  }
}

testUpload();
