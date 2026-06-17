"""
Word Cloud Generation Script
Generates word cloud visualizations from comment data
"""

import sqlite3
import matplotlib.pyplot as plt
from wordcloud import WordCloud
import pandas as pd
import argparse
import os
import logging
from datetime import datetime
import re
from collections import Counter

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CommentWordCloudGenerator:
    """
    Generates word clouds from eConsultation comment data
    """
    
    def __init__(self, database_path="../backend/eConsultation.db"):
        """
        Initialize the word cloud generator
        
        Args:
            database_path: Path to SQLite database
        """
        self.database_path = database_path
        self.stop_words = self._load_stop_words()
    
    def _load_stop_words(self):
        """Load comprehensive stop words for better word cloud quality"""
        
        # Common English stop words
        english_stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 
            'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him',
            'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'
        }
        
        # Domain-specific stop words for government/policy context
        policy_stop_words = {
            'policy', 'government', 'propose', 'proposed', 'proposal', 'comment',
            'comments', 'feedback', 'opinion', 'think', 'believe', 'feel',
            'seems', 'appears', 'looks', 'said', 'says', 'mentioned', 'stated'
        }
        
        # Combine all stop words
        all_stop_words = english_stop_words.union(policy_stop_words)
        
        return all_stop_words
    
    def load_comments_from_db(self, sentiment_filter=None, stakeholder_filter=None):
        """
        Load comments from database with optional filters
        
        Args:
            sentiment_filter: Filter by sentiment (positive/neutral/negative)
            stakeholder_filter: Filter by stakeholder type
            
        Returns:
            List of comment texts
        """
        try:
            conn = sqlite3.connect(self.database_path)
            
            # Build query with filters
            query = "SELECT raw_text FROM comments WHERE 1=1"
            params = []
            
            if sentiment_filter:
                query += " AND sentiment_label = ?"
                params.append(sentiment_filter)
            
            if stakeholder_filter:
                query += " AND stakeholder_type = ?"
                params.append(stakeholder_filter)
            
            df = pd.read_sql_query(query, conn, params=params)
            conn.close()
            
            if df.empty:
                logger.warning("No comments found with specified filters")
                return []
            
            logger.info(f"Loaded {len(df)} comments from database")
            return df['raw_text'].tolist()
            
        except Exception as e:
            logger.error(f"Error loading comments from database: {str(e)}")
            return []
    
    def preprocess_text(self, texts):
        """
        Preprocess text data for word cloud generation
        
        Args:
            texts: List of text strings
            
        Returns:
            Cleaned combined text string
        """
        if not texts:
            return ""
        
        # Combine all texts
        combined_text = ' '.join(texts)
        
        # Clean text
        # Remove URLs
        combined_text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', combined_text)
        
        # Remove email addresses
        combined_text = re.sub(r'\S*@\S*\s?', '', combined_text)
        
        # Remove special characters but keep spaces and letters
        combined_text = re.sub(r'[^a-zA-Z\s]', ' ', combined_text)
        
        # Convert to lowercase
        combined_text = combined_text.lower()
        
        # Remove extra whitespace
        combined_text = re.sub(r'\s+', ' ', combined_text).strip()
        
        # Remove stop words
        words = combined_text.split()
        filtered_words = [word for word in words if word not in self.stop_words and len(word) > 2]
        
        return ' '.join(filtered_words)
    
    def generate_wordcloud(self, text, width=800, height=600, 
                          background_color='white', colormap='viridis',
                          max_words=100):
        """
        Generate word cloud from text
        
        Args:
            text: Input text for word cloud
            width: Width of the word cloud image
            height: Height of the word cloud image
            background_color: Background color
            colormap: Color scheme
            max_words: Maximum number of words to display
            
        Returns:
            WordCloud object
        """
        if not text.strip():
            logger.warning("No text available for word cloud generation")
            return None
        
        try:
            wordcloud = WordCloud(
                width=width,
                height=height,
                background_color=background_color,
                max_words=max_words,
                colormap=colormap,
                relative_scaling=0.5,
                min_font_size=12,
                max_font_size=120,
                prefer_horizontal=0.7,
                scale=2,
                collocations=False  # Avoid pairing words
            ).generate(text)
            
            return wordcloud
            
        except Exception as e:
            logger.error(f"Error generating word cloud: {str(e)}")
            return None
    
    def save_wordcloud(self, wordcloud, filepath, dpi=300):
        """
        Save word cloud to file
        
        Args:
            wordcloud: WordCloud object
            filepath: Output file path
            dpi: Image resolution
        """
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            
            plt.figure(figsize=(12, 8))
            plt.imshow(wordcloud, interpolation='bilinear')
            plt.axis('off')
            plt.tight_layout(pad=0)
            
            plt.savefig(filepath, dpi=dpi, bbox_inches='tight', 
                       facecolor='white', edgecolor='none')
            plt.close()
            
            logger.info(f"Word cloud saved to {filepath}")
            
        except Exception as e:
            logger.error(f"Error saving word cloud: {str(e)}")
    
    def generate_comparison_wordcloud(self, positive_text, negative_text, 
                                    output_path="wordcloud_comparison.png"):
        """
        Generate side-by-side comparison of positive vs negative sentiment word clouds
        
        Args:
            positive_text: Text from positive comments
            negative_text: Text from negative comments  
            output_path: Output file path
        """
        try:
            fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 8))
            
            # Generate positive word cloud
            if positive_text:
                pos_wordcloud = self.generate_wordcloud(
                    positive_text, 
                    colormap='Greens',
                    background_color='white'
                )
                if pos_wordcloud:
                    ax1.imshow(pos_wordcloud, interpolation='bilinear')
                    ax1.set_title('Positive Comments', fontsize=16, fontweight='bold', color='green')
                    ax1.axis('off')
            
            # Generate negative word cloud
            if negative_text:
                neg_wordcloud = self.generate_wordcloud(
                    negative_text,
                    colormap='Reds', 
                    background_color='white'
                )
                if neg_wordcloud:
                    ax2.imshow(neg_wordcloud, interpolation='bilinear')
                    ax2.set_title('Negative Comments', fontsize=16, fontweight='bold', color='red')
                    ax2.axis('off')
            
            plt.tight_layout()
            plt.savefig(output_path, dpi=300, bbox_inches='tight', 
                       facecolor='white', edgecolor='none')
            plt.close()
            
            logger.info(f"Comparison word cloud saved to {output_path}")
            
        except Exception as e:
            logger.error(f"Error generating comparison word cloud: {str(e)}")
    
    def generate_frequency_analysis(self, text, top_n=20):
        """
        Generate frequency analysis of words
        
        Args:
            text: Input text
            top_n: Number of top words to return
            
        Returns:
            List of (word, frequency) tuples
        """
        if not text:
            return []
        
        words = text.split()
        word_freq = Counter(words)
        
        return word_freq.most_common(top_n)
    
    def create_comprehensive_report(self, output_dir="wordcloud_analysis"):
        """
        Create comprehensive word cloud analysis report
        
        Args:
            output_dir: Output directory for all generated files
        """
        try:
            # Create output directory
            os.makedirs(output_dir, exist_ok=True)
            
            logger.info("Starting comprehensive word cloud analysis...")
            
            # Load all comments
            all_comments = self.load_comments_from_db()
            if not all_comments:
                logger.error("No comments available for analysis")
                return
            
            # Process overall word cloud
            all_text = self.preprocess_text(all_comments)
            overall_wordcloud = self.generate_wordcloud(all_text)
            if overall_wordcloud:
                self.save_wordcloud(overall_wordcloud, 
                                  os.path.join(output_dir, "overall_wordcloud.png"))
            
            # Process sentiment-specific word clouds
            positive_comments = self.load_comments_from_db(sentiment_filter='positive')
            negative_comments = self.load_comments_from_db(sentiment_filter='negative')
            neutral_comments = self.load_comments_from_db(sentiment_filter='neutral')
            
            if positive_comments:
                pos_text = self.preprocess_text(positive_comments)
                pos_wordcloud = self.generate_wordcloud(pos_text, colormap='Greens')
                if pos_wordcloud:
                    self.save_wordcloud(pos_wordcloud,
                                      os.path.join(output_dir, "positive_wordcloud.png"))
            
            if negative_comments:
                neg_text = self.preprocess_text(negative_comments)
                neg_wordcloud = self.generate_wordcloud(neg_text, colormap='Reds')
                if neg_wordcloud:
                    self.save_wordcloud(neg_wordcloud,
                                      os.path.join(output_dir, "negative_wordcloud.png"))
            
            if neutral_comments:
                neu_text = self.preprocess_text(neutral_comments)
                neu_wordcloud = self.generate_wordcloud(neu_text, colormap='Blues')
                if neu_wordcloud:
                    self.save_wordcloud(neu_wordcloud,
                                      os.path.join(output_dir, "neutral_wordcloud.png"))
            
            # Generate comparison
            if positive_comments and negative_comments:
                self.generate_comparison_wordcloud(
                    pos_text, neg_text,
                    os.path.join(output_dir, "sentiment_comparison.png")
                )
            
            # Generate frequency analysis
            freq_analysis = self.generate_frequency_analysis(all_text, top_n=30)
            
            # Save analysis report
            with open(os.path.join(output_dir, "analysis_report.txt"), 'w') as f:
                f.write("eConsultation Word Cloud Analysis Report\n")
                f.write("=" * 50 + "\n\n")
                f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"Total comments analyzed: {len(all_comments)}\n")
                f.write(f"Positive comments: {len(positive_comments)}\n")
                f.write(f"Negative comments: {len(negative_comments)}\n")
                f.write(f"Neutral comments: {len(neutral_comments)}\n\n")
                
                f.write("Top 30 Most Frequent Words:\n")
                f.write("-" * 30 + "\n")
                for i, (word, freq) in enumerate(freq_analysis, 1):
                    f.write(f"{i:2d}. {word:<20} ({freq} occurrences)\n")
            
            logger.info(f"Comprehensive analysis completed. Files saved to {output_dir}")
            
        except Exception as e:
            logger.error(f"Error creating comprehensive report: {str(e)}")

def main():
    """Main function for command-line usage"""
    
    parser = argparse.ArgumentParser(description='Generate word clouds from eConsultation comments')
    
    parser.add_argument('--database', '-d', default='../backend/eConsultation.db',
                       help='Path to SQLite database')
    parser.add_argument('--output', '-o', default='wordcloud.png',
                       help='Output file path')
    parser.add_argument('--sentiment', '-s', choices=['positive', 'negative', 'neutral'],
                       help='Filter by sentiment')
    parser.add_argument('--stakeholder', '-st', 
                       choices=['citizen', 'business', 'ngo', 'academic', 'government'],
                       help='Filter by stakeholder type')
    parser.add_argument('--comprehensive', '-c', action='store_true',
                       help='Generate comprehensive analysis report')
    parser.add_argument('--width', '-w', type=int, default=800,
                       help='Word cloud width')
    parser.add_argument('--height', '-ht', type=int, default=600,
                       help='Word cloud height')
    parser.add_argument('--max-words', '-m', type=int, default=100,
                       help='Maximum number of words')
    parser.add_argument('--colormap', '-cm', default='viridis',
                       help='Color scheme for word cloud')
    
    args = parser.parse_args()
    
    # Initialize generator
    generator = CommentWordCloudGenerator(args.database)
    
    if args.comprehensive:
        # Generate comprehensive report
        generator.create_comprehensive_report()
    else:
        # Generate single word cloud
        comments = generator.load_comments_from_db(
            sentiment_filter=args.sentiment,
            stakeholder_filter=args.stakeholder
        )
        
        if not comments:
            logger.error("No comments found with specified filters")
            return
        
        text = generator.preprocess_text(comments)
        wordcloud = generator.generate_wordcloud(
            text,
            width=args.width,
            height=args.height,
            colormap=args.colormap,
            max_words=args.max_words
        )
        
        if wordcloud:
            generator.save_wordcloud(wordcloud, args.output)
            print(f"✅ Word cloud generated: {args.output}")
        else:
            print("❌ Failed to generate word cloud")

if __name__ == "__main__":
    main()