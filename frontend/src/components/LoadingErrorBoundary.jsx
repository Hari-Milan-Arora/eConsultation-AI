/**
 * LoadingErrorBoundary - Error boundary specifically for loading state management
 * 
 * This component catches errors related to loading states and provides
 * user-friendly error messages and recovery options.
 */

import React from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

class LoadingErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      loadingOperation: null,
      showDetails: false
    };
    
    this.handleRetry = this.handleRetry.bind(this);
    this.handleDismiss = this.handleDismiss.bind(this);
    this.toggleDetails = this.toggleDetails.bind(this);
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('[LoadingErrorBoundary] Caught error:', error);
    console.error('[LoadingErrorBoundary] Error info:', errorInfo);
    
    this.setState({
      error,
      errorInfo,
      loadingOperation: error?.operation || 'unknown'
    });

    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to error tracking service if available
    if (this.props.onErrorReport) {
      this.props.onErrorReport(error, errorInfo);
    }
  }

  handleRetry() {
    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      loadingOperation: null,
      showDetails: false
    });

    // Call retry callback if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  }

  handleDismiss() {
    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      loadingOperation: null,
      showDetails: false
    });

    // Call dismiss callback if provided
    if (this.props.onDismiss) {
      this.props.onDismiss();
    }
  }

  toggleDetails() {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }));
  }

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, loadingOperation, showDetails } = this.state;
      const { 
        title = 'Loading Error',
        message = 'An error occurred while managing loading states.',
        showRetry = true,
        showDismiss = true,
        showDetails: allowDetails = process.env.NODE_ENV === 'development'
      } = this.props;

      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                  {loadingOperation && loadingOperation !== 'unknown' && (
                    <p className="text-sm text-gray-600">Operation: {loadingOperation}</p>
                  )}
                </div>
              </div>
              {showDismiss && (
                <button 
                  onClick={this.handleDismiss}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <X className="h-6 w-6" />
                </button>
              )}
            </div>

            {/* Error Message */}
            <div className="mb-6">
              <p className="text-gray-700 mb-4">{message}</p>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-medium">
                    {error.name || 'Error'}: {error.message}
                  </p>
                  
                  {error.name === 'LoadingTimeoutError' && (
                    <div className="mt-2 text-sm text-red-700">
                      <p>The operation timed out after {error.timeout}ms.</p>
                      <p>This might be due to network issues or server problems.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Error Details (Development Mode) */}
            {allowDetails && (error || errorInfo) && (
              <div className="mb-6">
                <button
                  onClick={this.toggleDetails}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  {showDetails ? 'Hide' : 'Show'} Technical Details
                </button>
                
                {showDetails && (
                  <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="text-sm font-mono text-gray-800 space-y-2">
                      {error && (
                        <div>
                          <strong>Error Stack:</strong>
                          <pre className="mt-1 whitespace-pre-wrap text-xs">
                            {error.stack}
                          </pre>
                        </div>
                      )}
                      
                      {errorInfo && errorInfo.componentStack && (
                        <div>
                          <strong>Component Stack:</strong>
                          <pre className="mt-1 whitespace-pre-wrap text-xs">
                            {errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                      
                      {error?.loadingContext && (
                        <div>
                          <strong>Loading Context:</strong>
                          <pre className="mt-1 whitespace-pre-wrap text-xs">
                            {JSON.stringify(error.loadingContext, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              {showDismiss && (
                <button
                  onClick={this.handleDismiss}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
                >
                  Dismiss
                </button>
              )}
              
              {showRetry && (
                <button
                  onClick={this.handleRetry}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition flex items-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Try Again</span>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default LoadingErrorBoundary;