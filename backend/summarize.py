"""
Text Summarization Module
Provides summarization capabilities using T5-small and BART models
"""

import logging
from transformers import pipeline, T5Tokenizer, T5ForConditionalGeneration
import torch
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CommentSummarizer:
    """
    Handles text summarization for eConsultation comments
    Uses multiple models for optimal results
    """
    
    def __init__(self, model_name="facebook/bart-large-cnn"):
        """
        Initialize the summarizer with specified model
        
        Args:
            model_name: HuggingFace model name for summarization
        """
        self.model_name = model_name
        self.summarizer = None
        self.backup_summarizer = None
        self._load_models()
    
    def _load_models(self):
        """Load the summarization models"""
        try:
            logger.info(f"Loading primary summarizer: {self.model_name}")
            self.summarizer = pipeline(
                "summarization",
                model=self.model_name,
                max_length=50,
                min_length=5,
                do_sample=False,
                device=0 if torch.cuda.is_available() else -1
            )
            
            # Load backup model for shorter texts
            logger.info("Loading backup T5-small summarizer...")
            self.backup_summarizer = pipeline(
                "summarization",
                model="t5-small",
                max_length=30,
                min_length=5,
                do_sample=False,
                device=0 if torch.cuda.is_available() else -1
            )
            
            logger.info("Summarization models loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading summarization models: {str(e)}")
            raise
    
    def preprocess_text(self, text):
        """
        Preprocess text before summarization
        
        Args:
            text: Input text to preprocess
            
        Returns:
            Cleaned and preprocessed text
        """
        if not isinstance(text, str):
            text = str(text)
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Remove very short sentences that might not be meaningful
        sentences = text.split('.')
        meaningful_sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
        text = '. '.join(meaningful_sentences)
        
        # Ensure text ends with proper punctuation
        if text and not text.endswith(('.', '!', '?')):
            text += '.'
        
        return text
    
    def summarize_comment(self, text, max_length=40):
        """
        Generate a concise summary of the comment
        
        Args:
            text: Input comment text
            max_length: Maximum length of summary
            
        Returns:
            Generated summary string
        """
        try:
            # Preprocess the text
            processed_text = self.preprocess_text(text)
            
            # Handle very short texts
            if len(processed_text.split()) < 5:
                return processed_text[:100] + "..." if len(processed_text) > 100 else processed_text
            
            # Choose model based on text length
            word_count = len(processed_text.split())
            
            if word_count < 20:
                # Use backup model for shorter texts
                summarizer = self.backup_summarizer
                max_len = min(max_length, 25)
                min_len = min(5, max_len - 5)
            else:
                # Use primary model for longer texts
                summarizer = self.summarizer
                max_len = max_length
                min_len = min(8, max_len - 10)
            
            # Generate summary
            summary_result = summarizer(
                processed_text,
                max_length=max_len,
                min_length=min_len,
                do_sample=False,
                truncation=True
            )
            
            summary = summary_result[0]['summary_text']
            
            # Post-process summary
            summary = self.postprocess_summary(summary, max_length)
            
            return summary
            
        except Exception as e:
            logger.warning(f"Summarization failed: {str(e)}")
            # Fallback to simple truncation
            return self.fallback_summarize(text, max_length)
    
    def postprocess_summary(self, summary, max_length):
        """
        Post-process the generated summary
        
        Args:
            summary: Generated summary
            max_length: Maximum allowed length
            
        Returns:
            Cleaned summary
        """
        # Remove redundant whitespace
        summary = re.sub(r'\s+', ' ', summary).strip()
        
        # Ensure proper capitalization
        if summary:
            summary = summary[0].upper() + summary[1:] if len(summary) > 1 else summary.upper()
        
        # Truncate if too long
        if len(summary) > max_length * 5:  # Approximate character limit
            words = summary.split()
            if len(words) > max_length:
                summary = ' '.join(words[:max_length]) + "..."
        
        # Ensure proper ending punctuation
        if summary and not summary.endswith(('.', '!', '?', '...')):
            summary += "."
        
        return summary
    
    def fallback_summarize(self, text, max_length=40):
        """
        Fallback summarization method using simple truncation
        
        Args:
            text: Input text
            max_length: Maximum length in words
            
        Returns:
            Truncated text summary
        """
        words = text.split()
        if len(words) <= max_length:
            return text
        
        # Take first max_length words
        summary = ' '.join(words[:max_length]) + "..."
        return summary
    
    def batch_summarize(self, texts, max_length=40):
        """
        Summarize multiple texts in batch
        
        Args:
            texts: List of texts to summarize
            max_length: Maximum length for each summary
            
        Returns:
            List of summaries
        """
        summaries = []
        
        for i, text in enumerate(texts):
            try:
                summary = self.summarize_comment(text, max_length)
                summaries.append(summary)
                
                # Log progress for large batches
                if (i + 1) % 10 == 0:
                    logger.info(f"Processed {i + 1}/{len(texts)} summaries")
                    
            except Exception as e:
                logger.error(f"Error summarizing text {i}: {str(e)}")
                summaries.append(self.fallback_summarize(text, max_length))
        
        return summaries
    
    def get_model_info(self):
        """
        Get information about loaded models
        
        Returns:
            Dictionary with model information
        """
        return {
            "primary_model": self.model_name,
            "backup_model": "t5-small",
            "device": "cuda" if torch.cuda.is_available() else "cpu",
            "status": "loaded" if self.summarizer else "not loaded"
        }

# Utility functions for standalone usage
def create_summarizer(model_name="facebook/bart-large-cnn"):
    """
    Create a new CommentSummarizer instance
    
    Args:
        model_name: HuggingFace model name
        
    Returns:
        CommentSummarizer instance
    """
    return CommentSummarizer(model_name)

def quick_summarize(text, max_length=40):
    """
    Quick summarization using default settings
    
    Args:
        text: Text to summarize
        max_length: Maximum summary length
        
    Returns:
        Summary string
    """
    summarizer = CommentSummarizer()
    return summarizer.summarize_comment(text, max_length)

# Example usage and testing
def test_summarizer():
    """Test the summarization functionality"""
    
    # Sample comments for testing
    test_comments = [
        "This policy will greatly benefit small businesses and create more jobs in our community. I fully support this initiative and believe it addresses key economic challenges.",
        "The proposed regulations are too restrictive and will harm our ability to compete in the market effectively.",
        "We appreciate the government's efforts to address environmental concerns but more concrete measures are needed for implementation.",
        "I am completely against this proposal as it will increase taxes for middle-class families and burden the economy unnecessarily.",
        "The research methodology behind this policy is sound and addresses key socioeconomic issues effectively with proper evidence."
    ]
    
    logger.info("Testing Comment Summarizer...")
    
    try:
        summarizer = CommentSummarizer()
        
        print("\nSummarization Test Results:")
        print("=" * 60)
        
        for i, comment in enumerate(test_comments, 1):
            summary = summarizer.summarize_comment(comment)
            print(f"\nComment {i}:")
            print(f"Original ({len(comment.split())} words): {comment}")
            print(f"Summary ({len(summary.split())} words): {summary}")
            print("-" * 60)
        
        # Test batch summarization
        print("\nTesting batch summarization...")
        batch_summaries = summarizer.batch_summarize(test_comments[:3])
        print(f"Batch processed: {len(batch_summaries)} summaries")
        
        # Model info
        print(f"\nModel Info: {summarizer.get_model_info()}")
        
        print("\n✅ All tests completed successfully!")
        
    except Exception as e:
        logger.error(f"Test failed: {str(e)}")
        raise

if __name__ == "__main__":
    # Run tests if script is executed directly
    test_summarizer()