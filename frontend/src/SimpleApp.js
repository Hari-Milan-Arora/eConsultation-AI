/**
 * Simple Working Frontend - No Loading Screen Issues
 * This version will always show content immediately
 */

import React, { useState } from 'react';
import { 
  Upload, 
  MessageSquare, 
  BarChart3, 
  Cloud, 
  Home,
  Send,
  AlertCircle,
  CheckCircle,
  TrendingUp
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

function SimpleApp() {
  const [currentPage, setCurrentPage] = useState('home');
  const [comments, setComments] = useState([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Navigation
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'comments', label: 'Comments', icon: MessageSquare },
    { id: 'test', label: 'Test API', icon: CheckCircle },
  ];

  // Test API Connection
  const testAPI = async () => {
    setIsLoading(true);
    setMessage('Testing connection...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/`);
      const data = await response.json();
      
      if (response.ok) {
        setMessage(`✅ Backend Connected: ${data.message}`);
      } else {
        setMessage(`❌ Backend Error: ${response.status}`);
      }
    } catch (error) {
      setMessage(`❌ Connection Failed: ${error.message}`);
    }
    
    setIsLoading(false);
  };

  // Submit Test Comment
  const submitTestComment = async () => {
    setIsLoading(true);
    setMessage('Submitting test comment...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stakeholder_type: 'citizen',
          raw_text: 'This is a test comment to verify the system is working properly.'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessage(`✅ Comment Processed! Sentiment: ${data.sentiment_label} (${(data.sentiment_score * 100).toFixed(1)}%)`);
        // Refresh comments
        loadComments();
      } else {
        setMessage(`❌ Submit Failed: ${response.status}`);
      }
    } catch (error) {
      setMessage(`❌ Submit Error: ${error.message}`);
    }
    
    setIsLoading(false);
  };

  // Load Comments
  const loadComments = async () => {
    setIsLoading(true);
    setMessage('Loading comments...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/comments`);
      
      if (response.ok) {
        const data = await response.json();
        setComments(data);
        setMessage(`✅ Loaded ${data.length} comments`);
      } else {
        setMessage(`❌ Load Failed: ${response.status}`);
      }
    } catch (error) {
      setMessage(`❌ Load Error: ${error.message}`);
    }
    
    setIsLoading(false);
  };

  // Render Pages
  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onTestAPI={testAPI} message={message} />;
      case 'upload':
        return <UploadPage onSubmit={submitTestComment} message={message} />;
      case 'comments':
        return <CommentsPage comments={comments} onLoad={loadComments} message={message} />;
      case 'test':
        return <TestPage onTest={testAPI} onSubmit={submitTestComment} onLoad={loadComments} message={message} />;
      default:
        return <HomePage onTestAPI={testAPI} message={message} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">eConsultation AI</h1>
            </div>
            <div className="text-sm text-gray-600">
              Backend: {API_BASE_URL}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <nav className="w-64">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="space-y-2">
                {navItems.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentPage(item.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition ${
                        currentPage === item.id
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <IconComponent className="h-5 w-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1">
            {/* Loading Indicator */}
            {isLoading && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-2">
                  <div className={`h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full ${isLoading ? 'loading-spinner-active' : ''}`}></div>
                  <span className="text-blue-800">Processing...</span>
                </div>
              </div>
            )}

            {/* Message Display */}
            {message && (
              <div className={`border rounded-lg p-4 mb-4 ${
                message.includes('✅') ? 'bg-green-50 border-green-200 text-green-800' :
                message.includes('❌') ? 'bg-red-50 border-red-200 text-red-800' :
                'bg-yellow-50 border-yellow-200 text-yellow-800'
              }`}>
                {message}
              </div>
            )}

            {renderPage()}
          </main>
        </div>
      </div>
    </div>
  );
}

// Page Components
const HomePage = ({ onTestAPI, message }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-2xl font-bold mb-4">Welcome to eConsultation AI</h2>
    <p className="text-gray-600 mb-6">
      AI-powered system for analyzing government consultation comments.
    </p>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="border border-gray-200 rounded-lg p-4">
        <TrendingUp className="h-8 w-8 text-green-600 mb-2" />
        <h3 className="font-semibold">Sentiment Analysis</h3>
        <p className="text-sm text-gray-600">Classify comments as positive, negative, or neutral</p>
      </div>
      <div className="border border-gray-200 rounded-lg p-4">
        <MessageSquare className="h-8 w-8 text-blue-600 mb-2" />
        <h3 className="font-semibold">Auto Summarization</h3>
        <p className="text-sm text-gray-600">Generate concise summaries of long comments</p>
      </div>
      <div className="border border-gray-200 rounded-lg p-4">
        <BarChart3 className="h-8 w-8 text-purple-600 mb-2" />
        <h3 className="font-semibold">Analytics Dashboard</h3>
        <p className="text-sm text-gray-600">View statistics and trends</p>
      </div>
    </div>

    <button
      onClick={onTestAPI}
      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition flex items-center space-x-2"
    >
      <CheckCircle className="h-5 w-5" />
      <span>Test Backend Connection</span>
    </button>
  </div>
);

const UploadPage = ({ onSubmit, message }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-2xl font-bold mb-4">Upload Comments</h2>
    <p className="text-gray-600 mb-6">Submit comments for AI analysis</p>
    
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">Test Comment Submission</h3>
      <p className="text-gray-600 mb-4">
        Click the button below to submit a test comment and verify the system is working.
      </p>
      
      <button
        onClick={onSubmit}
        className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition flex items-center space-x-2 mx-auto"
      >
        <Send className="h-5 w-5" />
        <span>Submit Test Comment</span>
      </button>
    </div>
  </div>
);

const CommentsPage = ({ comments, onLoad, message }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold">Comments ({comments.length})</h2>
      <button
        onClick={onLoad}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
      >
        Refresh Comments
      </button>
    </div>
    
    {comments.length === 0 ? (
      <div className="text-center py-8">
        <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No comments loaded yet. Click "Refresh Comments" to load.</p>
      </div>
    ) : (
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                comment.sentiment_label === 'positive' ? 'bg-green-100 text-green-800' :
                comment.sentiment_label === 'negative' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {comment.sentiment_label?.toUpperCase()}
              </span>
              <span className="text-xs text-gray-500">ID: {comment.id}</span>
            </div>
            <p className="text-sm text-gray-700 mb-2">{comment.summary}</p>
            <div className="text-xs text-gray-500">
              {comment.stakeholder_type} • {comment.timestamp}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const TestPage = ({ onTest, onSubmit, onLoad, message }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-2xl font-bold mb-4">API Testing</h2>
    <p className="text-gray-600 mb-6">Test all backend functionality</p>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <button
        onClick={onTest}
        className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition"
      >
        <CheckCircle className="h-8 w-8 mx-auto mb-2" />
        <span className="block">Test Connection</span>
      </button>
      
      <button
        onClick={onSubmit}
        className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition"
      >
        <Send className="h-8 w-8 mx-auto mb-2" />
        <span className="block">Submit Comment</span>
      </button>
      
      <button
        onClick={onLoad}
        className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition"
      >
        <MessageSquare className="h-8 w-8 mx-auto mb-2" />
        <span className="block">Load Comments</span>
      </button>
    </div>
  </div>
);

export default SimpleApp;