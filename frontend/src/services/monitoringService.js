/**
 * Frontend Monitoring Service
 * 
 * Tracks API response times, errors, and user experience metrics
 * for production monitoring and performance optimization
 */

class MonitoringService {
  constructor() {
    this.metrics = {
      apiCalls: [],
      errors: [],
      performanceMarks: {},
      userActions: []
    };
    
    this.maxHistorySize = 100;
    this.performanceTargets = {
      comment_processing_ms: 2000,
      dashboard_loading_ms: 3000,
      wordcloud_generation_ms: 10000,
      api_response_ms: 1000
    };
  }

  /**
   * Record an API call with timing and result information
   * @param {string} endpoint - API endpoint name
   * @param {number} startTime - Request start time (performance.now())
   * @param {number} endTime - Request end time (performance.now())
   * @param {boolean} success - Whether the request was successful
   * @param {number} statusCode - HTTP status code
   * @param {string} errorMessage - Error message if failed
   */
  recordApiCall(endpoint, startTime, endTime, success, statusCode = 200, errorMessage = null) {
    const responseTime = endTime - startTime;
    
    const record = {
      endpoint,
      timestamp: new Date().toISOString(),
      responseTime,
      success,
      statusCode,
      errorMessage,
      exceedsTarget: this.checkPerformanceTarget(endpoint, responseTime)
    };
    
    // Add to metrics history
    this.metrics.apiCalls.push(record);
    
    // Limit history size
    if (this.metrics.apiCalls.length > this.maxHistorySize) {
      this.metrics.apiCalls.shift();
    }
    
    // Log slow requests
    if (record.exceedsTarget) {
      console.warn(`[Monitoring] Slow API call detected: ${endpoint} took ${responseTime.toFixed(2)}ms (target: ${this.getTargetForEndpoint(endpoint)}ms)`);
    }
    
    // Log errors
    if (!success) {
      this.recordError(endpoint, errorMessage, 'api_call');
    }
    
    return record;
  }

  /**
   * Record an error with context information
   * @param {string} context - Context where error occurred
   * @param {string} message - Error message
   * @param {string} type - Error type (api_call, user_action, system)
   * @param {Object} additionalData - Additional error context
   */
  recordError(context, message, type = 'general', additionalData = {}) {
    const errorRecord = {
      context,
      message: this.sanitizeErrorMessage(message),
      type,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      additionalData: this.sanitizeAdditionalData(additionalData)
    };
    
    this.metrics.errors.push(errorRecord);
    
    // Limit error history
    if (this.metrics.errors.length > this.maxHistorySize) {
      this.metrics.errors.shift();
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[Monitoring] Error recorded:', errorRecord);
    }
    
    return errorRecord;
  }

  /**
   * Start performance measurement for a user action
   * @param {string} action - Action name (e.g., 'submit_comment', 'load_dashboard')
   */
  startPerformanceMark(action) {
    this.metrics.performanceMarks[action] = {
      startTime: performance.now(),
      startTimestamp: new Date().toISOString()
    };
  }

  /**
   * End performance measurement and record the result
   * @param {string} action - Action name
   * @param {boolean} success - Whether the action was successful
   * @param {Object} metadata - Additional metadata about the action
   */
  endPerformanceMark(action, success = true, metadata = {}) {
    const mark = this.metrics.performanceMarks[action];
    if (!mark) {
      console.warn(`[Monitoring] No performance mark found for action: ${action}`);
      return null;
    }
    
    const endTime = performance.now();
    const duration = endTime - mark.startTime;
    
    const actionRecord = {
      action,
      startTimestamp: mark.startTimestamp,
      endTimestamp: new Date().toISOString(),
      duration,
      success,
      metadata: this.sanitizeAdditionalData(metadata),
      exceedsTarget: this.checkPerformanceTarget(action, duration)
    };
    
    this.metrics.userActions.push(actionRecord);
    
    // Limit history
    if (this.metrics.userActions.length > this.maxHistorySize) {
      this.metrics.userActions.shift();
    }
    
    // Clean up the mark
    delete this.metrics.performanceMarks[action];
    
    // Log slow actions
    if (actionRecord.exceedsTarget) {
      console.warn(`[Monitoring] Slow user action: ${action} took ${duration.toFixed(2)}ms (target: ${this.getTargetForEndpoint(action)}ms)`);
    }
    
    return actionRecord;
  }

  /**
   * Check if a response time exceeds the performance target
   * @param {string} endpoint - Endpoint or action name
   * @param {number} responseTime - Response time in milliseconds
   * @returns {boolean} - True if exceeds target
   */
  checkPerformanceTarget(endpoint, responseTime) {
    const target = this.getTargetForEndpoint(endpoint);
    return responseTime > target;
  }

  /**
   * Get performance target for an endpoint or action
   * @param {string} endpoint - Endpoint or action name
   * @returns {number} - Target time in milliseconds
   */
  getTargetForEndpoint(endpoint) {
    // Map endpoint names to performance targets
    const endpointMappings = {
      'submit_comment': 'comment_processing_ms',
      'submitComment': 'comment_processing_ms',
      'comment_submission': 'comment_processing_ms',
      
      'get_dashboard_stats': 'dashboard_loading_ms',
      'fetchDashboardStats': 'dashboard_loading_ms',
      'load_dashboard': 'dashboard_loading_ms',
      
      'generate_wordcloud': 'wordcloud_generation_ms',
      'generateWordcloud': 'wordcloud_generation_ms',
      'wordcloud_generation': 'wordcloud_generation_ms',
      
      // Default API response target for other endpoints
      'fetchComments': 'api_response_ms',
      'uploadCSV': 'api_response_ms',
      'checkHealth': 'api_response_ms'
    };
    
    const targetKey = endpointMappings[endpoint] || 'api_response_ms';
    return this.performanceTargets[targetKey];
  }

  /**
   * Sanitize error message to remove sensitive information
   * @param {string} message - Original error message
   * @returns {string} - Sanitized message
   */
  sanitizeErrorMessage(message) {
    if (!message) return 'Unknown error';
    
    // Remove potential sensitive patterns
    const sensitivePatterns = [
      /password["\']?\s*[:=]\s*["\']?[^"'\s,}]+/gi,
      /token["\']?\s*[:=]\s*["\']?[^"'\s,}]+/gi,
      /key["\']?\s*[:=]\s*["\']?[^"'\s,}]+/gi,
      /secret["\']?\s*[:=]\s*["\']?[^"'\s,}]+/gi,
    ];
    
    let sanitized = message;
    sensitivePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });
    
    return sanitized;
  }

  /**
   * Sanitize additional data to remove sensitive information
   * @param {Object} data - Original data object
   * @returns {Object} - Sanitized data object
   */
  sanitizeAdditionalData(data) {
    if (!data || typeof data !== 'object') return data;
    
    const sanitized = { ...data };
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'credential'];
    
    Object.keys(sanitized).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  /**
   * Get performance statistics summary
   * @returns {Object} - Performance statistics
   */
  getPerformanceStats() {
    const apiCalls = this.metrics.apiCalls;
    const userActions = this.metrics.userActions;
    
    if (apiCalls.length === 0 && userActions.length === 0) {
      return {
        totalApiCalls: 0,
        totalUserActions: 0,
        averageResponseTime: 0,
        errorRate: 0,
        slowRequestsCount: 0
      };
    }
    
    // API call statistics
    const successfulApiCalls = apiCalls.filter(call => call.success);
    const failedApiCalls = apiCalls.filter(call => !call.success);
    const slowApiCalls = apiCalls.filter(call => call.exceedsTarget);
    
    const avgApiResponseTime = successfulApiCalls.length > 0
      ? successfulApiCalls.reduce((sum, call) => sum + call.responseTime, 0) / successfulApiCalls.length
      : 0;
    
    // User action statistics
    const successfulActions = userActions.filter(action => action.success);
    const slowActions = userActions.filter(action => action.exceedsTarget);
    
    const avgActionTime = successfulActions.length > 0
      ? successfulActions.reduce((sum, action) => sum + action.duration, 0) / successfulActions.length
      : 0;
    
    return {
      timestamp: new Date().toISOString(),
      apiCalls: {
        total: apiCalls.length,
        successful: successfulApiCalls.length,
        failed: failedApiCalls.length,
        slow: slowApiCalls.length,
        averageResponseTime: Math.round(avgApiResponseTime),
        errorRate: apiCalls.length > 0 ? (failedApiCalls.length / apiCalls.length) * 100 : 0
      },
      userActions: {
        total: userActions.length,
        successful: successfulActions.length,
        slow: slowActions.length,
        averageDuration: Math.round(avgActionTime)
      },
      errors: {
        total: this.metrics.errors.length,
        byType: this.getErrorsByType()
      },
      performanceTargets: this.performanceTargets
    };
  }

  /**
   * Get errors grouped by type
   * @returns {Object} - Errors grouped by type
   */
  getErrorsByType() {
    const errorsByType = {};
    this.metrics.errors.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
    });
    return errorsByType;
  }

  /**
   * Get recent errors for debugging
   * @param {number} limit - Maximum number of errors to return
   * @returns {Array} - Recent error records
   */
  getRecentErrors(limit = 10) {
    return this.metrics.errors
      .slice(-limit)
      .reverse(); // Most recent first
  }

  /**
   * Clear all metrics (useful for testing or reset)
   */
  clearMetrics() {
    this.metrics = {
      apiCalls: [],
      errors: [],
      performanceMarks: {},
      userActions: []
    };
  }

  /**
   * Export metrics for external monitoring systems
   * @returns {Object} - Complete metrics data
   */
  exportMetrics() {
    return {
      timestamp: new Date().toISOString(),
      summary: this.getPerformanceStats(),
      rawData: {
        apiCalls: this.metrics.apiCalls,
        userActions: this.metrics.userActions,
        errors: this.metrics.errors
      }
    };
  }
}

// Create singleton instance
const monitoringService = new MonitoringService();

export default monitoringService;
export { MonitoringService };