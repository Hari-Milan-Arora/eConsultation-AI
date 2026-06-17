#!/usr/bin/env python3
"""
WordCloud Generator for eConsultation AI
Standalone script to generate word clouds from comment data
"""

import sqlite3
import os
import logging
from wordcloud import WordCloud
import matplotlib.pyplot as plt
import numpy as np
from PIL import Image

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WordCloudGenerator:
    """Generate word clouds from comment data"""
    
    def __init__(self, db_path="eConsultation.db"):
        self.db_path = db_path
        self.output_dir = "temp"
        os.makedirs(self.output_dir, exist_ok=True)
    
    def get_comments_text(self, sentiment_filter=None):
        """Get all comment text from database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            if sentiment_filter:
                cursor.execute(
                    'SELECT raw_text FROM comments WHERE sentiment_label = ?',
                    (sentiment_filter,)
                )
            else:
                cursor.execute('SELECT raw_text FROM comments')
            
            rows = cursor.fetchall()
            conn.close()
            
            if not rows:
                logger.warning("No comments found in database")
                return ""
            
            # Combine all texts
            all_text = ' '.join([row[0] for row in rows if row[0]])
            logger.info(f"Retrieved {len(rows)} comments, total text length: {len(all_text)}")
            
            return all_text
            
        except Exception as e:
            logger.error(f"Error retrieving comments: {e}")
            return ""
    
    def clean_text(self, text):
        """Clean text for word cloud generation"""
        # Remove common stop words and policy-specific terms
        stop_words = {
            'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
            'may', 'might', 'must', 'can', 'shall', 'policy', 'proposal', 'government',
            'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can'
        }
        
        # Split into words and filter
        words = text.lower().split()
        filtered_words = [word for word in words if word not in stop_words and len(word) > 3]
        
        return ' '.join(filtered_words)
    
    def generate_basic_wordcloud(self, text, filename="wordcloud.png", sentiment=None):
        """Generate a basic word cloud"""
        if not text.strip():
            logger.error("No text provided for word cloud generation")
            return None
        
        try:
            # Clean the text
            cleaned_text = self.clean_text(text)
            
            # Choose color scheme based on sentiment
            if sentiment == 'positive':
                colormap = 'Greens'
            elif sentiment == 'negative':
                colormap = 'Reds'
            elif sentiment == 'neutral':
                colormap = 'Blues'
            else:
                colormap = 'viridis'
            
            # Generate word cloud
            wordcloud = WordCloud(
                width=800,
                height=600,
                background_color='white',
                max_words=100,
                colormap=colormap,
                relative_scaling=0.5,
                min_font_size=10,
                max_font_size=100,
                prefer_horizontal=0.7
            ).generate(cleaned_text)
            
            # Save the word cloud
            output_path = os.path.join(self.output_dir, filename)
            wordcloud.to_file(output_path)
            
            logger.info(f"Word cloud saved to {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Error generating word cloud: {e}")
            return None
    
    def generate_advanced_wordcloud(self, text, filename="advanced_wordcloud.png"):
        """Generate an advanced word cloud with custom styling"""
        if not text.strip():
            logger.error("No text provided for word cloud generation")
            return None
        
        try:
            # Clean the text
            cleaned_text = self.clean_text(text)
            
            # Create custom color function
            def color_func(word, font_size, position, orientation, random_state=None, **kwargs):
                # Color words based on their importance (font size)
                if font_size > 50:
                    return "rgb(0, 100, 0)"  # Green for important words
                elif font_size > 30:
                    return "rgb(0, 0, 150)"  # Blue for medium words
                else:
                    return "rgb(100, 100, 100)"  # Gray for less important words
            
            # Generate word cloud
            wordcloud = WordCloud(
                width=1200,
                height=800,
                background_color='white',
                max_words=150,
                relative_scaling=0.5,
                min_font_size=8,
                max_font_size=120,
                prefer_horizontal=0.8,
                color_func=color_func
            ).generate(cleaned_text)
            
            # Create matplotlib figure
            plt.figure(figsize=(15, 10))
            plt.imshow(wordcloud, interpolation='bilinear')
            plt.axis('off')
            plt.title('eConsultation AI - Comment Analysis Word Cloud', 
                     fontsize=16, fontweight='bold', pad=20)
            
            # Save the figure
            output_path = os.path.join(self.output_dir, filename)
            plt.savefig(output_path, dpi=300, bbox_inches='tight', 
                       facecolor='white', edgecolor='none')
            plt.close()
            
            logger.info(f"Advanced word cloud saved to {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Error generating advanced word cloud: {e}")
            return None
    
    def generate_sentiment_wordclouds(self):
        """Generate separate word clouds for each sentiment"""
        sentiments = ['positive', 'negative', 'neutral']
        generated_files = []
        
        for sentiment in sentiments:
            text = self.get_comments_text(sentiment_filter=sentiment)
            if text:
                filename = f"wordcloud_{sentiment}.png"
                output_path = self.generate_basic_wordcloud(text, filename, sentiment)
                if output_path:
                    generated_files.append(output_path)
        
        return generated_files
    
    def generate_all_wordclouds(self):
        """Generate all types of word clouds"""
        logger.info("Generating all word clouds...")
        
        # Get all comments text
        all_text = self.get_comments_text()
        
        if not all_text:
            logger.error("No text available for word cloud generation")
            return []
        
        generated_files = []
        
        # Generate basic word cloud
        basic_path = self.generate_basic_wordcloud(all_text, "wordcloud.png")
        if basic_path:
            generated_files.append(basic_path)
        
        # Generate advanced word cloud
        advanced_path = self.generate_advanced_wordcloud(all_text, "advanced_wordcloud.png")
        if advanced_path:
            generated_files.append(advanced_path)
        
        # Generate sentiment-specific word clouds
        sentiment_files = self.generate_sentiment_wordclouds()
        generated_files.extend(sentiment_files)
        
        logger.info(f"Generated {len(generated_files)} word cloud files")
        return generated_files

def main():
    """Main function for standalone execution"""
    logger.info("Starting WordCloud Generator...")
    
    generator = WordCloudGenerator()
    
    # Check if database exists
    if not os.path.exists(generator.db_path):
        logger.error(f"Database not found: {generator.db_path}")
        logger.info("Please run the backend server first to create the database")
        return
    
    # Generate all word clouds
    files = generator.generate_all_wordclouds()
    
    if files:
        logger.info("Word cloud generation completed successfully!")
        logger.info("Generated files:")
        for file in files:
            logger.info(f"  - {file}")
    else:
        logger.error("No word clouds were generated")

if __name__ == "__main__":
    main()