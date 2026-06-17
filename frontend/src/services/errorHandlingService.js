/**
 * Error Handling Service
 * 
 * Centralized error handling service that provides:
 * - User-friendly error message transformation
 * - Error categorization and recovery suggestions
 * - Retry logic and timeout detection
 * - Integration with loading state cleanup
 */

/**
 * Error categories for different handling strategies
 */
export const ERROR_CATEGORIES = {
  NETWORK: 'network',
  TIMEOUT: 'timeout',
  SERVER: 'server',
  CLIENT: 'client',
  LOADING: 'loading',
  VALIDATION: 'validation',
  UNKNOWN: 'unknown'
};

/**
 * Recovery actions that can be suggested to users
 */
export const RECOVERY_ACTIONS = {
  RETRY: 'retry',
  REFRESH: 'refresh',
  RELOAD: 'reload',
  GO_HOME: 'go_home',
  CLEAR_CACHE: 'clear_cache',
  CHECK_CONNECTION: 'check_connection',
  WAIT: 'wait',
  CONTACT_SUPPORT: 'contact_support'
};

/**
 * Categorize an error based on its properties
 * @param {Error} error - The error to categorize
 * @returns {string} - Error category
 */
export const categorizeError = (error) => {
  if (!error) return ERROR_CATEGORIES.UNKNOWN;

  const message = error.message?.toLowerCase() || '';
  const name = error.name?.toLowerCase() || '';

  // Network errors
  if (
    name.includes('networkerror') ||
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('cors') ||
    error.code === 'NETWORK_ERROR'
  ) {
    return ERROR_CATEGORIES.NETWORK;
  }

  // Timeout errors
  if (
    name.includes('timeout') ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    name === 'aborterror' ||
    error.code === 'TIMEOUT'
  ) {
    return ERROR_CATEGORIES.TIMEOUT;
  }

  // Server errors
  if (
    error.status >= 500 ||
    message.includes('server error') ||
    message.includes('internal server') ||
    message.includes('service unavailable')
  ) {
    return ERROR_CATEGORIES.SERVER;
  }

  // Client errors
  if (
    error.status >= 400 && error.status < 500 ||
    message.includes('bad request') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('not found')
  ) {
    return ERROR_CATEGORIES.CLIENT;
  }

  // Loading state errors
  if (
    message.includes('loading') ||
    message.includes('loadingstate') ||
    name.includes('loading')
  ) {
    return ERROR_CATEGORIES.LOADING;
  }

  // Validation errors
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('required') ||
    name.includes('validation')
  ) {
    return ERROR_CATEGORIES.VALIDATION;
  }

  return ERROR_CATEGORIES.UNKNOWN;
};

/**
 * Transform error into user-friendly message with context
 * @param {Error} error - The error to transform
 * @param {string} operation - The operation that failed
 * @param {Object} context - Additional context
 * @returns {Object} - Transformed error information
 */
export const transformError = (error, operation = 'operation', context = {}) => {
  const category = categorizeError(error);
  const { retryCount = 0, duration = 0 } = context;

  let title = 'Something went wrong';
  let message = 'An unexpected error occurred.';
  let suggestions = [];
  let recoveryActions = [];

  switch (category) {
    case ERROR_CATEGORIES.NETWORK:
      title = 'Connection Error';
      message = `Unable to connect to the server while ${operation}.`;
      suggestions = [
        'Check your internet connection',
        'Ensure the backend server is running',
        'Try again in a few moments'
      ];
      recoveryActions = [
        RECOVERY_ACTIONS.RETRY,
        RECOVERY_ACTIONS.CHECK_CONNECTION,
        RECOVERY_ACTIONS.REFRESH
      ];
      break;

    case ERROR_CATEGORIES.TIMEOUT:
      title = 'Request Timed Out';
      message = `The ${operation} took too long to complete${duration ? ` (${Math.round(duration / 1000)}s)` : ''}.`;
      suggestions = [
        'The server might be busy or slow',
        'Check your internet connection speed',
        'Try again with a smaller request if possible'
      ];
      recoveryActions = [
        RECOVERY_ACTIONS.RETRY,
        RECOVERY_ACTIONS.WAIT,
        RECOVERY_ACTIONS.CHECK_CONNECTION
      ];
      break;

    case ERROR_CATEGORIES.SERVER:
      title = 'Server Error';
      message = `The server encountered an error while ${operation}.`;
      suggestions = [
        'This is likely a temporary issue',
        'The server might be overloaded',
        'Try again in a few minutes'
      ];
      recoveryActions = [
        RECOVERY_ACTIONS.RETRY,
        RECOVERY_ACTIONS.WAIT,
        RECOVERY_ACTIONS.REFRESH
      ];
      break;

    case ERROR_CATEGORIES.CLIENT:
      title = 'Request Error';
      if (error.status === 400) {
        message = `Invalid request while ${operation}. Please check your input.`;
        suggestions = ['Verify your input is correct', 'Check for required fields'];
      } else if (error.status === 404) {
        message = `The requested resource was not found while ${operation}.`;
        suggestions = ['The item might have been deleted', 'Check if the URL is correct'];
      } else {
        message = `Request failed while ${operation}.`;
        suggestions = ['Check your input and try again'];
      }
      recoveryActions = [RECOVERY_ACTIONS.RETRY, RECOVERY_ACTIONS.GO_HOME];
      break;

    case ERROR_CATEGORIES.LOADING:
      title = 'Loading State Error';
      message = `There was an issue with the loading state during ${operation}.`;
      suggestions = [
        'This might be a temporary interface issue',
        'Try refreshing the page'
      ];
      recoveryActions = [
        RECOVERY_ACTIONS.RETRY,
        RECOVERY_ACTIONS.REFRESH,
        RECOVERY_ACTIONS.RELOAD
      ];
      break;

    case ERROR_CATEGORIES.VALIDATION:
      title = 'Validation Error';
      message = error.message || `Invalid input for ${operation}.`;
      suggestions = [
        'Check that all required fields are filled',
        'Verify the format of your input'
      ];
      recoveryActions = [RECOVERY_ACTIONS.RETRY];
      break;

    default:
      // Try to extract meaningful message from error
      if (error.message && error.message.length < 100 && !error.message.includes('at ')) {
        message = error.message;
      }
      
      if (error.name === 'ChunkLoadError') {
        title = 'Loading Error';
        message = 'Failed to load application resources. The app may have been updated.';
        suggestions = ['Refresh the page to load the latest version'];
        recoveryActions = [RECOVERY_ACTIONS.REFRESH, RECOVERY_ACTIONS.RELOAD];
      }
      
      suggestions = [
        'Try refreshing the page',
        'Clear your browser cache',
        'Try again in a few minutes'
      ];
      recoveryActions = [
        RECOVERY_ACTIONS.RETRY,
        RECOVERY_ACTIONS.REFRESH,
        RECOVERY_ACTIONS.CLEAR_CACHE
      ];
  }

  // Add retry-specific suggestions
  if (retryCount > 0) {
    suggestions.unshift(`This error has occurred ${retryCount + 1} time${retryCount > 0 ? 's' : ''}`);
  }

  if (retryCount >= 2) {
    suggestions.push('Consider refreshing the page or restarting the application');
    recoveryActions.push(RECOVERY_ACTIONS.RELOAD, RECOVERY_ACTIONS.GO_HOME);
  }

  return {
    category,
    title,
    message,
    suggestions,
    recoveryActions,
    originalError: error,
    context: {
      operation,
      retryCount,
      duration,
      ...context
    }
  };
};

/**
 * Get recovery action details
 * @param {string} action - Recovery action type
 * @returns {Object} - Action details
 */
export const getRecoveryActionDetails = (action) => {
  const actions = {
    [RECOVERY_ACTIONS.RETRY]: {
      label: 'Try Again',
      description: 'Retry the operation',
      icon: 'RefreshCw',
      primary: true
    },
    [RECOVERY_ACTIONS.REFRESH]: {
      label: 'Refresh Page',
      description: 'Refresh the current page',
      icon: 'RotateCcw',
      primary: false
    },
    [RECOVERY_ACTIONS.RELOAD]: {
      label: 'Reload App',
      description: 'Completely reload the application',
      icon: 'RotateCw',
      primary: false
    },
    [RECOVERY_ACTIONS.GO_HOME]: {
      label: 'Go Home',
      description: 'Navigate to the home page',
      icon: 'Home',
      primary: false
    },
    [RECOVERY_ACTIONS.CLEAR_CACHE]: {
      label: 'Clear Cache',
      description: 'Clear browser cache and reload',
      icon: 'Trash2',
      primary: false
    },
    [RECOVERY_ACTIONS.CHECK_CONNECTION]: {
      label: 'Check Connection',
      description: 'Verify your internet connection',
      icon: 'Wifi',
      primary: false
    },
    [RECOVERY_ACTIONS.WAIT]: {
      label: 'Wait & Retry',
      description: 'Wait a moment and try again',
      icon: 'Clock',
      primary: false
    },
    [RECOVERY_ACTIONS.CONTACT_SUPPORT]: {
      label: 'Contact Support',
      description: 'Get help with this issue',
      icon: 'HelpCircle',
      primary: false
    }
  };

  return actions[action] || {
    label: 'Unknown Action',
    description: 'Unknown recovery action',
    icon: 'AlertCircle',
    primary: false
  };
};

/**
 * Create a retry handler with exponential backoff
 * @param {Function} operation - The operation to retry
 * @param {Object} options - Retry options
 * @returns {Function} - Retry handler function
 */
export const createRetryHandler = (operation, options = {}) => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    onRetry = () => {},
    onMaxRetriesReached = () => {}
  } = options;

  let retryCount = 0;

  const retry = async (...args) => {
    try {
      return await operation(...args);
    } catch (error) {
      retryCount++;

      if (retryCount >= maxRetries) {
        onMaxRetriesReached(error, retryCount);
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(backoffFactor, retryCount - 1), maxDelay);
      
      onRetry(error, retryCount, delay);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      return retry(...args);
    }
  };

  return retry;
};

/**
 * Error handling service class
 */
export class ErrorHandlingService {
  constructor() {
    this.errorHistory = [];
    this.maxHistorySize = 50;
  }

  /**
   * Record an error in the history
   * @param {Error} error - The error to record
   * @param {string} operation - The operation that failed
   * @param {Object} context - Additional context
   */
  recordError(error, operation, context = {}) {
    const errorRecord = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      error: {
        name: error?.name,
        message: error?.message,
        stack: error?.stack
      },
      operation,
      context,
      category: categorizeError(error)
    };

    this.errorHistory.unshift(errorRecord);

    // Keep history size manageable
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }

    return errorRecord;
  }

  /**
   * Get error statistics
   * @returns {Object} - Error statistics
   */
  getErrorStats() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    const recentErrors = this.errorHistory.filter(
      record => new Date(record.timestamp).getTime() > oneHourAgo
    );

    const dailyErrors = this.errorHistory.filter(
      record => new Date(record.timestamp).getTime() > oneDayAgo
    );

    const categoryCounts = this.errorHistory.reduce((counts, record) => {
      counts[record.category] = (counts[record.category] || 0) + 1;
      return counts;
    }, {});

    return {
      total: this.errorHistory.length,
      recent: recentErrors.length,
      daily: dailyErrors.length,
      categories: categoryCounts,
      mostCommon: Object.entries(categoryCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([category, count]) => ({ category, count }))
    };
  }

  /**
   * Clear error history
   */
  clearHistory() {
    this.errorHistory = [];
  }

  /**
   * Handle an error with full processing
   * @param {Error} error - The error to handle
   * @param {string} operation - The operation that failed
   * @param {Object} context - Additional context
   * @returns {Object} - Processed error information
   */
  handleError(error, operation, context = {}) {
    // Record the error
    const errorRecord = this.recordError(error, operation, context);

    // Transform the error
    const transformedError = transformError(error, operation, {
      ...context,
      errorId: errorRecord.id
    });

    return {
      ...transformedError,
      errorRecord
    };
  }
}

// Create singleton instance
export const errorHandlingService = new ErrorHandlingService();

export default errorHandlingService;