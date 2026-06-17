/**
 * CommentCard Component
 * Displays individual comment with sentiment badge, summary, and metadata
 */

import React, { useState } from 'react';
import { 
  Calendar, 
  User, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  X,
  Copy,
  Share
} from 'lucide-react';

const CommentCard = ({ comment }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  // Sentiment configuration
  const sentimentConfig = {
    positive: {
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: TrendingUp,
      label: 'Positive'
    },
    negative: {
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: TrendingDown,
      label: 'Negative'
    },
    neutral: {
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: Minus,
      label: 'Neutral'
    }
  };

  // Get sentiment configuration
  const getSentimentConfig = (sentiment) => {
    return sentimentConfig[sentiment?.toLowerCase()] || sentimentConfig.neutral;
  };

  // Format date
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  // Format stakeholder type
  const formatStakeholderType = (type) => {
    return type?.charAt(0).toUpperCase() + type?.slice(1).toLowerCase() || 'Unknown';
  };

  // Get confidence color
  const getConfidenceColor = (score) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const config = getSentimentConfig(comment.sentiment_label);
  const SentimentIcon = config.icon;

  // Copy to clipboard function
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
    });
  };

  // Comment Detail Dialog Component
  const CommentDetailDialog = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Dialog Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Comment Details</h2>
              <div className="flex items-center space-x-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}>
                  <SentimentIcon className="w-4 h-4 mr-1" />
                  {config.label}
                </span>
                <span className={`text-sm font-medium ${getConfidenceColor(comment.sentiment_score)}`}>
                  {(comment.sentiment_score * 100).toFixed(1)}% confidence
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowDialog(false)}
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Dialog Content */}
        <div className="p-6 space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <User className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Stakeholder</span>
              </div>
              <p className="text-blue-800 font-semibold">{formatStakeholderType(comment.stakeholder_type)}</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Submitted</span>
              </div>
              <p className="text-green-800 font-semibold text-sm">{formatDate(comment.timestamp)}</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Comment ID</span>
              </div>
              <p className="text-purple-800 font-semibold">#{comment.id}</p>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-900">Processed</span>
              </div>
              <p className="text-orange-800 font-semibold text-sm">{formatDate(comment.created_at)}</p>
            </div>
          </div>

          {/* AI Summary Section */}
          <div className="bg-blue-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-900">AI-Generated Summary</h3>
              <button
                onClick={() => copyToClipboard(comment.summary)}
                className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-100"
                title="Copy summary"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="text-blue-800 leading-relaxed">{comment.summary || 'No summary available'}</p>
          </div>

          {/* Original Comment Section */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Original Comment</h3>
              <button
                onClick={() => copyToClipboard(comment.raw_text)}
                className="text-gray-600 hover:text-gray-800 p-2 rounded-lg hover:bg-gray-200"
                title="Copy original text"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {comment.raw_text}
              </p>
            </div>
          </div>

          {/* Analytics Section */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Text Analytics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{comment.raw_text?.length || 0}</div>
                <div className="text-sm text-gray-600">Characters</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {comment.raw_text?.split(/\s+/).filter(word => word.length > 0).length || 0}
                </div>
                <div className="text-sm text-gray-600">Words</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {comment.raw_text?.split(/[.!?]+/).filter(s => s.trim().length > 0).length || 0}
                </div>
                <div className="text-sm text-gray-600">Sentences</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getConfidenceColor(comment.sentiment_score)}`}>
                  {comment.sentiment_score?.toFixed(3) || 'N/A'}
                </div>
                <div className="text-sm text-gray-600">Confidence</div>
              </div>
            </div>
          </div>
        </div>

        {/* Dialog Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 rounded-b-xl">
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowDialog(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Comment Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3 mb-3">
              {/* Sentiment Badge */}
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}>
                <SentimentIcon className="w-4 h-4 mr-1" />
                {config.label}
              </span>
              
              {/* Confidence Score */}
              <span className={`text-sm font-medium ${getConfidenceColor(comment.sentiment_score)}`}>
                {(comment.sentiment_score * 100).toFixed(1)}% confidence
              </span>
            </div>
            
            {/* Metadata */}
            <div className="flex flex-wrap items-center text-sm text-gray-500 space-x-4">
              <div className="flex items-center space-x-1">
                <User className="w-4 h-4" />
                <span>{formatStakeholderType(comment.stakeholder_type)}</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(comment.timestamp)}</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <FileText className="w-4 h-4" />
                <span>ID: {comment.id}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={() => setShowDialog(true)}
              className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="View full details"
            >
              <Eye className="w-4 h-4" />
              <span>Details</span>
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="p-6 bg-blue-50 border-b border-gray-100">
        <div className="flex items-start space-x-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-900 mb-1">AI Summary</h4>
            <p className="text-gray-700 leading-relaxed">
              {comment.summary || 'No summary available'}
            </p>
          </div>
        </div>
      </div>

      {/* Full Text (Expandable) */}
      {isExpanded && (
        <div className="p-6 bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Original Comment</h4>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
              {comment.raw_text}
            </p>
          </div>
          
          {/* Additional Details */}
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Character Count:</span>
              <span className="ml-2 text-gray-800">{comment.raw_text?.length || 0}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Word Count:</span>
              <span className="ml-2 text-gray-800">
                {comment.raw_text?.split(/\s+/).filter(word => word.length > 0).length || 0}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Processed:</span>
              <span className="ml-2 text-gray-800">{formatDate(comment.created_at)}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Sentiment Score:</span>
              <span className={`ml-2 font-medium ${getConfidenceColor(comment.sentiment_score)}`}>
                {comment.sentiment_score?.toFixed(3) || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Comment Detail Dialog */}
      {showDialog && <CommentDetailDialog />}
    </div>
  );
};

export default CommentCard;