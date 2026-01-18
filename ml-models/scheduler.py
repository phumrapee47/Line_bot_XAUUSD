#!/usr/bin/env python3
"""
XAUUSD Daily Trading Analysis Scheduler
========================================
Schedule the trading analysis to run automatically every day at a specified time.

Installation:
    pip install APScheduler

Usage:
    python scheduler.py    # Run in foreground
    python scheduler.py &  # Run in background (Linux/Mac)
    
    # Or setup as Windows Service using nssm:
    nssm install XAUUSDTradingBot python scheduler.py
    nssm start XAUUSDTradingBot
"""

import os
import sys
import time
import logging
from datetime import datetime
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(os.path.dirname(__file__), '..', 'logs', 'scheduler.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

try:
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger
except ImportError:
    logger.error("APScheduler not installed. Install with: pip install APScheduler")
    sys.exit(1)

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ML_MODELS_DIR = os.path.dirname(os.path.abspath(__file__))

def run_daily_analysis():
    """Run the daily trading analysis pipeline"""
    logger.info("="*80)
    logger.info("Starting daily XAUUSD trading analysis")
    logger.info("="*80)
    
    try:
        # Import after project root is set
        from daily_trading_pipeline import main
        success = main()
        
        if success:
            logger.info("Daily analysis completed successfully")
        else:
            logger.error("Daily analysis failed")
            
    except Exception as e:
        logger.error(f"Error running daily analysis: {e}", exc_info=True)

def main():
    """Start the scheduler"""
    logger.info("XAUUSD Daily Trading Analysis Scheduler Starting...")
    
    # Create scheduler
    scheduler = BackgroundScheduler()
    
    # Schedule analysis every day at 8:00 AM
    # You can modify this time according to your needs
    scheduler.add_job(
        run_daily_analysis,
        trigger=CronTrigger(hour=8, minute=0),  # 8:00 AM every day
        id='xauusd_daily_analysis',
        name='XAUUSD Daily Trading Analysis',
        replace_existing=True,
        max_instances=1  # Prevent concurrent runs
    )
    
    # Also add a job to run immediately on startup (optional)
    scheduler.add_job(
        run_daily_analysis,
        id='xauusd_startup_analysis',
        name='XAUUSD Startup Analysis',
        replace_existing=True,
        max_instances=1
    )
    
    try:
        scheduler.start()
        logger.info("Scheduler started successfully")
        logger.info("Daily analysis scheduled at 08:00 AM every day")
        logger.info("Press Ctrl+C to stop the scheduler")
        
        # Keep the scheduler running
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        logger.info("Scheduler interrupted by user")
        scheduler.shutdown()
        logger.info("Scheduler stopped")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Error in scheduler: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
