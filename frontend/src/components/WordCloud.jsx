/**
 * WordCloud Component
 * Displays word cloud visualization of comment keywords
 */

import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Download, 
  RefreshCw, 
  AlertCircle,
  Image as ImageIcon,
  Loader
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const WordCloud = () => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastGenerated, setLastGenerated] = useState(null);

  // Generate word cloud
  const generateWordCloud = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/wordcloud`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No comments available for word cloud generation');
        }
        throw new Error('Failed to generate word cloud');
      }

      // Convert response to blob and create object URL
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Clean up previous URL
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
      
      setImageUrl(url);
      setLastGenerated(new Date());
      
    } catch (err) {
      setError(err.message || 'Failed to generate word cloud');
      console.error('Error generating word cloud:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load word cloud on component mount
  useEffect(() => {
    generateWordCloud();
    
    // Cleanup function
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, []);

  // Download word cloud image
  const downloadWordCloud = () => {
    if (imageUrl) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `wordcloud_${new Date().toISOString().split('T')[0]}.png`;
      link.click();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-2 rounded-lg">
              <Cloud className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Word Cloud</h2>
              <p className="text-gray-600">Visual representation of most frequent keywords</p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={generateWordCloud}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'loading-spinner-active' : ''}`} />
              <span>Regenerate</span>
            </button>
            
            {imageUrl && (
              <button
                onClick={downloadWordCloud}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200"
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Last Generated Info */}
        {lastGenerated && (
          <div className="mt-4 text-sm text-gray-500">
            Last generated: {lastGenerated.toLocaleString()}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-red-900">Error Generating Word Cloud</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              {error.includes('No comments available') && (
                <p className="text-sm text-red-600 mt-2">
                  Upload some comments first to generate a word cloud visualization.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Word Cloud Display */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {loading ? (
          /* Loading State */
          <div className="h-96 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Loader className={`h-12 w-12 text-blue-600 mx-auto mb-4 ${loading ? 'loading-spinner-active' : ''}`} />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Generating Word Cloud</h3>
              <p className="text-gray-600">Analyzing comments and creating visualization...</p>
            </div>
          </div>
        ) : imageUrl ? (
          /* Word Cloud Image */
          <div className="relative">
            <img
              src={imageUrl}
              alt="Word Cloud Visualization"
              className="w-full h-auto max-h-96 object-contain bg-white"
              style={{ minHeight: '400px' }}
            />
            
            {/* Image Overlay Info */}
            <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-lg text-sm">
              Generated from comment data
            </div>
          </div>
        ) : !error ? (
          /* Empty State */
          <div className="h-96 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <ImageIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Word Cloud Available</h3>
              <p className="text-gray-600 mb-4">Click "Regenerate" to create a word cloud visualization</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Information Panel */}
      <div className="bg-white rounded-xl p-6 shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">About Word Clouds</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">How it works</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Analyzes all comment text to identify frequent words</li>
              <li>• Removes common stop words (the, and, or, etc.)</li>
              <li>• Sizes words based on frequency</li>
              <li>• Creates visual representation with colors</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Key features</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Real-time generation from current comments</li>
              <li>• Download as PNG image</li>
              <li>• Automatic color scheme</li>
              <li>• High-quality visualization</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <Cloud className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-900">Tip</h4>
              <p className="text-sm text-blue-800 mt-1">
                Larger words in the cloud represent terms that appear more frequently in the comments. 
                This helps identify key themes and topics in the feedback.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Details */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Technical Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Generation Process</h4>
            <div className="text-gray-600">
              <p>• Text preprocessing and cleaning</p>
              <p>• Frequency analysis</p>
              <p>• Visual layout optimization</p>
              <p>• Image rendering and export</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Image Specifications</h4>
            <div className="text-gray-600">
              <p>• Format: PNG</p>
              <p>• Resolution: 800x600</p>
              <p>• Background: White</p>
              <p>• Max words: 100</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Performance</h4>
            <div className="text-gray-600">
              <p>• Real-time generation</p>
              <p>• Cached for performance</p>
              <p>• Optimized rendering</p>
              <p>• Fast download</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordCloud;