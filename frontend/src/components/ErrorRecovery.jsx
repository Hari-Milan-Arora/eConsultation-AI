/**
 * ErrorRecovery - Comprehensive error recovery component
 * 
 * This component provides user-friendly error messages with retry options:
 * - Displays categorized error messages
 * - Offers contextual recovery actions
 * - Integrates with loading state cleanup
 * - Supports retry logic with exponential backoff
 */

import React, { useState, useCallback } from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  RotateCcw, 
  RotateCw, 
  Home, 
  Trash2, 
  Wifi, 
  Clock, 
  HelpCircle,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  transformError, 
  getRecoveryActionDetails, 
  RECOVERY_ACTIONS,
  createRetryHandler 
} from '../services/errorHandlingService';

const ErrorRecovery = ({ 
  error, 
  operation = 'operation',
  context = {},
  onRetry,
  onDismiss,
  onGoHome,
  onRefresh,
  onReload,
  onClearCache,
  className = '',
  showDismiss = true,
  maxRetries = 3
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(context.retryCount || 0);
  const [showDetails, setShowDetails] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Transform the error into user-friendly format
  const errorInfo = transformError(error, operation, { ...context, retryCount });

  // Icon mapping
  const iconMap = {
    RefreshCw,
    RotateCcw,
    RotateCw,
    Home,
    Trash2,
    Wifi,
    Clock,
    HelpCircle
  };

  // Create retry handler with exponential backoff
  const retryHandler = useCallback(createRetryHandler(
    async () => {
      if (onRetry) {
        await onRetry();
      }
    },
    {
      maxRetries,
      onRetry: (error, count, delay) => {
        console.log(`[ErrorRecovery] Retry attempt ${count} after ${delay}ms delay`);
        setRetryCount(count);
      },
      onMaxRetriesReached: (error, count) => {
        console.warn(`[ErrorRecovery] Max retries (${count}) reached for ${operation}`);
        setIsRetrying(false);
      }
    }
  ), [onRetry, operation, maxRetries]);

  const handleRetry = useCallback(async () => {
    if (isRetrying || retryCount >= maxRetries) return;

    setIsRetrying(true);
    try {
      await retryHandler();
    } catch (error) {
      console.error('[ErrorRecovery] Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  }, [isRetrying, retryCount, maxRetries, retryHandler]);

  const handleAction = useCallback(async (action) => {
    switch (action) {
      case RECOVERY_ACTIONS.RETRY:
        await handleRetry();
        break;
      case RECOVERY_ACTIONS.REFRESH:
        if (onRefresh) {
          onRefresh();
        } else {
          window.location.reload();
        }
        break;
      case RECOVERY_ACTIONS.RELOAD:
        if (onReload) {
          onReload();
        } else {
          window.location.href = window.location.href;
        }
        break;
      case RECOVERY_ACTIONS.GO_HOME:
        if (onGoHome) {
          onGoHome();
        } else {
          window.location.href = '/';
        }
        break;
      case RECOVERY_ACTIONS.CLEAR_CACHE:
        if (onClearCache) {
          onClearCache();
        } else {
          // Clear localStorage and sessionStorage, then reload
          localStorage.clear();
          sessionStorage.clear();
          window.location.reload(true);
        }
        break;
      case RECOVERY_ACTIONS.CHECK_CONNECTION:
        // Open network settings or show connection info
        if (navigator.onLine === false) {
          alert('You appear to be offline. Please check your internet connection.');
        } else {
          alert('Your connection appears to be working. The issue might be with the server.');
        }
        break;
      case RECOVERY_ACTIONS.WAIT:
        // Wait 5 seconds then retry
        setTimeout(() => handleRetry(), 5000);
        break;
      case RECOVERY_ACTIONS.CONTACT_SUPPORT:
        // Copy error details to clipboard
        const errorDetails = {
          error: errorInfo.originalError?.message,
          operation,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        };
        
        try {
          await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
          alert('Error details copied to clipboard. Please include this information when contacting support.');
        } catch (e) {
          console.log('Error details:', errorDetails);
          alert('Error details logged to console. Please check the browser console and include this information when contacting support.');
        }
        break;
      default:
        console.warn(`[ErrorRecovery] Unknown recovery action: ${action}`);
    }
  }, [handleRetry, onRefresh, onReload, onGoHome, onClearCache, errorInfo, operation]);

  const getSeverityColor = (category) => {
    switch (category) {
      case 'network':
      case 'timeout':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'server':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'client':
      case 'validation':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'loading':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const canRetry = retryCount < maxRetries && !isRetrying;
  const severityColor = getSeverityColor(errorInfo.category);

  return (
    <div className={`bg-white rounded-xl p-6 shadow-lg border ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="h-6 w-6 text-red-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{errorInfo.title}</h3>
            {retryCount > 0 && (
              <p className="text-sm text-gray-600">Attempt #{retryCount + 1}</p>
            )}
          </div>
        </div>
        {showDismiss && onDismiss && (
          <button 
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 transition"
            title="Dismiss error"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Error Message */}
      <div className={`rounded-lg p-4 mb-4 border ${severityColor}`}>
        <p className="font-medium mb-2">{errorInfo.message}</p>
        
        {errorInfo.context?.duration && (
          <p className="text-sm opacity-75">
            Duration: {Math.round(errorInfo.context.duration / 1000)}s
          </p>
        )}
      </div>

      {/* Suggestions */}
      {errorInfo.suggestions.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-2"
          >
            {showSuggestions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span>What you can try</span>
          </button>
          
          {showSuggestions && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <ul className="text-blue-800 text-sm space-y-1">
                {errorInfo.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Recovery Actions */}
      {errorInfo.recoveryActions.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {errorInfo.recoveryActions.map(action => {
              const actionDetails = getRecoveryActionDetails(action);
              const IconComponent = iconMap[actionDetails.icon] || AlertTriangle;
              
              const isRetryAction = action === RECOVERY_ACTIONS.RETRY;
              const isDisabled = isRetryAction && (!canRetry || isRetrying);
              
              return (
                <button
                  key={action}
                  onClick={() => handleAction(action)}
                  disabled={isDisabled}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-2 ${
                    actionDetails.primary
                      ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400'
                  }`}
                  title={actionDetails.description}
                >
                  <IconComponent className={`h-4 w-4 ${isRetrying && isRetryAction ? 'animate-spin' : ''}`} />
                  <span>
                    {isRetryAction && isRetrying ? 'Retrying...' : actionDetails.label}
                  </span>
                </button>
              );
            })}
          </div>
          
          {retryCount >= maxRetries && (
            <p className="text-sm text-red-600 mt-2">
              Maximum retry attempts reached. Try refreshing the page or reloading the application.
            </p>
          )}
        </div>
      )}

      {/* Technical Details (Development or after multiple failures) */}
      {(process.env.NODE_ENV === 'development' || retryCount >= 2) && errorInfo.originalError && (
        <div className="border-t border-gray-200 pt-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-gray-600 hover:text-gray-800 underline mb-2"
          >
            {showDetails ? 'Hide' : 'Show'} Technical Details
          </button>
          
          {showDetails && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-sm font-mono text-gray-800 space-y-2">
                <div>
                  <strong>Error:</strong> {errorInfo.originalError.name}: {errorInfo.originalError.message}
                </div>
                
                <div>
                  <strong>Category:</strong> {errorInfo.category}
                </div>
                
                <div>
                  <strong>Operation:</strong> {operation}
                </div>
                
                {errorInfo.originalError.stack && (
                  <div>
                    <strong>Stack Trace:</strong>
                    <pre className="mt-1 whitespace-pre-wrap text-xs bg-white p-2 rounded border max-h-32 overflow-y-auto">
                      {errorInfo.originalError.stack}
                    </pre>
                  </div>
                )}
                
                {errorInfo.context && Object.keys(errorInfo.context).length > 0 && (
                  <div>
                    <strong>Context:</strong>
                    <pre className="mt-1 whitespace-pre-wrap text-xs bg-white p-2 rounded border">
                      {JSON.stringify(errorInfo.context, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ErrorRecovery;