#!/bin/bash
# Gold Trading Bot Startup Script

echo "🥇 Gold Trading Bot Startup"
echo "============================"

# Check Python installation
echo "Checking Python..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found. Please install Python 3.8+"
    exit 1
fi
echo "✅ Python $(python3 --version)"

# Install Python dependencies
echo ""
echo "Installing Python dependencies..."
cd ml-models
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "❌ Failed to install Python dependencies"
    exit 1
fi
echo "✅ Python dependencies installed"
cd ..

# Check Node.js installation
echo ""
echo "Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 14+"
    exit 1
fi
echo "✅ Node $(node --version)"

# Install Node dependencies
echo ""
echo "Installing Node.js dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install Node dependencies"
    exit 1
fi
echo "✅ Node dependencies installed"

# Create logs directory
mkdir -p logs

# Check .env file
echo ""
if [ ! -f "../.env" ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp .env.template ../.env 2>/dev/null || echo "Please configure .env file with your LINE_NOTIFY_TOKEN"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the bot, run:"
echo "  cd backend"
echo "  npm start          # Production mode"
echo "  npm run dev        # Development mode (with auto-reload)"
echo ""
echo "Don't forget to set your LINE_NOTIFY_TOKEN in .env file!"
