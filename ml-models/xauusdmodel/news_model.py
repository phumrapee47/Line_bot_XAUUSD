#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
News Sentiment Analysis Model
วิเคราะห์ความรู้สึกจากข่าวทองคำ
"""

import feedparser
import json
import sys
from transformers import pipeline
import numpy as np

NEWS_RSS_URL = "https://www.fxstreet.com/rss/news"

def fetch_gold_news(limit=30):
    """ดึงข่าวที่เกี่ยวกับทองคำ"""
    try:
        feed = feedparser.parse(NEWS_RSS_URL)
        entries = feed.entries[:limit]
        
        news_items = []
        for entry in entries:
            title = entry.get('title', '')
            summary = entry.get('summary', '')
            text = f"{title}. {summary}"
            
            # Filter gold-related news
            if any(keyword in text.lower() for keyword in ['gold', 'xau', 'precious metal']):
                news_items.append({
                    'title': title,
                    'text': text
                })
        
        return news_items
    except Exception as e:
        return []

def analyze_sentiment_simple(text):
    """Simple keyword-based sentiment analysis"""
    text_lower = text.lower()
    
    bullish_words = ['rise', 'gain', 'up', 'surge', 'rally', 'bullish', 'higher', 'support', 'climb', 'soar']
    bearish_words = ['fall', 'drop', 'down', 'decline', 'bearish', 'lower', 'resistance', 'plunge', 'tumble', 'weak']
    
    bullish_count = sum(1 for word in bullish_words if word in text_lower)
    bearish_count = sum(1 for word in bearish_words if word in text_lower)
    
    total = bullish_count + bearish_count
    if total == 0:
        return 0.5
    
    return bullish_count / total

def get_news_sentiment():
    """คำนวณคะแนน sentiment จากข่าว"""
    try:
        news_items = fetch_gold_news()
        
        if not news_items:
            return {
                "score": 0.5,
                "news_count": 0,
                "error": "No gold news found"
            }
        
        # Analyze sentiment for each news
        sentiments = []
        for item in news_items:
            sentiment = analyze_sentiment_simple(item['text'])
            sentiments.append(sentiment)
        
        avg_sentiment = float(np.mean(sentiments))
        
        return {
            "score": avg_sentiment,
            "news_count": len(news_items),
            "sentiments": sentiments
        }
    
    except Exception as e:
        return {
            "score": 0.5,
            "news_count": 0,
            "error": str(e)
        }

if __name__ == "__main__":
    result = get_news_sentiment()
    print(json.dumps(result))
    sys.stdout.flush()
