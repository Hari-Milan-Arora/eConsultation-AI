/**
 * API Service Layer with Timeout Management and Monitoring
 * 
 * Centralized API service for the eConsultation AI application with:
 * - 5-second timeout for all requests
 * - Automatic retry logic for failed requests
 * - User-friendly error handling and messages
 * - Integration with loading state management
 * - Performance monitoring and logging
 */

import monitoringService from './monitoringService';

// Use relative URLs when proxy is configured, full URL otherwise
const API_BASE_URL = process.env.NODE_ENV === 'development' ? '' : 'http://localhost:8000';

// Default configuration
const DEFAULT_CONFIG = {
  timeout: 5000, // 5 seconds as per requirements
  retries: 2,
  retryDelay: 1000, // 1 second between retries
  headers: {
    'Content-Type': 'application/json',
  }
};

/**
 * Create an AbortController with timeout
 * @param {number} timeout - Timeout in milliseconds
 * @returns {AbortController} - AbortController instance
 */
const createTimeoutController = (timeout) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);
  
  // Store timeout ID for cleanup
  controller.timeoutId = timeoutId;
  
  return controller;
};

/**
 * Sleep function for retry delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} - Promise that resolves after delay
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Transform error into user-friendly message
 * @param {Error} error - Original error
 * @param {string} operation - Operation name for context
 * @returns {string} - User-friendly error message
 */
const transformError = (error, operation = 'request') => {
  if (error.name === 'AbortError') {
    return `${operation} timed out. Please try again.`;
  }
  
  if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
    return 'Connection error. Please check your internet connection and ensure the backend is running.';
  }
  
  if (error.message.includes('Failed to fetch')) {
    return 'Cannot connect to server. Please check if the backend is running on http://localhost:8000.';
  }
  
  // Handle HTTP status errors
  if (error.status) {
    switch (error.status) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 404:
        return 'Requested resource not found.';
      case 500:
        return 'Server error. Please try again later.';
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return `Server error (${error.status}). Please try again.`;
    }
  }
  
  // Return original message if it's user-friendly, otherwise generic message
  const message = error.message || 'An unexpected error occurred';
  if (message.length > 100) {
    return 'An unexpected error occurred. Please try again.';
  }
  
  return message;
};

/**
 * Make HTTP request with timeout, retry logic, and monitoring
 * @param {string} url - Request URL
 * @param {Object} options - Request options
 * @param {Object} config - API service configuration
 * @param {string} endpointName - Endpoint name for monitoring
 * @returns {Promise} - Promise that resolves with response data
 */
const makeRequest = async (url, options = {}, config = {}, endpointName = 'unknown') => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const { timeout, retries, retryDelay } = finalConfig;
  
  const startTime = performance.now();
  let lastError;
  let statusCode = 0;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = createTimeoutController(timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...finalConfig.headers,
          ...options.headers
        }
      });
      
      // Clear timeout since request completed
      if (controller.timeoutId) {
        clearTimeout(controller.timeoutId);
      }
      
      statusCode = response.status;
      
      // Handle HTTP errors
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.response = response;
        
        // Try to get error details from response body
        try {
          const errorData = await response.text();
          if (errorData) {
            error.details = errorData;
          }
        } catch (e) {
          // Ignore errors when reading error response
        }
        
        throw error;
      }
      
      // Record successful request
      const endTime = performance.now();
      monitoringService.recordApiCall(endpointName, startTime, endTime, true, statusCode);
      
      return response;
    } catch (error) {
      // Clear timeout on error
      if (controller.timeoutId) {
        clearTimeout(controller.timeoutId);
      }
      
      lastError = error;
      statusCode = error.status || 0;
      
      // Don't retry on certain errors
      if (error.name === 'AbortError' || error.status === 400 || error.status === 404) {
        break;
      }
      
      // Don't retry on last attempt
      if (attempt === retries) {
        break;
      }
      
      // Wait before retry
      if (retryDelay > 0) {
        await sleep(retryDelay);
      }
      
      console.warn(`[ApiService] Attempt ${attempt + 1} failed, retrying...`, error.message);
    }
  }
  
  // Record failed request
  const endTime = performance.now();
  monitoringService.recordApiCall(
    endpointName, 
    startTime, 
    endTime, 
    false, 
    statusCode, 
    lastError?.message
  );
  
  throw lastError;
};

/**
 * API Service class with all endpoints
 */
class ApiService {
  /**
   * Submit a comment for analysis
   * @param {Object} comment - Comment data
   * @param {string} comment.stakeholder_type - Type of stakeholder
   * @param {string} comment.raw_text - Comment text
   * @param {Object} config - Request configuration
   * @returns {Promise} - Promise that resolves with comment analysis
   */
  static async submitComment(comment, config = {}) {
    try {
      const response = await makeRequest(`${API_BASE_URL}/api/comments`, {
        method: 'POST',
        body: JSON.stringify(comment)
      }, config, 'submitComment');
      
      return await response.json();
    } catch (error) {
      const friendlyError = new Error(transformError(error, 'Comment submission'));
      friendlyError.originalError = error;
      
      // Record error in monitoring
      monitoringService.recordError('submitComment', error.message, 'api_call', {
        endpoint: '/api/comments',
        method: 'POST'
      });
      
      throw friendlyError;
    }
  }
  
  /**
   * Fetch all comments
   * @param {Object} config - Request configuration
   * @returns {Promise} - Promise that resolves with comments array
   */
  static async fetchComments(config = {}) {
    try {
      const response = await makeRequest(`${API_BASE_URL}/api/comments`, {
        method: 'GET'
      }, config, 'fetchComments');
      
      return await response.json();
    } catch (error) {
      const friendlyError = new Error(transformError(error, 'Loading comments'));
      friendlyError.originalError = error;
      
      monitoringService.recordError('fetchComments', error.message, 'api_call', {
        endpoint: '/api/comments',
        method: 'GET'
      });
      
      throw friendlyError;
    }
  }
  
  /**
   * Fetch dashboard statistics
   * @param {Object} config - Request configuration
   * @returns {Promise} - Promise that resolves with dashboard stats
   */
  static async fetchDashboardStats(config = {}) {
    try {
      const response = await makeRequest(`${API_BASE_URL}/api/dashboard`, {
        method: 'GET'
      }, {
        ...config,
        timeout: 10000 // Dashboard might need more time
      }, 'fetchDashboardStats');
      
      return await response.json();
    } catch (error) {
      const friendlyError = new Error(transformError(error, 'Loading dashboard'));
      friendlyError.originalError = error;
      
      monitoringService.recordError('fetchDashboardStats', error.message, 'api_call', {
        endpoint: '/api/dashboard',
        method: 'GET'
      });
      
      throw friendlyError;
    }
  }
  
  /**
   * Generate word cloud
   * @param {string} sentiment - Optional sentiment filter ('positive', 'negative', 'neutral')
   * @param {Object} config - Request configuration
   * @returns {Promise} - Promise that resolves with blob data
   */
  static async generateWordcloud(sentiment = null, config = {}) {
    try {
      const url = sentiment 
        ? `${API_BASE_URL}/api/wordcloud?sentiment=${sentiment}`
        : `${API_BASE_URL}/api/wordcloud`;
      
      const response = await makeRequest(url, {
        method: 'GET'
      }, {
        ...config,
        timeout: 15000 // Word cloud generation needs more time
      }, 'generateWordcloud');
      
      return await response.blob();
    } catch (error) {
      const operation = sentiment ? `Generating ${sentiment} word cloud` : 'Generating word cloud';
      const friendlyError = new Error(transformError(error, operation));
      friendlyError.originalError = error;
      
      monitoringService.recordError('generateWordcloud', error.message, 'api_call', {
        endpoint: '/api/wordcloud',
        method: 'GET',
        sentiment
      });
      
      throw friendlyError;
    }
  }
  
  /**
   * Upload CSV file with comments
   * @param {File} file - CSV file to upload
   * @param {Object} config - Request configuration
   * @returns {Promise} - Promise that resolves with upload result
   */
  static async uploadCSV(file, config = {}) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await makeRequest(`${API_BASE_URL}/api/comments/bulk`, {
        method: 'POST',
        body: formData,
        headers: {} // Let browser set Content-Type for FormData
      }, {
        ...config,
        timeout: 30000, // CSV upload needs more time
        headers: {} // Override default JSON headers for FormData
      });
      
      return await response.json();
    } catch (error) {
      const friendlyError = new Error(transformError(error, 'CSV upload'));
      friendlyError.originalError = error;
      throw friendlyError;
    }
  }
  
  /**
   * Check backend health
   * @param {Object} config - Request configuration
   * @returns {Promise} - Promise that resolves with health status
   */
  static async checkHealth(config = {}) {
    try {
      const response = await makeRequest(`${API_BASE_URL}/health`, {
        method: 'GET'
      }, {
        ...config,
        timeout: 3000, // Quick health check
        retries: 0 // Don't retry health checks
      });
      
      return await response.json();
    } catch (error) {
      const friendlyError = new Error(transformError(error, 'Health check'));
      friendlyError.originalError = error;
      throw friendlyError;
    }
  }
  
  /**
   * Get detailed health information
   * @param {Object} config - Request configuration
   * @returns {Promise} - Promise that resolves with detailed health info
   */
  static async getDetailedHealth(config = {}) {
    try {
      const response = await makeRequest(`${API_BASE_URL}/health/detailed`, {
        method: 'GET'
      }, {
        ...config,
        timeout: 5000,
        retries: 0
      }, 'getDetailedHealth');
      
      return await response.json();
    } catch (error) {
      const friendlyError = new Error(transformError(error, 'Detailed health check'));
      friendlyError.originalError = error;
      
      monitoringService.recordError('getDetailedHealth', error.message, 'api_call', {
        endpoint: '/health/detailed',
        method: 'GET'
      });
      
      throw friendlyError;
    }
  }

  /**
   * Get comprehensive health check
   * @param {Object} config - Request configuration
   * @returns {Promise} - Promise that resolves with comprehensive health info
   */
  static async getComprehensiveHealth(config = {}) {
    try {
      const response = await makeRequest(`${API_BASE_URL}/health/comprehensive`, {
        method: 'GET'
      }, {
        ...config,
        timeout: 10000,
        retries: 0
      }, 'getComprehensiveHealth');
      
      return await response.json();
    } catch (error) {
      const friendlyError = new Error(transformError(error, 'Comprehensive health check'));
      friendlyError.originalError = error;
      
      monitoringService.recordError('getComprehensiveHealth', error.message, 'api_call', {
        endpoint: '/health/comprehensive',
        method: 'GET'
      });
      
      throw friendlyError;
    }
  }

  /**
   * Get backend performance statistics
   * @param {Object} config - Request configuration
   * @returns {Promise} - Promise that resolves with performance stats
   */
  static async getPerformanceStats(config = {}) {
    try {
      const response = await makeRequest(`${API_BASE_URL}/monitoring/performance`, {
        method: 'GET'
      }, {
        ...config,
        timeout: 5000,
        retries: 0
      }, 'getPerformanceStats');
      
      return await response.json();
    } catch (error) {
      const friendlyError = new Error(transformError(error, 'Getting performance statistics'));
      friendlyError.originalError = error;
      
      monitoringService.recordError('getPerformanceStats', error.message, 'api_call', {
        endpoint: '/monitoring/performance',
        method: 'GET'
      });
      
      throw friendlyError;
    }
  }

  /**
   * Get frontend monitoring statistics
   * @returns {Object} - Frontend performance statistics
   */
  static getFrontendStats() {
    return monitoringService.getPerformanceStats();
  }

  /**
   * Get recent frontend errors
   * @param {number} limit - Maximum number of errors to return
   * @returns {Array} - Recent error records
   */
  static getRecentErrors(limit = 10) {
    return monitoringService.getRecentErrors(limit);
  }

  /**
   * Export all monitoring data
   * @returns {Object} - Complete monitoring data
   */
  static exportMonitoringData() {
    return monitoringService.exportMetrics();
  }
}

export default ApiService;
export { transformError, DEFAULT_CONFIG };