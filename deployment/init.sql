-- eConsultation AI Database Initialization Script

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS econsultation;

-- Use the database
\c econsultation;

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    stakeholder_type VARCHAR(50) NOT NULL CHECK (stakeholder_type IN ('citizen', 'business', 'ngo', 'academic')),
    raw_text TEXT NOT NULL,
    sentiment_label VARCHAR(20) NOT NULL CHECK (sentiment_label IN ('positive', 'negative', 'neutral')),
    sentiment_score DECIMAL(5,4) NOT NULL CHECK (sentiment_score >= 0 AND sentiment_score <= 1),
    summary VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comments_sentiment ON comments(sentiment_label);
CREATE INDEX IF NOT EXISTS idx_comments_stakeholder ON comments(stakeholder_type);
CREATE INDEX IF NOT EXISTS idx_comments_timestamp ON comments(timestamp);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_comments_updated_at 
    BEFORE UPDATE ON comments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO comments (stakeholder_type, raw_text, sentiment_label, sentiment_score, summary) VALUES
('citizen', 'This policy will greatly benefit our community and improve quality of life.', 'positive', 0.9234, 'Policy benefits community quality of life.'),
('business', 'The new regulations are too restrictive and will hurt small businesses.', 'negative', 0.8567, 'Regulations too restrictive for small business.'),
('ngo', 'We appreciate the government''s effort but more consultation is needed.', 'neutral', 0.6789, 'Appreciates effort, needs more consultation.'),
('academic', 'The research methodology behind this policy is sound and well-researched.', 'positive', 0.8901, 'Research methodology is sound and thorough.'),
('citizen', 'I strongly oppose this legislation as it violates our fundamental rights.', 'negative', 0.9123, 'Strongly opposes, cites rights violations.');

-- Create a view for dashboard statistics
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT 
    COUNT(*) as total_comments,
    COUNT(CASE WHEN sentiment_label = 'positive' THEN 1 END) as positive_count,
    COUNT(CASE WHEN sentiment_label = 'negative' THEN 1 END) as negative_count,
    COUNT(CASE WHEN sentiment_label = 'neutral' THEN 1 END) as neutral_count,
    ROUND(COUNT(CASE WHEN sentiment_label = 'positive' THEN 1 END) * 100.0 / COUNT(*), 2) as positive_percentage,
    ROUND(COUNT(CASE WHEN sentiment_label = 'negative' THEN 1 END) * 100.0 / COUNT(*), 2) as negative_percentage,
    ROUND(COUNT(CASE WHEN sentiment_label = 'neutral' THEN 1 END) * 100.0 / COUNT(*), 2) as neutral_percentage
FROM comments;

-- Create a view for stakeholder breakdown
CREATE OR REPLACE VIEW stakeholder_stats AS
SELECT 
    stakeholder_type,
    COUNT(*) as count,
    COUNT(CASE WHEN sentiment_label = 'positive' THEN 1 END) as positive_count,
    COUNT(CASE WHEN sentiment_label = 'negative' THEN 1 END) as negative_count,
    COUNT(CASE WHEN sentiment_label = 'neutral' THEN 1 END) as neutral_count,
    ROUND(AVG(sentiment_score), 4) as avg_sentiment_score
FROM comments 
GROUP BY stakeholder_type;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON DATABASE econsultation TO admin;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin;
-- Codex note: refreshed to remove stale helper references.
