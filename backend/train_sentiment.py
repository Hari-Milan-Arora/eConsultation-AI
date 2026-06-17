"""
Sentiment Analysis Model Training Script (CPU-only, Windows safe)
- Forces CPU (no CUDA required)
- Sets multiprocessing start method to "spawn" to avoid DataLoader hangs on Windows
- Keeps previous fixes (num_workers=0, pin_memory=False)
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
from transformers import (
    AutoTokenizer, AutoModelForSequenceClassification,
    TrainingArguments, Trainer, EarlyStoppingCallback
)
import torch
from torch.utils.data import Dataset
import os
import logging
import time
import multiprocessing

# Force CPU only
device = torch.device("cpu")

# Reduce tokenizer parallelism warnings / contention
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Limit PyTorch threads to reduce chance of resource contention/hangs
try:
    torch.set_num_threads(1)
    torch.set_num_interop_threads(1)
    logger.info("Set torch thread limits to 1")
except Exception as e:
    logger.warning(f"Could not set torch thread limits: {e}")


class CommentDataset(Dataset):
    """Dataset which receives pre-tokenized encodings (tensors) and labels"""
    def __init__(self, encodings, labels):
        self.encodings = encodings
        self.labels = labels
    
    def __len__(self):
        return len(self.labels)
    
    def __getitem__(self, idx):
        item = {
            'input_ids': self.encodings['input_ids'][idx],
            'attention_mask': self.encodings['attention_mask'][idx],
            'labels': torch.tensor(int(self.labels[idx]), dtype=torch.long)
        }
        return item


def load_and_preprocess_data(data_path='../data/sample_comments.csv'):
    """Load and preprocess the comments dataset"""
    logger.info("Loading dataset...")
    if not os.path.exists(data_path):
        logger.error(f"Data file not found at path: {data_path}")
        raise FileNotFoundError(f"Data file not found at path: {data_path}")
    
    df = pd.read_csv(data_path)
    
    # Clean and preprocess
    df = df.dropna(subset=['raw_text', 'sentiment_label'])
    df['raw_text'] = df['raw_text'].astype(str).str.strip()
    
    # Map sentiment labels to integers
    label_mapping = {
        'positive': 2,
        'neutral': 1,
        'negative': 0
    }
    
    df['label'] = df['sentiment_label'].map(label_mapping)
    df = df.dropna(subset=['label'])  # Remove unmapped labels
    df['label'] = df['label'].astype(int)
    
    logger.info(f"Dataset loaded: {len(df)} samples")
    logger.info(f"Label distribution:\n{df['sentiment_label'].value_counts()}")
    
    return df


def create_datasets(df, tokenizer, test_size=0.2, val_size=0.1, max_length=512):
    """Create train, validation, and test datasets with pre-tokenization"""
    texts = df['raw_text'].values
    labels = df['label'].values
    
    # Split into train and test
    X_train_val, X_test, y_train_val, y_test = train_test_split(
        texts, labels, test_size=test_size, random_state=42, stratify=labels
    )
    
    # Split train into train and validation
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_val, y_train_val, test_size=val_size/(1-test_size),
        random_state=42, stratify=y_train_val
    )
    
    logger.info("Starting batch tokenization (this may take a moment for large datasets)...")
    start = time.time()
    # Tokenize each split in batch (pre-tokenize)
    train_encodings = tokenizer(
        list(X_train),
        truncation=True,
        padding='max_length',
        max_length=max_length,
        return_tensors='pt'
    )
    val_encodings = tokenizer(
        list(X_val),
        truncation=True,
        padding='max_length',
        max_length=max_length,
        return_tensors='pt'
    )
    test_encodings = tokenizer(
        list(X_test),
        truncation=True,
        padding='max_length',
        max_length=max_length,
        return_tensors='pt'
    )
    elapsed = time.time() - start
    logger.info(f"Batch tokenization completed in {elapsed:.2f} seconds")
    
    # Create datasets from encodings
    train_dataset = CommentDataset(train_encodings, y_train)
    val_dataset = CommentDataset(val_encodings, y_val)
    test_dataset = CommentDataset(test_encodings, y_test)
    
    logger.info(f"Train samples: {len(train_dataset)}")
    logger.info(f"Validation samples: {len(val_dataset)}")
    logger.info(f"Test samples: {len(test_dataset)}")
    
    return train_dataset, val_dataset, test_dataset, y_test


def compute_metrics(eval_pred):
    """Compute metrics for evaluation"""
    predictions, labels = eval_pred
    predictions = np.argmax(predictions, axis=1)
    
    accuracy = accuracy_score(labels, predictions)
    
    return {
        'accuracy': accuracy,
    }


def load_tokenizer_and_model(model_name="distilbert-base-uncased", num_labels=3):
    """Attempt to load tokenizer and model from local cache first, then fallback to online download."""
    tokenizer = None
    model = None
    try:
        logger.info("Attempting to load tokenizer and model from local cache (local_files_only=True)...")
        tokenizer = AutoTokenizer.from_pretrained(model_name, local_files_only=True)
        model = AutoModelForSequenceClassification.from_pretrained(
            model_name,
            num_labels=num_labels,
            id2label={0: "negative", 1: "neutral", 2: "positive"},
            label2id={"negative": 0, "neutral": 1, "positive": 2},
            local_files_only=True
        )
        logger.info("Loaded tokenizer and model from local cache.")
        return tokenizer, model
    except Exception as e_local:
        logger.warning(f"Local load failed: {e_local}")
    
    try:
        logger.info("Falling back to online download for tokenizer and model...")
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForSequenceClassification.from_pretrained(
            model_name,
            num_labels=num_labels,
            id2label={0: "negative", 1: "neutral", 2: "positive"},
            label2id={"negative": 0, "neutral": 1, "positive": 2}
        )
        logger.info("Downloaded tokenizer and model from Hugging Face hub.")
        return tokenizer, model
    except Exception as e_online:
        logger.error(f"Failed to load model/tokenizer from online: {e_online}")
        raise


def train_model():
    """Main training function"""
    logger.info("Starting sentiment analysis model training...")
    
    df = load_and_preprocess_data()
    
    model_name = "distilbert-base-uncased"
    tokenizer, model = load_tokenizer_and_model(model_name=model_name, num_labels=3)
    
    # Force CPU
    model.to(device)
    
    train_dataset, val_dataset, test_dataset, y_test = create_datasets(df, tokenizer)
    
    training_args = TrainingArguments(
        output_dir='./results',
        num_train_epochs=3,
        per_device_train_batch_size=16,
        per_device_eval_batch_size=16,
        warmup_steps=500,
        weight_decay=0.01,
        logging_dir='./logs',
        logging_steps=100,
        eval_strategy="steps",
        eval_steps=200,
        save_strategy="steps",
        save_steps=200,
        load_best_model_at_end=True,
        metric_for_best_model="accuracy",
        greater_is_better=True,
        save_total_limit=2,
        seed=42,
        report_to=None,
        dataloader_num_workers=0,
        dataloader_pin_memory=False,
        disable_tqdm=True
    )
    
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        compute_metrics=compute_metrics,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=3)]
    )
    logger.info("Trainer initialized successfully")
    
    logger.info("Starting training on CPU...")
    trainer.train()
    logger.info("Training completed successfully")
    
    logger.info("Evaluating on test set...")
    test_results = trainer.evaluate(test_dataset)
    logger.info(f"Test results: {test_results}")
    
    test_predictions = trainer.predict(test_dataset)
    y_pred = np.argmax(test_predictions.predictions, axis=1)
    
    target_names = ['negative', 'neutral', 'positive']
    report = classification_report(y_test, y_pred, target_names=target_names)
    logger.info(f"Classification Report:\n{report}")
    
    cm = confusion_matrix(y_test, y_pred)
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=target_names, yticklabels=target_names)
    plt.title('Confusion Matrix - Sentiment Analysis')
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    os.makedirs('models', exist_ok=True)
    plt.savefig('models/confusion_matrix.png', dpi=300, bbox_inches='tight')
    
    accuracy = accuracy_score(y_test, y_pred)
    logger.info(f"Final Test Accuracy: {accuracy:.4f}")
    
    model_save_path = "models/sentiment_model"
    os.makedirs(model_save_path, exist_ok=True)
    trainer.save_model(model_save_path)
    tokenizer.save_pretrained(model_save_path)
    
    with open('models/training_report.txt', 'w') as f:
        f.write("eConsultation Sentiment Analysis Model Training Report\n")
        f.write("=" * 60 + "\n\n")
        f.write(f"Model: {model_name}\n")
        f.write(f"Training samples: {len(train_dataset)}\n")
        f.write(f"Validation samples: {len(val_dataset)}\n")
        f.write(f"Test samples: {len(test_dataset)}\n\n")
        f.write(f"Final Test Accuracy: {accuracy:.4f}\n\n")
        f.write("Classification Report:\n")
        f.write(report)
        f.write("\n\nModel saved to: " + model_save_path)
    
    return model, tokenizer, accuracy


def evaluate_model_performance():
    logger.info("Performing additional model evaluation...")
    df = load_and_preprocess_data()
    
    if 'stakeholder_type' in df.columns:
        stakeholder_analysis = df.groupby(['stakeholder_type', 'sentiment_label']).size().unstack(fill_value=0)
        logger.info("Sentiment distribution by stakeholder type:")
        logger.info(stakeholder_analysis)
        
        plt.figure(figsize=(12, 6))
        stakeholder_analysis.plot(kind='bar', stacked=True)
        plt.title('Sentiment Distribution by Stakeholder Type')
        plt.xlabel('Stakeholder Type')
        plt.ylabel('Number of Comments')
        plt.legend(title='Sentiment')
        plt.xticks(rotation=45)
        plt.tight_layout()
        os.makedirs('models', exist_ok=True)
        plt.savefig('models/stakeholder_sentiment_distribution.png', dpi=300, bbox_inches='tight')
    else:
        logger.warning("Column 'stakeholder_type' not found in dataset; skipping stakeholder analysis.")


if __name__ == "__main__":
    multiprocessing.set_start_method("spawn", force=True)
    try:
        model, tokenizer, accuracy = train_model()
        evaluate_model_performance()
        
        print("\n" + "="*60)
        print("TRAINING COMPLETED SUCCESSFULLY!")
        print("="*60)
        print(f"✅ Final Test Accuracy: {accuracy:.4f}")
        print("✅ Model saved to: models/sentiment_model/")
        print("✅ Confusion matrix: models/confusion_matrix.png")
        print("✅ Training report: models/training_report.txt")
        print("✅ Stakeholder analysis: models/stakeholder_sentiment_distribution.png")
        print("\nYou can now use the trained model in your FastAPI application!")
        
    except Exception as e:
        logger.error(f"Training failed: {str(e)}")
        raise
