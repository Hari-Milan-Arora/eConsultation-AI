/**
 * ErrorBoundary - Comprehensive error boundary component
 * 
 * This component provides comprehensive error handling for the entire application:
 * - Catches React errors gracefully
 * - Provides user-friendly error messages with retry options
 * - Integrates with loading state management for cleanup
 * - Supports different error types and recovery mechanisms
 * - Includes timeout detection and automatic cleanup
 */

import React from 'react';
import { AlertTriangle, RefreshCw, X, Home, Bug } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      showDetails: false,
      retryCount: 0
    };
    
    this.handleRetry = this.handleRetry.bind(this);
    this.handleReset = this.handleReset.bind(this);
    this.handleGoHome = this.handleGoHome.bind(this);
    this.toggleDetails = this.toggleDetails.bind(this);
    this.handleReportError = this.handleReportError.bind(this);
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    
    this.setState({
      error,
      errorInfo
    });

    // Clear any loading states that might be stuck
    this.clearLoadingStates();

    // Call onError callback if provided
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (callbackError) {
        console.error('[ErrorBoundary] Error in onError callback:', callbackError);
      }
    }

    // Report to error tracking service if available
    if (this.props.onErrorReport) {
      try {
        this.props.onErrorReport(error, errorInfo, this.state.errorId);
      } catch (reportError) {
        console.error('[ErrorBoundary] Error in error reporting:', reportError);
      }
    }
  }

  clearLoadingStates() {
    // Try to clear loading states from the global context
    try {
      // Dispatch custom event to clear loading states
      window.dispatchEvent(new CustomEvent('clearAllLoadingStates', {
        detail: { reason: 'Error boundary cleanup' }
      }));
    } catch (error) {
      console.warn('[ErrorBoundary] Could not clear loading states:', error);
    }
  }

  handleRetry() {
    const newRetryCount = this.state.retryCount + 1;
    
    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      showDetails: false,
      retryCount: newRetryCount
    });

    // Clear loading states before retry
    this.clearLoadingStates();

    // Call retry callback if provided
    if (this.props.onRetry) {
      try {
        this.props.onRetry(newRetryCount);
      } catch (retryError) {
        console.error('[ErrorBoundary] Error in retry callback:', retryError);
      }
    }
  }

  handleReset() {
    // Complete reset including retry count
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      showDetails: false,
      retryCount: 0
    });

    // Clear loading states
    this.clearLoadingStates();

    // Call reset callback if provided
    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch (resetError) {
        console.error('[ErrorBoundary] Error in reset callback:', resetError);
      }
    }
  }

  handleGoHome() {
    // Reset state and navigate to home
    this.handleReset();
    
    // Try to navigate to home page
    if (this.props.onGoHome) {
      try {
        this.props.onGoHome();
      } catch (navError) {
        console.error('[ErrorBoundary] Error in navigation callback:', navError);
      }
    } else {
      // Fallback: reload the page
      window.location.href = '/';
    }
  }

  toggleDetails() {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }));
  }

  handleReportError() {
    const { error, errorInfo, errorId } = this.state;
    
    // Create error report
    const errorReport = {
      id: errorId,
      timestamp: new Date().toISOString(),
      error: {
        name: error?.name,
        message: error?.message,
        stack: error?.stack
      },
      errorInfo: {
        componentStack: errorInfo?.componentStack
      },
      userAgent: navigator.userAgent,
      url: window.location.href,
      retryCount: this.state.retryCount
    };

    // Copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        alert('Error report copied to clipboard. You can paste this in a bug report.');
      })
      .catch(() => {
        // Fallback: show in console
        console.log('Error Report:', errorReport);
        alert('Error report logged to console. Please check the browser console.');
      });
  }

  getErrorMessage(error) {
    if (!error) return 'An unexpected error occurred.';

    // Handle specific error types
    if (error.name === 'ChunkLoadError') {
      return 'Failed to load application resources. This might be due to a network issue or an application update.';
    }

    if (error.name === 'TypeError' && error.message.includes('Cannot read prop')) {
      return 'A component tried to access data that wasn\'t available. This might be a temporary issue.';
    }

    if (error.name === 'ReferenceError') {
      return 'A required resource was not found. This might be due to a configuration issue.';
    }

    if (error.message.includes('Loading chunk')) {
      return 'Failed to load part of the application. Please try refreshing the page.';
    }

    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      return 'The operation took too long to complete. Please check your connection and try again.';
    }

    if (error.message.includes('Network Error') || error.message.includes('fetch')) {
      return 'Network connection error. Please check your internet connection and try again.';
    }

    // Return original message if it's user-friendly
    if (error.message && error.message.length < 100 && !error.message.includes('at ')) {
      return error.message;
    }

    return 'An unexpected error occurred. Please try again.';
  }

  getRecoveryActions(error) {
    const actions = [];

    // Always show retry unless too many attempts
    if (this.state.retryCount < 3) {
      actions.push({
        key: 'retry',
        label: 'Try Again',
        icon: RefreshCw,
        action: this.handleRetry,
        primary: true
      });
    }

    // Show reset for multiple failures
    if (this.state.retryCount >= 2) {
      actions.push({
        key: 'reset',
        label: 'Reset Application',
        icon: RefreshCw,
        action: this.handleReset,
        primary: true
      });
    }

    // Always show go home option
    actions.push({
      key: 'home',
      label: 'Go to Home',
      icon: Home,
      action: this.handleGoHome,
      primary: false
    });

    // Show report option in development or after multiple failures
    if (process.env.NODE_ENV === 'development' || this.state.retryCount >= 2) {
      actions.push({
        key: 'report',
        label: 'Report Error',
        icon: Bug,
        action: this.handleReportError,
        primary: false
      });
    }

    return actions;
  }

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorId, showDetails, retryCount } = this.state;
      const {
        title = 'Something went wrong',
        showCloseButton = true,
        allowDetails = process.env.NODE_ENV === 'development' || retryCount >= 2,
        className = ''
      } = this.props;

      const errorMessage = this.getErrorMessage(error);
      const recoveryActions = this.getRecoveryActions(error);

      return (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                  {retryCount > 0 && (
                    <p className="text-sm text-gray-600">Attempt #{retryCount + 1}</p>
                  )}
                  {errorId && (
                    <p className="text-xs text-gray-500 font-mono">ID: {errorId}</p>
                  )}
                </div>
              </div>
              {showCloseButton && (
                <button 
                  onClick={this.handleReset}
                  className="text-gray-400 hover:text-gray-600 transition"
                  title="Close and reset"
                >
                  <X className="h-6 w-6" />
                </button>
              )}
            </div>

            {/* Error Message */}
            <div className="mb-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800 font-medium mb-2">{errorMessage}</p>
                
                {retryCount > 0 && (
                  <p className="text-red-700 text-sm">
                    This error has occurred {retryCount + 1} time{retryCount > 0 ? 's' : ''}.
                  </p>
                )}
              </div>

              {/* Helpful suggestions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">What you can try:</h4>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>• Check your internet connection</li>
                  <li>• Refresh the page (Ctrl+F5 or Cmd+Shift+R)</li>
                  <li>• Clear your browser cache and cookies</li>
                  <li>• Try again in a few minutes</li>
                  {error?.name === 'ChunkLoadError' && (
                    <li>• The application may have been updated - please refresh</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Error Details (Development/Multiple Failures) */}
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
                    <div className="text-sm font-mono text-gray-800 space-y-3">
                      {error && (
                        <div>
                          <strong>Error:</strong> {error.name}: {error.message}
                        </div>
                      )}
                      
                      {error?.stack && (
                        <div>
                          <strong>Stack Trace:</strong>
                          <pre className="mt-1 whitespace-pre-wrap text-xs bg-white p-2 rounded border max-h-40 overflow-y-auto">
                            {error.stack}
                          </pre>
                        </div>
                      )}
                      
                      {errorInfo?.componentStack && (
                        <div>
                          <strong>Component Stack:</strong>
                          <pre className="mt-1 whitespace-pre-wrap text-xs bg-white p-2 rounded border max-h-40 overflow-y-auto">
                            {errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recovery Actions */}
            <div className="flex flex-wrap justify-end gap-3">
              {recoveryActions.map(action => {
                const IconComponent = action.icon;
                return (
                  <button
                    key={action.key}
                    onClick={action.action}
                    className={`px-4 py-2 rounded-lg transition flex items-center space-x-2 ${
                      action.primary
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'text-gray-600 hover:text-gray-800 border border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span>{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;