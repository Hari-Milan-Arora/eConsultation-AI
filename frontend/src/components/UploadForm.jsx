/**
 * UploadForm Component
 * Handles both single comment submission and CSV bulk upload
 */

import React, { useState } from 'react';
import { 
  Upload, 
  FileText, 
  Send, 
  AlertCircle, 
  CheckCircle,
  Loader,
  Download,
  Users,
  MessageSquare
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const UploadForm = ({ onSuccess }) => {
  // State management
  const [activeTab, setActiveTab] = useState('single'); // 'single' or 'bulk'
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  // Single comment state
  const [singleComment, setSingleComment] = useState({
    stakeholder_type: '',
    raw_text: ''
  });

  // Bulk upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Stakeholder types
  const stakeholderTypes = [
    { value: 'citizen', label: 'Citizen' },
    { value: 'business', label: 'Business' },
    { value: 'ngo', label: 'NGO' },
    { value: 'academic', label: 'Academic' },
    { value: 'government', label: 'Government' },
    { value: 'other', label: 'Other' }
  ];

  // Reset form states
  const resetStates = () => {
    setError(null);
    setSuccess(null);
  };

  // Handle single comment submission
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    
    if (!singleComment.stakeholder_type || !singleComment.raw_text.trim()) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      resetStates();

      const response = await fetch(`${API_BASE_URL}/api/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(singleComment)
      });

      if (!response.ok) {
        throw new Error('Failed to submit comment');
      }

      const result = await response.json();
      
      setSuccess({
        type: 'single',
        message: 'Comment submitted and analyzed successfully!',
        data: result
      });

      // Reset form
      setSingleComment({ stakeholder_type: '', raw_text: '' });
      
      // Notify parent component
      if (onSuccess) onSuccess();

    } catch (err) {
      setError(err.message || 'Failed to submit comment');
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (file) => {
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      resetStates();
    } else {
      setError('Please select a valid CSV file');
    }
  };

  // Handle drag and drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Handle bulk upload
  const handleBulkUpload = async () => {
    if (!selectedFile) {
      setError('Please select a CSV file');
      return;
    }

    try {
      setLoading(true);
      resetStates();

      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`${API_BASE_URL}/api/comments/bulk`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload CSV file');
      }

      const result = await response.json();
      
      setSuccess({
        type: 'bulk',
        message: result.message,
        count: result.comments?.length || 0
      });

      // Reset form
      setSelectedFile(null);
      
      // Notify parent component
      if (onSuccess) onSuccess();

    } catch (err) {
      setError(err.message || 'Failed to upload CSV file');
    } finally {
      setLoading(false);
    }
  };

  // Download sample CSV
  const downloadSampleCSV = () => {
    const csvContent = `stakeholder_type,raw_text
citizen,This policy will benefit our community and create more jobs.
business,The proposed regulations seem too restrictive for small businesses.
ngo,We support this initiative but suggest more environmental safeguards.
academic,The research methodology behind this policy is scientifically sound.`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample_comments.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-md">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
            <Upload className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Upload Comments</h2>
            <p className="text-gray-600">Submit comments for AI-powered analysis</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('single')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'single'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>Single Comment</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'bulk'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Bulk Upload (CSV)</span>
            </div>
          </button>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <h3 className="font-medium text-green-900">{success.message}</h3>
              {success.type === 'bulk' && success.count && (
                <p className="text-sm text-green-700 mt-1">
                  {success.count} comments processed successfully
                </p>
              )}
              {success.type === 'single' && success.data && (
                <p className="text-sm text-green-700 mt-1">
                  Sentiment: {success.data.sentiment_label} 
                  ({(success.data.sentiment_score * 100).toFixed(1)}% confidence)
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="font-medium text-red-900">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form Content */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {activeTab === 'single' ? (
          /* Single Comment Form */
          <form onSubmit={handleSingleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="inline h-4 w-4 mr-1" />
                Stakeholder Type
              </label>
              <select
                value={singleComment.stakeholder_type}
                onChange={(e) => setSingleComment({
                  ...singleComment,
                  stakeholder_type: e.target.value
                })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select stakeholder type...</option>
                {stakeholderTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MessageSquare className="inline h-4 w-4 mr-1" />
                Comment Text
              </label>
              <textarea
                value={singleComment.raw_text}
                onChange={(e) => setSingleComment({
                  ...singleComment,
                  raw_text: e.target.value
                })}
                placeholder="Enter your comment here..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={6}
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                {singleComment.raw_text.length} characters
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader className={`h-4 w-4 ${loading ? 'loading-spinner-active' : ''}`} />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Submit Comment</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* Bulk Upload Form */
          <div className="p-6 space-y-6">
            {/* Sample CSV Download */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-blue-900">Need a sample CSV format?</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Download our sample CSV to see the required format
                  </p>
                </div>
                <button
                  onClick={downloadSampleCSV}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Sample</span>
                </button>
              </div>
            </div>

            {/* File Upload Area */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              
              {selectedFile ? (
                <div className="space-y-2">
                  <p className="text-lg font-medium text-gray-900">File Selected</p>
                  <p className="text-sm text-gray-600">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-lg font-medium text-gray-900">
                    Drop your CSV file here, or click to browse
                  </p>
                  <p className="text-sm text-gray-600">
                    Supports CSV files up to 10MB
                  </p>
                </div>
              )}

              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
                className="hidden"
                id="csv-file-input"
              />
              
              <label
                htmlFor="csv-file-input"
                className="inline-block mt-4 px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors"
              >
                Browse Files
              </label>
            </div>

            {/* CSV Format Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">CSV Format Requirements</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Must contain columns: <code className="bg-gray-200 px-1 rounded">stakeholder_type</code> and <code className="bg-gray-200 px-1 rounded">raw_text</code></li>
                <li>• Stakeholder types: citizen, business, ngo, academic, government, other</li>
                <li>• Each row represents one comment</li>
                <li>• Comments should be properly escaped for CSV format</li>
              </ul>
            </div>

            {/* Upload Button */}
            <button
              onClick={handleBulkUpload}
              disabled={!selectedFile || loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader className={`h-4 w-4 ${loading ? 'loading-spinner-active' : ''}`} />
                  <span>Processing CSV...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Upload CSV File</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadForm;