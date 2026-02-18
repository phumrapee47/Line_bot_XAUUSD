
const initDatabase = require('./src/config/initDatabase');
const logger = require('./src/utils/logger');

// Mock logger to avoid cluttering real logs if needed, or just use it.
// We'll let it log to console.

async function verify() {
  console.log('🧪 Starting Database Verification...');
  try {
    const success = await initDatabase();
    if (success) {
      console.log('✅ VERIFICATION PASSED: Database initialized successfully.');
      process.exit(0);
    } else {
      console.error('❌ VERIFICATION FAILED: Database initialization returned false.');
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ VERIFICATION SPLODED: ${error.message}`);
    process.exit(1);
  }
}

verify();
