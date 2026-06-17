import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  MessageSquare, 
  BarChart3, 
  Cloud, 
  Home,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  Send,
  Plus,
  X,
  Download
} from 'lucide-react';
import useSimpleLoading from './hooks/useSimpleLoading';
import useApiService from './hooks/useApiService';
import ErrorBoundary from './components/ErrorBoundary';
import ErrorRecovery from './components/ErrorRecovery';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [comments, setComments] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [message, setMessage] = useState('');
  const [showCustomCommentDialog, setShowCustomCommentDialog] = useState(false);
  const [customComment, setCustomComment] = useState({ stakeholder_type: 'citizen', raw_text: '' });
  const [wordcloudUrl, setWordcloudUrl] = useState(null);
  const [globalError, setGlobalError] = useState(null);

  // Initialize simple loading state management
  const {
    startLoading,
    stopLoading,
    isLoading,
    withLoading,
    createLoadingHandler,
    clearAllLoading,
    getActiveOperations,
    hasAnyLoading,
    activeOperationCount
  } = useSimpleLoading();

  // Initialize API service with loading integration
  const apiService = useApiService();

  // Error boundary handlers
  const handleGlobalError = (error, errorInfo) => {
    console.error('[App] Global error caught:', error, errorInfo);
    setGlobalError({ error, errorInfo, operation: 'application' });
    // Clear any stuck loading states
    clearAllLoading('Global error cleanup');
  };

  const handleErrorRetry = () => {
    setGlobalError(null);
    // Force a re-render by clearing and resetting state
    setMessage('');
  };

  const handleGoHome = () => {
    setGlobalError(null);
    setCurrentPage('home');
    setMessage('');
    clearAllLoading('Navigation to home');
  };

  // Force hide any loading overlays on mount
  useEffect(() => {
    // Hide HTML loading fallback
    const loadingFallback = document.getElementById('loading-fallback');
    if (loadingFallback) {
      loadingFallback.style.display = 'none';
    }
    
    // Remove any loading classes from body
    document.body.classList.remove('loading');
    
    // Log successful mount
    console.log('✅ App component mounted successfully with simple loading system');
  }, []);

  // Cleanup loading states on component unmount
  useEffect(() => {
    return () => {
      // The useSimpleLoading hook handles cleanup automatically
      console.log('[App] Component unmounting, loading states cleaned up');
    };
  }, []);

  // Debug logging in development mode
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const activeOps = getActiveOperations();
      if (activeOps.length > 0) {
        console.log('[App] Active loading operations:', activeOps);
      }
    }
  });

  // Separate handlers for better performance
  const handleCommentTextChange = (e) => {
    const newText = e.target.value;
    // Update the comment text, limiting to 300 characters
    setCustomComment(prev => ({ 
      ...prev, 
      raw_text: newText.length > 300 ? newText.substring(0, 300) : newText 
    }));
  };
  
  const handleStakeholderChange = (e) => {
    setCustomComment(prev => ({ ...prev, stakeholder_type: e.target.value }));
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'upload', label: 'Upload Comments', icon: Upload },
    { id: 'comments', label: 'View Comments', icon: MessageSquare },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'wordcloud', label: 'Word Cloud', icon: Cloud },
  ];

  const fetchComments = async () => {
    try {
      const data = await apiService.fetchComments({
        onSuccess: (comments) => {
          setComments(comments);
          setMessage(`Loaded ${comments.length} comments`);
          setGlobalError(null); // Clear any previous errors
        },
        onError: (error) => {
          console.error('[App] Error loading comments:', error);
          setMessage(`Failed to load comments: ${error.message}`);
          // Don't set global error for API errors, just show message
        },
        onTimeout: (message) => {
          setMessage(`Loading comments timed out: ${message}`);
        }
      });
    } catch (error) {
      // Error already handled in onError callback
      console.error('[App] Unhandled error in fetchComments:', error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const data = await apiService.fetchDashboardStats({
        onSuccess: (stats) => {
          setDashboardStats(stats);
          setMessage('Dashboard data loaded');
          setGlobalError(null); // Clear any previous errors
        },
        onError: (error) => {
          console.error('[App] Error loading dashboard:', error);
          setMessage(`Failed to load dashboard: ${error.message}`);
        },
        onTimeout: (message) => {
          setMessage(`Dashboard loading timed out: ${message}`);
        }
      });
    } catch (error) {
      // Error already handled in onError callback
      console.error('[App] Unhandled error in fetchDashboardStats:', error);
    }
  };

  const submitTestComment = async () => {
    const testComment = {
      stakeholder_type: 'citizen',
      raw_text: 'This is a test comment to verify the AI system is working properly.'
    };

    try {
      const data = await apiService.submitComment(testComment, {
        operationName: 'submitTestComment',
        onSuccess: (result) => {
          setMessage(`Comment processed! Sentiment: ${result.sentiment_label} (${(result.sentiment_score * 100).toFixed(1)}%)`);
          setGlobalError(null); // Clear any previous errors
        },
        onError: (error) => {
          console.error('[App] Error submitting test comment:', error);
          setMessage(`Failed to process comment: ${error.message}`);
        },
        onTimeout: (message) => {
          setMessage(`Comment processing timed out: ${message}`);
        }
      });
    } catch (error) {
      // Error already handled in onError callback
      console.error('[App] Unhandled error in submitTestComment:', error);
    }
  };

  const submitCustomComment = async () => {
    if (!customComment.raw_text.trim()) {
      setMessage('Please enter a comment');
      return;
    }

    try {
      const data = await apiService.submitComment(customComment, {
        operationName: 'submitCustomComment',
        onSuccess: (result) => {
          setMessage(`Comment processed! Sentiment: ${result.sentiment_label} (${(result.sentiment_score * 100).toFixed(1)}%)`);
          setShowCustomCommentDialog(false);
          setCustomComment({ stakeholder_type: 'citizen', raw_text: '' });
          setGlobalError(null); // Clear any previous errors
        },
        onError: (error) => {
          console.error('[App] Error submitting custom comment:', error);
          setMessage(`Failed to process comment: ${error.message}`);
        },
        onTimeout: (message) => {
          setMessage(`Comment processing timed out: ${message}`);
        }
      });
    } catch (error) {
      // Error already handled in onError callback
      console.error('[App] Unhandled error in submitCustomComment:', error);
    }
  }; 
 const generateWordcloud = async (sentiment = null) => {
    try {
      const imageUrl = await apiService.generateWordcloud(sentiment, {
        onSuccess: (url, sentimentFilter) => {
          setWordcloudUrl(url);
          setMessage(`Word cloud generated successfully${sentimentFilter ? ` for ${sentimentFilter} comments` : ''}`);
          setGlobalError(null); // Clear any previous errors
        },
        onError: (error) => {
          console.error('[App] Error generating word cloud:', error);
          setMessage(`Failed to generate word cloud: ${error.message}`);
        },
        onTimeout: (message) => {
          setMessage(`Word cloud generation timed out: ${message}`);
        }
      });
    } catch (error) {
      // Error already handled in onError callback
      console.error('[App] Unhandled error in generateWordcloud:', error);
    }
  };

  const uploadCSV = async (file) => {
    setMessage(`Uploading ${file.name}...`);
    
    try {
      const data = await apiService.uploadCSV(file, {
        onSuccess: (result, uploadedFile) => {
          setMessage(`✅ Successfully processed ${result.comments?.length || 0} comments from ${uploadedFile.name}`);
          setGlobalError(null); // Clear any previous errors
        },
        onError: (error, uploadedFile) => {
          console.error('[App] Error uploading CSV:', error);
          setMessage(`❌ Failed to upload ${uploadedFile.name}: ${error.message}`);
        },
        onTimeout: (message) => {
          setMessage(`CSV upload timed out: ${message}`);
        }
      });
    } catch (error) {
      // Error already handled in onError callback
      console.error('[App] Unhandled error in uploadCSV:', error);
    }
  }; 
 const CustomCommentDialog = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Add Custom Comment</h3>
          <button onClick={() => setShowCustomCommentDialog(false)} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stakeholder Type</label>
            <select
              value={customComment.stakeholder_type}
              onChange={handleStakeholderChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="citizen">Citizen</option>
              <option value="business">Business</option>
              <option value="ngo">NGO</option>
              <option value="academic">Academic</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Comment Text</label>
            <textarea
              value={customComment.raw_text}
              onChange={handleCommentTextChange}
              placeholder="Enter your comment here (max 300 characters)..."
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
            <p className="text-sm text-gray-500 mt-1">
              {customComment.raw_text.length}/300 characters
              {customComment.raw_text.length >= 300 && (
                <span className="text-red-500 ml-2">Maximum length reached</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <button onClick={() => setShowCustomCommentDialog(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800 transition">
            Cancel
          </button>
          <button
            onClick={submitCustomComment}
            disabled={isLoading('submitCustomComment') || !customComment.raw_text.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isLoading('submitCustomComment') ? 'Processing...' : 'Submit Comment'}
          </button>
        </div>
      </div>
    </div>
  );  
const HomePage = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white">
        <h2 className="text-3xl font-bold mb-4">Welcome to eConsultation AI</h2>
        <p className="text-lg opacity-90 mb-6">AI-powered system for analyzing government consultation comments with sentiment analysis, summarization, and visualization tools.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-md">
          <TrendingUp className="h-12 w-12 text-green-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sentiment Analysis</h3>
          <p className="text-gray-600">AI-powered sentiment classification with confidence scores</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-md">
          <FileText className="h-12 w-12 text-blue-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Auto Summarization</h3>
          <p className="text-gray-600">Generate concise summaries for lengthy comments</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-md">
          <BarChart3 className="h-12 w-12 text-purple-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Analytics Dashboard</h3>
          <p className="text-gray-600">Comprehensive statistics and sentiment distribution</p>
        </div>
      </div>
      <div className="bg-white rounded-xl p-6 shadow-md">
        <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          <button onClick={() => setShowCustomCommentDialog(true)} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
            <Plus className="inline h-5 w-5 mr-2" />Add Comment
          </button>
          <button onClick={submitTestComment} disabled={isLoading('submitTestComment')} className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition disabled:opacity-50">
            <Send className="inline h-5 w-5 mr-2" />{isLoading('submitTestComment') ? 'Processing...' : 'Test System'}
          </button>
        </div>
      </div>
    </div>
  );

  const UploadPage = () => {
    const handleFileUpload = (event) => {
      const file = event.target.files[0];
      if (file) {
        if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')) {
          uploadCSV(file);
          // Reset the file input after upload
          event.target.value = '';
        } else {
          setMessage('Please select a valid CSV file (.csv extension required)');
          event.target.value = ''; // Reset the input
        }
      }
    };

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl p-8 shadow-md">
          <h2 className="text-2xl font-bold mb-6">Upload Comments from CSV</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Upload CSV File</h3>
            <p className="text-gray-600 mb-4">CSV should contain columns: stakeholder_type, raw_text</p>
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileUpload} 
              className="hidden" 
              id="csv-upload"
              disabled={isLoading('uploadCSV')}
            />
            <label 
              htmlFor="csv-upload" 
              className={`px-6 py-3 rounded-lg transition cursor-pointer inline-block ${
                isLoading('uploadCSV') 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              <Upload className="inline h-5 w-5 mr-2" />
              {isLoading('uploadCSV') ? 'Uploading...' : 'Choose CSV File'}
            </label>
          </div>
        </div>
        <div className="bg-white rounded-xl p-8 shadow-md">
          <h2 className="text-2xl font-bold mb-6">Add Individual Comment</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={() => setShowCustomCommentDialog(true)} className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition">
              <Plus className="inline h-5 w-5 mr-2" />Add Custom Comment
            </button>
            <button onClick={submitTestComment} disabled={isLoading('submitTestComment')} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
              <Send className="inline h-5 w-5 mr-2" />{isLoading('submitTestComment') ? 'Processing...' : 'Submit Test Comment'}
            </button>
          </div>
        </div>
      </div>
    );
  }; 
 const CommentsPage = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Comments ({comments.length})</h2>
          <button onClick={fetchComments} disabled={isLoading('fetchComments')} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
            {isLoading('fetchComments') ? 'Loading...' : 'Load Comments'}
          </button>
        </div>
        {comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No comments loaded yet</p>
            <button onClick={fetchComments} disabled={isLoading('fetchComments')} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
              {isLoading('fetchComments') ? 'Loading...' : 'Load Comments from Backend'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-white p-6 rounded-xl shadow-md border">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {comment.sentiment_label} ({(comment.sentiment_score * 100).toFixed(1)}%)
                    </span>
                    <p className="text-sm text-gray-500 mt-2">
                      {comment.stakeholder_type} • {comment.timestamp}
                    </p>
                  </div>
                </div>
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Summary:</h4>
                  <p className="text-gray-700">{comment.summary}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Original Comment:</h4>
                  <p className="text-gray-600 text-sm">{comment.raw_text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const DashboardPage = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-8 text-white">
        <h2 className="text-3xl font-bold mb-4">Analytics Dashboard</h2>
        <p className="text-lg opacity-90">Comprehensive comment analysis insights</p>
      </div>
      {!dashboardStats ? (
        <div className="bg-white rounded-xl p-8 shadow-md text-center">
          <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-4">Dashboard Data Not Loaded</h3>
          <p className="text-gray-600 mb-6">Click the button below to load dashboard statistics</p>
          <button onClick={fetchDashboardStats} disabled={isLoading('fetchDashboardStats')} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
            {isLoading('fetchDashboardStats') ? 'Loading...' : 'Load Dashboard Data'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Comments</p>
                <p className="text-3xl font-bold text-gray-900">{dashboardStats.total_comments}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Positive</p>
                <p className="text-3xl font-bold text-green-600">{dashboardStats.positive_percentage.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Neutral</p>
                <p className="text-3xl font-bold text-gray-600">{dashboardStats.neutral_percentage.toFixed(1)}%</p>
              </div>
              <Users className="h-8 w-8 text-gray-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Negative</p>
                <p className="text-3xl font-bold text-red-600">{dashboardStats.negative_percentage.toFixed(1)}%</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const WordCloudPage = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-8 text-white">
        <h2 className="text-3xl font-bold mb-4">Word Cloud Visualization</h2>
        <p className="text-lg opacity-90">Visual representation of key themes in comments</p>
      </div>
      <div className="bg-white rounded-xl p-6 shadow-md">
        <h3 className="text-lg font-semibold mb-4">Generate Word Cloud</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => generateWordcloud()} disabled={isLoading('generateWordcloud_all')} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
            <Cloud className="inline h-4 w-4 mr-2" />{isLoading('generateWordcloud_all') ? 'Generating...' : 'All Comments'}
          </button>
          <button onClick={() => generateWordcloud('positive')} disabled={isLoading('generateWordcloud_positive')} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50">
            <TrendingUp className="inline h-4 w-4 mr-2" />{isLoading('generateWordcloud_positive') ? 'Generating...' : 'Positive Only'}
          </button>
          <button onClick={() => generateWordcloud('negative')} disabled={isLoading('generateWordcloud_negative')} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50">
            <TrendingDown className="inline h-4 w-4 mr-2" />{isLoading('generateWordcloud_negative') ? 'Generating...' : 'Negative Only'}
          </button>
          <button onClick={() => generateWordcloud('neutral')} disabled={isLoading('generateWordcloud_neutral')} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition disabled:opacity-50">
            <Users className="inline h-4 w-4 mr-2" />{isLoading('generateWordcloud_neutral') ? 'Generating...' : 'Neutral Only'}
          </button>
        </div>
      </div>
      {wordcloudUrl ? (
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Generated Word Cloud</h3>
            <div className="flex gap-2">
              <button onClick={() => { const link = document.createElement('a'); link.href = wordcloudUrl; link.download = 'wordcloud.png'; link.click(); }} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition">
                <Download className="inline h-4 w-4 mr-1" />Download
              </button>
              <button onClick={() => setWordcloudUrl(null)} className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 transition">
                <X className="inline h-4 w-4 mr-1" />Clear
              </button>
            </div>
          </div>
          <div className="text-center">
            <img src={wordcloudUrl} alt="Word Cloud" className="max-w-full h-auto rounded-lg shadow-md mx-auto" />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-8 shadow-md text-center">
          <Cloud className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-4">No Word Cloud Generated</h3>
          <p className="text-gray-600 mb-6">Click one of the buttons above to generate a word cloud</p>
        </div>
      )}
    </div>
  );

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home': return <HomePage />;
      case 'upload': return <UploadPage />;
      case 'comments': return <CommentsPage />;
      case 'dashboard': return <DashboardPage />;
      case 'wordcloud': return <WordCloudPage />;
      default: return <HomePage />;
    }
  };

  return (
    <ErrorBoundary
      onError={handleGlobalError}
      onRetry={handleErrorRetry}
      onGoHome={handleGoHome}
      title="Application Error"
    >
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <header className="bg-white shadow-lg border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-3">
                <MessageSquare className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">eConsultation AI</h1>
                  <p className="text-sm text-gray-600">AI-Powered Comment Analysis System</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <aside className="lg:w-64">
              <nav className="bg-white rounded-xl shadow-md p-4">
                <ul className="space-y-2">
                  {navItems.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => setCurrentPage(item.id)}
                          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                            currentPage === item.id
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <IconComponent className="h-5 w-5" />
                          <span className="font-medium">{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </aside>

            <main className="flex-1">
              {/* Global Error Display */}
              {globalError && (
                <div className="mb-6">
                  <ErrorRecovery
                    error={globalError.error}
                    operation={globalError.operation}
                    context={{ errorInfo: globalError.errorInfo }}
                    onRetry={handleErrorRetry}
                    onDismiss={() => setGlobalError(null)}
                    onGoHome={handleGoHome}
                    onRefresh={() => window.location.reload()}
                    onReload={() => window.location.href = window.location.href}
                  />
                </div>
              )}

              {message && (
                <div className={`mb-6 p-4 rounded-lg ${
                  message.includes('Error') || message.includes('Failed') 
                    ? 'bg-red-50 border border-red-200 text-red-800'
                    : 'bg-green-50 border border-green-200 text-green-800'
                }`}>
                  {message}
                  <button onClick={() => setMessage('')} className="ml-4 text-sm underline hover:no-underline">
                    Dismiss
                  </button>
                </div>
              )}
              {renderCurrentPage()}
            </main>
          </div>
        </div>

        {showCustomCommentDialog && <CustomCommentDialog />}
        
        {/* Development Debug Panel */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg max-w-sm">
            <h4 className="text-sm font-bold mb-2">Simple Loading Debug Panel</h4>
            <div className="text-xs space-y-1">
              <div>Active Operations: {activeOperationCount}</div>
              {getActiveOperations().map(op => (
                <div key={op} className="text-yellow-300">• {op}</div>
              ))}
              {activeOperationCount === 0 && (
                <div className="text-green-300">✓ No active loading operations</div>
              )}
              <div className="mt-2 pt-2 border-t border-gray-700">
                <button 
                  onClick={() => clearAllLoading('Manual clear')}
                  className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded"
                >
                  Clear All Loading
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;