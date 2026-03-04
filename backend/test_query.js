const { sequelize } = require('./src/models');

async function check() {
  try {
    const [pairs] = await sequelize.query("SELECT id, pair_code FROM trading_pairs");
    console.log("PAIRS:", pairs);

    const query = `
      SELECT DISTINCT u.id, u.telegram_user_id, u.line_user_id, u.display_name, u.subscription_type
      FROM users u
      JOIN user_notification_preferences np ON u.id = np.user_id
      WHERE u.is_active = true AND np.notify_line = true
      AND u.id IN (
          SELECT utp.user_id FROM user_trading_pairs utp
          JOIN trading_pairs tp ON utp.pair_id = tp.id
          WHERE tp.pair_code = 'XAUUSD' AND utp.is_selected = true
      )
    `;
    const [users] = await sequelize.query(query);
    console.log('Resulting Users (LINE & XAUUSD):', users);
    
    const [allPairs] = await sequelize.query("SELECT * FROM user_trading_pairs WHERE user_id = 4");
    console.log('User 4 Selected Pairs:', allPairs.map(p => ({ pair_id: p.pair_id, is_selected: p.is_selected })));
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

check();
