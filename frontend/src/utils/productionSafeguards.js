/**
 * Production Safeguards for Loading State Management
 * 
 * This module provides production-safe monitoring and safeguards for the loading state system.
 * It includes performance monitoring, user experience validation, and pattern detection
 * while ensuring no sensitive data is exposed in production builds.
 */

class ProductionSafeguards {
  constructor(loadingStateManager, options = {}) {
    this.manager = loadingStateManager;
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isDevelopment = process.env.NODE_ENV === 'development';
    
    // Configuration options
    this.options = {
      enablePerformanceMonitoring: options.enablePerformanceMonitoring !== false,
      enableUserExperienceValidation: options.enableUserExperienceValidation !== false,
      enablePatternMonitoring: options.enablePatternMonitoring !== false,
      performanceThresholds: {
        slowOperationMs: options.slowOperationMs || 5000,
        verySlowOperationMs: options.verySlowOperationMs || 15000,
        stuckOperationMs: options.stuckOperationMs || 30000,
        maxConcurrentOperations: options.maxConcurrentOperations || 5,
        rapidCyclingThreshold: options.rapidCyclingThreshold || 3
      },
      reportingEndpoint: options.reportingEndpoint || null,
      enableLocalStorage: options.enableLocalStorage && !this.isProduction,
      ...options
    };
    
    // Production-safe storage
    this.performanceMetrics = new Map();
    this.userExperienceMetrics = new Map();
    this.patternDetectionData = new Map();
    this.alertHistory = [];
    this.sessionStartTime = Date.now();
    this.sessionId = this.generateSessionId();
    
    // Initialize safeguards
    this.initialize();
  }

  /**
   * Initialize production safeguards
   */
  initialize() {
    if (this.options.enablePerformanceMonitoring) {
      this.initializePerformanceMonitoring();
    }
    
    if (this.options.enableUserExperienceValidation) {
      this.initializeUserExperienceValidation();
    }
    
    if (this.options.enablePatternMonitoring) {
      this.initializePatternMonitoring();
    }
    
    // Set up periodic reporting
    this.setupPeriodicReporting();
    
    // Set up cleanup on page unload
    this.setupCleanupHandlers();
    
    this.logSafely('info', 'Production safeguards initialized', {
      isProduction: this.isProduction,
      sessionId: this.sessionId,
      enabledFeatures: {
        performance: this.options.enablePerformanceMonitoring,
        userExperience: this.options.enableUserExperienceValidation,
        patterns: this.options.enablePatternMonitoring
      }
    });
  }

  /**
   * Initialize performance monitoring
   */
  initializePerformanceMonitoring() {
    // Hook into loading state manager events
    const originalStartLoading = this.manager.startLoading.bind(this.manager);
    const originalStopLoading = this.manager.stopLoading.bind(this.manager);
    
    this.manager.startLoading = (operation, options = {}) => {
      const startTime = performance.now();
      const result = originalStartLoading(operation, options);
      
      this.trackOperationStart(operation, startTime, options);
      return result;
    };
    
    this.manager.stopLoading = (operation, options = {}) => {
      const endTime = performance.now();
      const result = originalStopLoading(operation, options);
      
      this.trackOperationEnd(operation, endTime, options);
      return result;
    };
    
    // Monitor for stuck operations
    this.stuckOperationMonitor = setInterval(() => {
      this.checkForStuckOperations();
    }, 10000); // Check every 10 seconds
    
    this.logSafely('debug', 'Performance monitoring initialized');
  }

  /**
   * Initialize user experience validation
   */
  initializeUserExperienceValidation() {
    // Track user experience metrics
    this.uxMetrics = {
      totalLoadingEvents: 0,
      userInitiatedEvents: 0,
      automaticEvents: 0,
      averageLoadingDuration: 0,
      longLoadingEvents: 0,
      stuckLoadingEvents: 0,
      rapidCyclingEvents: 0
    };
    
    // Monitor page visibility changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.handleVisibilityChange();
      });
    }
    
    this.logSafely('debug', 'User experience validation initialized');
  }

  /**
   * Initialize pattern monitoring
   */
  initializePatternMonitoring() {
    this.patterns = {
      operationFrequency: new Map(),
      timePatterns: new Map(),
      errorPatterns: new Map(),
      userActionPatterns: new Map()
    };
    
    // Monitor patterns every 30 seconds
    this.patternMonitor = setInterval(() => {
      this.analyzePatterns();
    }, 30000);
    
    this.logSafely('debug', 'Pattern monitoring initialized');
  }

  /**
   * Track operation start for performance monitoring
   */
  trackOperationStart(operation, startTime, options) {
    const operationData = {
      operation,
      startTime,
      highResStartTime: performance.now(),
      userTriggered: this.isUserTriggered(options),
      concurrent: this.manager.isLoading() ? Object.keys(this.manager.getActiveOperations()).length : 0
    };
    
    this.performanceMetrics.set(operation, operationData);
    
    // Update UX metrics
    this.uxMetrics.totalLoadingEvents++;
    if (operationData.userTriggered) {
      this.uxMetrics.userInitiatedEvents++;
    } else {
      this.uxMetrics.automaticEvents++;
    }
    
    // Check for too many concurrent operations
    if (operationData.concurrent > this.options.performanceThresholds.maxConcurrentOperations) {
      this.reportIssue('high_concurrency', {
        operation,
        concurrentCount: operationData.concurrent,
        threshold: this.options.performanceThresholds.maxConcurrentOperations
      });
    }
    
    // Update pattern data
    this.updateOperationFrequency(operation);
  }

  /**
   * Track operation end for performance monitoring
   */
  trackOperationEnd(operation, endTime, options) {
    const operationData = this.performanceMetrics.get(operation);
    if (!operationData) return;
    
    const duration = endTime - operationData.highResStartTime;
    operationData.duration = duration;
    operationData.endTime = endTime;
    operationData.completed = true;
    
    // Update average duration
    this.updateAverageDuration(duration);
    
    // Check performance thresholds
    this.checkPerformanceThresholds(operation, duration, operationData);
    
    // Update UX metrics
    if (duration > this.options.performanceThresholds.slowOperationMs) {
      this.uxMetrics.longLoadingEvents++;
    }
    
    // Clean up completed operation
    this.performanceMetrics.delete(operation);
    
    // Report to analytics if configured
    this.reportPerformanceMetric(operation, duration, operationData);
  }

  /**
   * Check if operation is user-triggered
   */
  isUserTriggered(options) {
    return !!(options.userAction || options.triggerElement || options.explicit);
  }

  /**
   * Update average loading duration
   */
  updateAverageDuration(duration) {
    const currentAvg = this.uxMetrics.averageLoadingDuration;
    const currentCount = this.uxMetrics.totalLoadingEvents;
    
    this.uxMetrics.averageLoadingDuration = 
      (currentAvg * (currentCount - 1) + duration) / currentCount;
  }

  /**
   * Check performance thresholds and report issues
   */
  checkPerformanceThresholds(operation, duration, operationData) {
    const thresholds = this.options.performanceThresholds;
    
    if (duration > thresholds.verySlowOperationMs) {
      this.reportIssue('very_slow_operation', {
        operation,
        duration: Math.round(duration),
        threshold: thresholds.verySlowOperationMs,
        userTriggered: operationData.userTriggered
      });
    } else if (duration > thresholds.slowOperationMs) {
      this.reportIssue('slow_operation', {
        operation,
        duration: Math.round(duration),
        threshold: thresholds.slowOperationMs,
        userTriggered: operationData.userTriggered
      });
    }
  }

  /**
   * Check for stuck operations
   */
  checkForStuckOperations() {
    const now = performance.now();
    const threshold = this.options.performanceThresholds.stuckOperationMs;
    
    this.performanceMetrics.forEach((operationData, operation) => {
      const duration = now - operationData.highResStartTime;
      
      if (duration > threshold) {
        this.reportIssue('stuck_operation', {
          operation,
          duration: Math.round(duration),
          threshold,
          userTriggered: operationData.userTriggered
        });
        
        this.uxMetrics.stuckLoadingEvents++;
        
        // Force cleanup stuck operation
        this.performanceMetrics.delete(operation);
      }
    });
  }

  /**
   * Update operation frequency for pattern detection
   */
  updateOperationFrequency(operation) {
    const now = Date.now();
    const windowSize = 60000; // 1 minute window
    
    if (!this.patterns.operationFrequency.has(operation)) {
      this.patterns.operationFrequency.set(operation, []);
    }
    
    const timestamps = this.patterns.operationFrequency.get(operation);
    timestamps.push(now);
    
    // Remove old timestamps outside the window
    const recentTimestamps = timestamps.filter(ts => now - ts < windowSize);
    this.patterns.operationFrequency.set(operation, recentTimestamps);
    
    // Check for rapid cycling
    if (recentTimestamps.length > this.options.performanceThresholds.rapidCyclingThreshold) {
      this.reportIssue('rapid_cycling', {
        operation,
        frequency: recentTimestamps.length,
        timeWindow: '1 minute',
        threshold: this.options.performanceThresholds.rapidCyclingThreshold
      });
      
      this.uxMetrics.rapidCyclingEvents++;
    }
  }

  /**
   * Analyze patterns for anomalies
   */
  analyzePatterns() {
    this.analyzeTimePatterns();
    this.analyzeUserActionPatterns();
    this.cleanupOldPatternData();
  }

  /**
   * Analyze time-based patterns
   */
  analyzeTimePatterns() {
    const now = Date.now();
    const hour = new Date(now).getHours();
    
    if (!this.patterns.timePatterns.has(hour)) {
      this.patterns.timePatterns.set(hour, { count: 0, operations: [] });
    }
    
    const hourData = this.patterns.timePatterns.get(hour);
    hourData.count++;
    
    // Detect unusual activity patterns
    const averageHourlyActivity = Array.from(this.patterns.timePatterns.values())
      .reduce((sum, data) => sum + data.count, 0) / this.patterns.timePatterns.size;
    
    if (hourData.count > averageHourlyActivity * 3) {
      this.reportIssue('unusual_activity_pattern', {
        hour,
        activityCount: hourData.count,
        averageActivity: Math.round(averageHourlyActivity)
      });
    }
  }

  /**
   * Analyze user action patterns
   */
  analyzeUserActionPatterns() {
    const userInitiatedRate = this.uxMetrics.userInitiatedEvents / this.uxMetrics.totalLoadingEvents;
    
    if (userInitiatedRate < 0.7) { // Less than 70% user-initiated
      this.reportIssue('low_user_initiation_rate', {
        rate: Math.round(userInitiatedRate * 100),
        threshold: 70,
        totalEvents: this.uxMetrics.totalLoadingEvents,
        userInitiated: this.uxMetrics.userInitiatedEvents,
        automatic: this.uxMetrics.automaticEvents
      });
    }
  }

  /**
   * Clean up old pattern data
   */
  cleanupOldPatternData() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    // Clean up operation frequency data
    this.patterns.operationFrequency.forEach((timestamps, operation) => {
      const recentTimestamps = timestamps.filter(ts => now - ts < maxAge);
      if (recentTimestamps.length === 0) {
        this.patterns.operationFrequency.delete(operation);
      } else {
        this.patterns.operationFrequency.set(operation, recentTimestamps);
      }
    });
  }

  /**
   * Handle page visibility changes
   */
  handleVisibilityChange() {
    if (document.hidden) {
      // Page became hidden - pause monitoring
      this.pauseMonitoring();
    } else {
      // Page became visible - resume monitoring
      this.resumeMonitoring();
    }
  }

  /**
   * Pause monitoring when page is hidden
   */
  pauseMonitoring() {
    this.monitoringPaused = true;
    this.logSafely('debug', 'Monitoring paused - page hidden');
  }

  /**
   * Resume monitoring when page becomes visible
   */
  resumeMonitoring() {
    this.monitoringPaused = false;
    this.logSafely('debug', 'Monitoring resumed - page visible');
  }

  /**
   * Report performance metric to analytics
   */
  reportPerformanceMetric(operation, duration, operationData) {
    if (this.monitoringPaused) return;
    
    const metric = {
      type: 'loading_performance',
      operation,
      duration: Math.round(duration),
      userTriggered: operationData.userTriggered,
      concurrent: operationData.concurrent,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };
    
    // Send to analytics endpoint if configured
    if (this.options.reportingEndpoint) {
      this.sendToAnalytics(metric);
    }
    
    // Store locally for development
    if (this.options.enableLocalStorage && this.isDevelopment) {
      this.storeMetricLocally(metric);
    }
  }

  /**
   * Report an issue
   */
  reportIssue(issueType, details) {
    if (this.monitoringPaused) return;
    
    const issue = {
      type: issueType,
      details,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      severity: this.getIssueSeverity(issueType)
    };
    
    // Add to alert history
    this.alertHistory.push(issue);
    
    // Limit alert history size
    if (this.alertHistory.length > 100) {
      this.alertHistory = this.alertHistory.slice(-50);
    }
    
    // Log safely based on severity
    this.logSafely(issue.severity === 'critical' ? 'error' : 'warn', 
      `Loading state issue detected: ${issueType}`, details);
    
    // Send to analytics if configured
    if (this.options.reportingEndpoint) {
      this.sendToAnalytics({
        type: 'loading_issue',
        ...issue
      });
    }
    
    // Store locally for development
    if (this.options.enableLocalStorage && this.isDevelopment) {
      this.storeIssueLocally(issue);
    }
  }

  /**
   * Get issue severity level
   */
  getIssueSeverity(issueType) {
    const severityMap = {
      'stuck_operation': 'critical',
      'very_slow_operation': 'high',
      'high_concurrency': 'high',
      'rapid_cycling': 'high',
      'slow_operation': 'medium',
      'low_user_initiation_rate': 'medium',
      'unusual_activity_pattern': 'low'
    };
    
    return severityMap[issueType] || 'low';
  }

  /**
   * Send data to analytics endpoint
   */
  async sendToAnalytics(data) {
    if (!this.options.reportingEndpoint) return;
    
    try {
      // Use sendBeacon for reliability, fallback to fetch
      if (navigator.sendBeacon) {
        const success = navigator.sendBeacon(
          this.options.reportingEndpoint,
          JSON.stringify(data)
        );
        if (!success) {
          throw new Error('sendBeacon failed');
        }
      } else {
        await fetch(this.options.reportingEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data),
          keepalive: true
        });
      }
    } catch (error) {
      this.logSafely('error', 'Failed to send analytics data', { error: error.message });
    }
  }

  /**
   * Store metric locally for development
   */
  storeMetricLocally(metric) {
    try {
      const key = 'loadingStateMetrics';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push(metric);
      
      // Limit storage size
      if (existing.length > 1000) {
        existing.splice(0, existing.length - 500);
      }
      
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (error) {
      // Ignore localStorage errors
    }
  }

  /**
   * Store issue locally for development
   */
  storeIssueLocally(issue) {
    try {
      const key = 'loadingStateIssues';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push(issue);
      
      // Limit storage size
      if (existing.length > 200) {
        existing.splice(0, existing.length - 100);
      }
      
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (error) {
      // Ignore localStorage errors
    }
  }

  /**
   * Set up periodic reporting
   */
  setupPeriodicReporting() {
    // Report summary every 5 minutes
    this.reportingInterval = setInterval(() => {
      this.generatePeriodicReport();
    }, 5 * 60 * 1000);
  }

  /**
   * Generate periodic summary report
   */
  generatePeriodicReport() {
    if (this.monitoringPaused) return;
    
    const sessionDuration = Date.now() - this.sessionStartTime;
    const report = {
      type: 'periodic_summary',
      sessionId: this.sessionId,
      sessionDuration,
      metrics: {
        ...this.uxMetrics,
        averageLoadingDuration: Math.round(this.uxMetrics.averageLoadingDuration)
      },
      issues: {
        total: this.alertHistory.length,
        critical: this.alertHistory.filter(i => i.severity === 'critical').length,
        high: this.alertHistory.filter(i => i.severity === 'high').length,
        medium: this.alertHistory.filter(i => i.severity === 'medium').length,
        low: this.alertHistory.filter(i => i.severity === 'low').length
      },
      patterns: {
        operationTypes: this.patterns.operationFrequency.size,
        timePatterns: this.patterns.timePatterns.size
      },
      timestamp: Date.now()
    };
    
    // Send to analytics if configured
    if (this.options.reportingEndpoint) {
      this.sendToAnalytics(report);
    }
    
    this.logSafely('debug', 'Periodic report generated', report);
  }

  /**
   * Set up cleanup handlers
   */
  setupCleanupHandlers() {
    if (typeof window !== 'undefined') {
      // Clean up on page unload
      window.addEventListener('beforeunload', () => {
        this.generateFinalReport();
        this.cleanup();
      });
      
      // Clean up on page hide (for mobile)
      window.addEventListener('pagehide', () => {
        this.generateFinalReport();
        this.cleanup();
      });
    }
  }

  /**
   * Generate final report before cleanup
   */
  generateFinalReport() {
    const sessionDuration = Date.now() - this.sessionStartTime;
    const finalReport = {
      type: 'session_summary',
      sessionId: this.sessionId,
      sessionDuration,
      finalMetrics: {
        ...this.uxMetrics,
        averageLoadingDuration: Math.round(this.uxMetrics.averageLoadingDuration)
      },
      totalIssues: this.alertHistory.length,
      issuesSummary: this.alertHistory.reduce((summary, issue) => {
        summary[issue.type] = (summary[issue.type] || 0) + 1;
        return summary;
      }, {}),
      timestamp: Date.now()
    };
    
    // Send final report
    if (this.options.reportingEndpoint) {
      this.sendToAnalytics(finalReport);
    }
    
    this.logSafely('info', 'Final session report generated', finalReport);
  }

  /**
   * Production-safe logging
   */
  logSafely(level, message, data = {}) {
    // Only log in development or if explicitly enabled
    if (!this.isDevelopment && !this.options.enableProductionLogging) {
      return;
    }
    
    // Sanitize data for production
    const sanitizedData = this.isProduction ? this.sanitizeData(data) : data;
    
    const logData = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      level,
      message,
      ...sanitizedData
    };
    
    switch (level) {
      case 'error':
        console.error(`[ProductionSafeguards] ${message}`, sanitizedData);
        break;
      case 'warn':
        console.warn(`[ProductionSafeguards] ${message}`, sanitizedData);
        break;
      case 'info':
        console.info(`[ProductionSafeguards] ${message}`, sanitizedData);
        break;
      case 'debug':
        if (this.isDevelopment) {
          console.log(`[ProductionSafeguards] ${message}`, sanitizedData);
        }
        break;
      default:
        console.log(`[ProductionSafeguards] ${message}`, sanitizedData);
    }
  }

  /**
   * Sanitize data for production logging
   */
  sanitizeData(data) {
    if (!data || typeof data !== 'object') return data;
    
    const sanitized = {};
    
    Object.keys(data).forEach(key => {
      const value = data[key];
      
      // Remove sensitive fields
      if (this.isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    });
    
    return sanitized;
  }

  /**
   * Check if field contains sensitive data
   */
  isSensitiveField(fieldName) {
    const sensitiveFields = [
      'stackTrace', 'stack', 'error', 'userAgent', 'ip', 'email', 
      'password', 'token', 'key', 'secret', 'auth', 'session'
    ];
    
    return sensitiveFields.some(sensitive => 
      fieldName.toLowerCase().includes(sensitive.toLowerCase())
    );
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return `ps_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current metrics summary
   */
  getMetricsSummary() {
    return {
      sessionId: this.sessionId,
      sessionDuration: Date.now() - this.sessionStartTime,
      uxMetrics: { ...this.uxMetrics },
      issueCount: this.alertHistory.length,
      recentIssues: this.alertHistory.slice(-5),
      isMonitoring: !this.monitoringPaused
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.stuckOperationMonitor) {
      clearInterval(this.stuckOperationMonitor);
    }
    
    if (this.patternMonitor) {
      clearInterval(this.patternMonitor);
    }
    
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }
    
    this.performanceMetrics.clear();
    this.userExperienceMetrics.clear();
    this.patternDetectionData.clear();
    
    this.logSafely('info', 'Production safeguards cleanup completed');
  }
}

export default ProductionSafeguards;