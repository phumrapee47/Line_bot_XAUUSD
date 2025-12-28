# LIFF Settings Setup Guide

## LIFF Information

- **LIFF ID**: `2008790639-M9uY1jY0`
- **LIFF Endpoint URL**: `https://your-domain.com/liff-settings.html`
- **Bot Linked**: Yes

## How to Use

### 1. LINE LIFF URL for Rich Menu

Use this URL in LINE Developer Console for your Rich Menu button:

```
https://liff.line.me/2008790639-M9uY1jY0
```

### 2. Rich Menu Setup

In LINE Developer Console:

**Action Type**: URI
**Label**: ⚙️ ตั้งค่า (Settings)
**URI**: `https://liff.line.me/2008790639-M9uY1jY0`

### 3. Environment Setup

Make sure these endpoints are accessible:

| Endpoint | URL |
|----------|-----|
| LIFF Web | `https://your-domain.com/liff-settings.html` |
| API Endpoint | `https://your-domain.com/api/liff/parameters` |
| Webhook | `https://your-domain.com/webhook` |

## Features Enabled

✅ **User Profile Sync**
- Retrieves LINE user ID
- Stores user in database

✅ **Parameter Adjustment**
- RSI Period (5-30 days)
- SMA Short (5-50 days)
- SMA Long (20-200 days)
- ATR Period (3-20 days)
- RSI Weight (0-100%)
- SMA Weight (0-100%)
- TP Multiplier (0.5-5.0x ATR)
- SL Multiplier (0.3-3.0x ATR)

✅ **Database Integration**
- All parameters saved per user
- Synced with trading system
- Technical model uses saved parameters

## Testing

1. Open your bot and click the settings button
2. Should see the parameter adjustment page
3. Adjust sliders
4. Click "บันทึกการตั้งค่า" (Save Settings)
5. Verify in database: check `trading_parameters` table

## Troubleshooting

If LIFF doesn't load:
1. Verify LIFF ID: `2008790639-M9uY1jY0`
2. Check endpoint URL is accessible
3. Ensure bot is linked to LIFF
4. Check LINE channel access token in `.env`

## Architecture

```
User opens Rich Menu
    ↓
Click ⚙️ ตั้งค่า button
    ↓
Opens: https://liff.line.me/2008790639-M9uY1jY0
    ↓
Loads: /frontend/liff-settings.html
    ↓
Initializes LIFF SDK → Gets user profile
    ↓
GET /api/liff/parameters?userId={userId}
    ↓
Displays sliders with current values
    ↓
User adjusts parameters
    ↓
POST /api/liff/parameters {userId, parameters}
    ↓
Saves to: trading_parameters table
    ↓
Technical model uses user parameters
    ↓
Signal calculation personalized per user ✨
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  line_user_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  picture_url TEXT,
  status_message TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Trading Parameters Table
```sql
CREATE TABLE trading_parameters (
  id INTEGER PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL,
  rsi_period INTEGER DEFAULT 14,
  sma_short INTEGER DEFAULT 20,
  sma_long INTEGER DEFAULT 50,
  atr_period INTEGER DEFAULT 7,
  rsi_weight FLOAT DEFAULT 0.3,
  sma_weight FLOAT DEFAULT 0.2,
  tp_multiplier FLOAT DEFAULT 2.0,
  sl_multiplier FLOAT DEFAULT 1.0,
  history_period TEXT DEFAULT '60d',
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## API Endpoints

### Get User Profile & Parameters
```
GET /api/liff/user/profile?userId={userId}

Response:
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "lineUserId": "U1234567890...",
      "displayName": "John",
      "pictureUrl": "...",
      "createdAt": "2025-12-28T...",
      "updatedAt": "2025-12-28T..."
    },
    "params": {
      "rsiPeriod": 14,
      "smaShort": 20,
      "smaLong": 50,
      ...
    }
  }
}
```

### Get Parameters Only
```
GET /api/liff/parameters?userId={userId}
```

### Save Parameters
```
POST /api/liff/parameters

Body:
{
  "userId": "U1234567890...",
  "parameters": {
    "rsi_period": 14,
    "sma_short": 20,
    "sma_long": 50,
    "atr_period": 7,
    "rsi_weight": 0.3,
    "sma_weight": 0.2,
    "tp_multiplier": 2.0,
    "sl_multiplier": 1.0
  }
}
```

### Reset to Default
```
POST /api/liff/parameters/reset

Body:
{
  "userId": "U1234567890..."
}
```

### Sync User Profile
```
POST /api/liff/user/sync

Body:
{
  "lineUserId": "U1234567890...",
  "profile": {
    "displayName": "John",
    "pictureUrl": "https://...",
    "statusMessage": "Hello"
  }
}
```

## Notes

- LIFF ID is embedded in frontend/liff-settings.html
- All user parameters are stored in SQLite database
- Technical model reads parameters from database per user
- Each user has their own customized signal calculation
- Parameters can be adjusted anytime from LIFF web page
