# 🥇 Gold Trading Bot (XAUUSD)

Automated trading bot that uses Machine Learning to analyze Gold (XAUUSD) market and sends trading signals via **LINE Messaging API**.

## Features

- 📊 **Technical Analysis**: Uses XGBoost model to predict price direction
- 📰 **News Sentiment Analysis**: Analyzes news sentiment from FXStreet RSS feed
- 🔔 **LINE Messaging**: Sends trading signals directly to your LINE account via Messaging API
- ⏰ **Automated Scheduling**: Runs checks at configurable intervals
- 🎯 **Risk Management**: Automatically calculates Take Profit & Stop Loss levels

## Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── server.js              # Express server & main entry
│   │   ├── config/
│   │   │   └── config.js          # Configuration manager
│   │   ├── models/
│   │   │   └── pythonBridge.js    # Python script executor
│   │   ├── services/
│   │   │   ├── tradingSignal.js   # Trading logic
│   │   │   ├── technicalAnalysis.js
│   │   │   ├── newsAnalysis.js
│   │   │   └── lineNotifier.js    # LINE notification service
│   │   └── utils/
│   │       └── logger.js          # Winston logger
│   └── package.json
├── ml-models/
│   ├── technical_model.py         # XGBoost technical analysis
│   ├── news_model.py              # Sentiment analysis
│   ├── requirements.txt           # Python dependencies
│   └── gold_ml_model_selected.pkl # Trained XGBoost model
├── .env                           # Environment variables
└── README.md
```

## Prerequisites

- Node.js 14+
- Python 3.8+
- LINE Notify token
- Trained XGBoost model (`gold_ml_model_selected.pkl`)

## Installation

### 1. Clone and Setup

```bash
cd backend
npm install
cd ../ml-models
pip install -r requirements.txt
cd ..
```

### 2. Configure Environment

Edit `.env` file:

```env
LINE_NOTIFY_TOKEN=your_line_notify_token_here
BUY_THRESHOLD=0.60
SELL_THRESHOLD=0.40
CHECK_INTERVAL_MINUTES=60
PORT=3000
```

### 3. Get LINE Messaging API Credentials

1. Go to LINE Developers Console
2. Create a channel or use existing one
3. Get Channel Access Token
4. Find your LINE User ID (see LINE_MESSAGING_API_SETUP.md)
5. Paste both into `.env`

See [LINE_MESSAGING_API_SETUP.md](LINE_MESSAGING_API_SETUP.md) for detailed instructions.

## Running

### Development

```bash
cd backend
npm run dev
```

### Production

```bash
cd backend
npm start
```

## API Endpoints

### Health Check
```
GET /health
```

### Manual Signal Check
```
POST /api/check-signal
```

### Get Current Status
```
GET /api/status
```

Response example:
```json
{
  "lastSignal": "🟢 BUY",
  "lastSignalTime": "2025-12-20T10:30:00.000Z",
  "config": {
    "checkInterval": 60,
    "buyThreshold": 0.60,
    "sellThreshold": 0.40
  }
}
```

## How It Works

1. **Technical Analysis** (60% weight):
   - Fetches 90 days of hourly gold data
   - Calculates indicators: RSI, EMA, MACD, ATR
   - XGBoost model predicts probability of price increase

2. **News Sentiment Analysis** (40% weight):
   - Parses FXStreet RSS feed for gold-related news
   - Keyword-based sentiment scoring
   - Returns bullish/bearish probability

3. **Combined Signal**:
   - Weighted average of technical + news scores
   - **BUY**: score > 0.60
   - **SELL**: score < 0.40
   - **HOLD**: 0.40 ≤ score ≤ 0.60

4. **Risk Management**:
   - Take Profit = Price ± 3.0 × ATR
   - Stop Loss = Price ∓ 1.5 × ATR

5. **Notifications**:
   - Sends LINE message when signal changes
   - Includes confidence level & price targets

## Configuration

Edit `backend/src/config/config.js` or set environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `LINE_NOTIFY_TOKEN` | - | LINE Notify API token |
| `TECHNICAL_WEIGHT` | 0.6 | Weight of technical analysis |
| `NEWS_WEIGHT` | 0.4 | Weight of news analysis |
| `BUY_THRESHOLD` | 0.60 | Confidence score for BUY |
| `SELL_THRESHOLD` | 0.40 | Confidence score for SELL |
| `CHECK_INTERVAL_MINUTES` | 60 | Check frequency in minutes |
| `PORT` | 3000 | Server port |

## Training Your Own Model

Requirements: Historical OHLC data for XAUUSD

```python
# Use ml-models/train_model.py (you'll need to create this)
# The model file should output predictions as:
# {"probability": float, "price": float, "tp": float, "sl": float}
```

## Logging

Logs are stored in `backend/logs/`:
- `combined.log` - All logs
- `error.log` - Errors only

## Troubleshooting

### Python scripts not running
- Check Python 3.8+ installed: `python3 --version`
- Install dependencies: `pip install -r ml-models/requirements.txt`
- Verify path to Python in `pythonBridge.js`

### LINE notifications not sending
- Verify token in `.env` is correct
- Check LINE Notify connection: Test manually at LINE website
- Ensure network connection is available

### No trading signals
- Check gold data availability (yfinance)
- Verify trained model file exists at path in config
- Check logs for error messages

## Contributing

Feel free to enhance:
- Add more technical indicators
- Improve sentiment analysis with ML models
- Add database for signal history
- Create web dashboard

## License

MIT

## Support

For issues and questions, check logs and verify:
1. All dependencies installed
2. `.env` file properly configured
3. LINE token is valid
4. Python 3.8+ installed
5. XGBoost model file exists


