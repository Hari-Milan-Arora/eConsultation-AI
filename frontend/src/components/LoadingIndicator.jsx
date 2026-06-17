/**
 * LoadingIndicator - Visual loading indicator that works with LoadingStateManager
 * 
 * This component provides controlled loading animations that only appear when
 * explicitly triggered by the LoadingStateManager.
 */

import React from 'react';

/**
 * Spinner component with controlled animation
 * @param {Object} props - Component props
 * @param {string} props.size - Size of spinner ('sm', 'md', 'lg')
 * @param {string} props.color - Color of spinner
 * @param {boolean} props.active - Whether spinner should be active
 */
const Spinner = ({ size = 'md', color = 'blue', active = false }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  const colorClasses = {
    blue: 'text-blue-600',
    white: 'text-white',
    gray: 'text-gray-600',
    green: 'text-green-600',
    red: 'text-red-600'
  };

  return (
    <div
      className={`
        ${sizeClasses[size]} 
        ${colorClasses[color]}
        ${active ? 'loading-spinner-active' : ''}
      `}
      role="status"
      aria-label="Loading"
    >
      <svg
        className={`animate-spin ${active ? 'loading-spinner-active' : ''}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};

/**
 * Loading overlay that covers the entire screen or a specific container
 * @param {Object} props - Component props
 * @param {boolean} props.active - Whether overlay should be visible
 * @param {string} props.message - Loading message to display
 * @param {string} props.operation - Current operation name for debugging
 */
const LoadingOverlay = ({ active = false, message = 'Loading...', operation = null }) => {
  if (!active) return null;

  return (
    <div className="loading-overlay-active" data-operation={operation}>
      <div className="bg-white rounded-lg p-6 shadow-lg flex flex-col items-center space-y-4">
        <Spinner size="lg" color="blue" active={true} />
        <p className="text-gray-700 font-medium">{message}</p>
        {process.env.NODE_ENV === 'development' && operation && (
          <p className="text-xs text-gray-500">Operation: {operation}</p>
        )}
      </div>
    </div>
  );
};

/**
 * Inline loading indicator for buttons and other UI elements
 * @param {Object} props - Component props
 * @param {boolean} props.loading - Whether loading state is active
 * @param {string} props.loadingText - Text to show when loading
 * @param {string} props.normalText - Text to show when not loading
 * @param {string} props.size - Size of spinner
 * @param {string} props.color - Color of spinner
 * @param {React.ReactNode} props.children - Child elements (used when not loading)
 */
const InlineLoadingIndicator = ({ 
  loading = false, 
  loadingText = 'Loading...', 
  normalText = null,
  size = 'sm', 
  color = 'white',
  children = null
}) => {
  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <Spinner size={size} color={color} active={true} />
        <span>{loadingText}</span>
      </div>
    );
  }

  return children || <span>{normalText}</span>;
};

/**
 * Button with integrated loading state
 * @param {Object} props - Component props
 * @param {boolean} props.loading - Whether button is in loading state
 * @param {string} props.loadingText - Text to show when loading
 * @param {Function} props.onClick - Click handler
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.disabled - Whether button is disabled
 * @param {React.ReactNode} props.children - Button content
 */
const LoadingButton = ({ 
  loading = false, 
  loadingText = 'Loading...', 
  onClick, 
  className = '', 
  disabled = false,
  children,
  ...props 
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`
        ${className}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
        transition-opacity duration-200
      `}
      {...props}
    >
      <InlineLoadingIndicator
        loading={loading}
        loadingText={loadingText}
        color="white"
        size="sm"
      >
        {children}
      </InlineLoadingIndicator>
    </button>
  );
};

/**
 * Loading state indicator for specific operations
 * @param {Object} props - Component props
 * @param {Object} props.loadingManager - LoadingStateManager instance
 * @param {string} props.operation - Operation to monitor
 * @param {string} props.message - Loading message
 * @param {string} props.type - Type of indicator ('spinner', 'overlay', 'inline')
 */
const OperationLoadingIndicator = ({ 
  loadingManager, 
  operation, 
  message = 'Loading...', 
  type = 'spinner' 
}) => {
  if (!loadingManager || !operation) return null;

  const isLoading = loadingManager.isLoading(operation);

  switch (type) {
    case 'overlay':
      return <LoadingOverlay active={isLoading} message={message} operation={operation} />;
    case 'inline':
      return isLoading ? (
        <InlineLoadingIndicator loading={true} loadingText={message} />
      ) : null;
    case 'spinner':
    default:
      return isLoading ? <Spinner active={true} /> : null;
  }
};

/**
 * Debug component to show all active loading operations
 * @param {Object} props - Component props
 * @param {Object} props.loadingManager - LoadingStateManager instance
 */
const LoadingDebugPanel = ({ loadingManager }) => {
  if (process.env.NODE_ENV !== 'development' || !loadingManager) return null;

  const debugInfo = loadingManager.getDebugInfo();
  const activeOperations = loadingManager.getActiveOperations();

  if (debugInfo.operationCount === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-sm max-w-sm">
      <h4 className="font-bold mb-2">Active Loading Operations</h4>
      {Object.entries(activeOperations).map(([operation, data]) => (
        <div key={operation} className="mb-2 p-2 bg-gray-800 rounded">
          <div className="font-medium">{operation}</div>
          <div className="text-xs text-gray-300">
            Duration: {Date.now() - data.startTime}ms
          </div>
          <div className="text-xs text-gray-300">
            User Action: {data.debugInfo.userAction}
          </div>
        </div>
      ))}
    </div>
  );
};

export {
  Spinner,
  LoadingOverlay,
  InlineLoadingIndicator,
  LoadingButton,
  OperationLoadingIndicator,
  LoadingDebugPanel
};

export default {
  Spinner,
  LoadingOverlay,
  InlineLoadingIndicator,
  LoadingButton,
  OperationLoadingIndicator,
  LoadingDebugPanel
};