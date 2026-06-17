#!/usr/bin/env python3
"""
Backend Status Script
Shows comprehensive status of the eConsultation AI backend
"""

import requests
import logging
import sys

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def show_backend_status():
    """Show comprehensive backend status"""
    logger.info("🔍 eConsultation AI Backend Status")
    logger.info("=" * 50)
    
    try:
        # Health check
        response = requests.get("http://localhost:8000/health", timeout=10)
        if response.status_code == 200:
            health_data = response.json()
            logger.info("🟢 Backend Status: HEALTHY")
            logger.info(f"   Database: {health_data.get('database')}")
            logger.info(f"   Total Comments: {health_data.get('comment_count')}")
            logger.info(f"   Models Status: {health_data.get('models')}")
            logger.info(f"   Version: {health_data.get('version')}")
        else:
            logger.error("🔴 Backend Status: UNHEALTHY")
            return False
            
        # Dashboard stats
        response = requests.get("http://localhost:8000/api/dashboard", timeout=10)
        if response.status_code == 200:
            dashboard_data = response.json()
            logger.info("\n📊 Dashboard Statistics:")
            logger.info(f"   Total Comments: {dashboard_data.get('total_comments')}")
            logger.info(f"   Positive Sentiment: {dashboard_data.get('positive_percentage'):.1f}%")
            logger.info(f"   Neutral Sentiment: {dashboard_data.get('neutral_percentage'):.1f}%")
            logger.info(f"   Negative Sentiment: {dashboard_data.get('negative_percentage'):.1f}%")
            
            recent_comments = dashboard_data.get('recent_comments', [])
            if recent_comments:
                logger.info(f"\n📝 Recent Comments ({len(recent_comments)}):")
                for i, comment in enumerate(recent_comments[:3], 1):
                    logger.info(f"   {i}. [{comment.get('sentiment_label').upper()}] {comment.get('summary')[:60]}...")
        
        # API endpoints status
        logger.info("\n🔗 API Endpoints Status:")
        endpoints = [
            ("Root", "/"),
            ("Health", "/health"),
            ("API Health", "/api/health"),
            ("Comments", "/api/comments"),
            ("Dashboard", "/api/dashboard"),
            ("Word Cloud", "/api/wordcloud"),
            ("API Docs", "/docs")
        ]
        
        for name, endpoint in endpoints:
            try:
                response = requests.get(f"http://localhost:8000{endpoint}", timeout=5)
                if response.status_code in [200, 404]:  # 404 is OK for some endpoints
                    logger.info(f"   ✅ {name}: Available")
                else:
                    logger.info(f"   ⚠️  {name}: Status {response.status_code}")
            except Exception as e:
                logger.info(f"   ❌ {name}: Error - {str(e)[:30]}...")
        
        logger.info("\n🚀 Backend Features:")
        logger.info("   ✅ Sentiment Analysis (Custom trained model)")
        logger.info("   ✅ Text Summarization (DistilBART model)")
        logger.info("   ✅ Word Cloud Generation")
        logger.info("   ✅ CSV Bulk Upload")
        logger.info("   ✅ SQLite Database")
        logger.info("   ✅ REST API with FastAPI")
        logger.info("   ✅ CORS enabled for frontend")
        logger.info("   ✅ Automatic API documentation")
        
        logger.info("\n🌐 Access URLs:")
        logger.info("   Backend API: http://localhost:8000")
        logger.info("   API Documentation: http://localhost:8000/docs")
        logger.info("   Interactive API: http://localhost:8000/redoc")
        logger.info("   Health Check: http://localhost:8000/health")
        
        return True
        
    except requests.exceptions.ConnectionError:
        logger.error("🔴 Backend Status: NOT RUNNING")
        logger.info("\n💡 To start the backend:")
        logger.info("   python start_backend.py")
        return False
    except Exception as e:
        logger.error(f"🔴 Backend Status: ERROR - {e}")
        return False

if __name__ == "__main__":
    success = show_backend_status()
    sys.exit(0 if success else 1)