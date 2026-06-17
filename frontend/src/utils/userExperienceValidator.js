/**
 * User Experience Validator for Loading States
 * 
 * This module validates loading states from a user experience perspective,
 * ensuring that loading indicators provide appropriate feedback and don't
 * negatively impact the user experience.
 */

class UserExperienceValidator {
  constructor(loadingStateManager, config = {}) {
    this.manager = loadingStateManager;
    this.config = {
      // UX thresholds
      minLoadingDuration: config.minLoadingDuration || 100, // Don't show loading for very short operations
      maxAcceptableDelay: config.maxAcceptableDelay || 3000, // Max acceptable delay before user feedback
      flashingThreshold: config.flashingThreshold || 200, // Prevent flashing loading states
      
      // User feedback thresholds
      progressFeedbackThreshold: config.progressFeedbackThreshold || 5000, // Show progress after 5s
      timeoutWarningThreshold: config.timeoutWarningThreshold || 15000, // Warn user after 15s
      
      // Pattern detection
      rapidCyclingWindow: config.rapidCyclingWindow || 5000, // 5 second window
      maxCyclesInWindow: config.maxCyclesInWindow || 3, // Max 3 cycles in window
      
      // Accessibility
      enableAriaUpdates: config.enableAriaUpdates !== false,
      enableScreenReaderFeedback: config.enableScreenReaderFeedback !== false,
      
      ...config
    };
    
    // UX metrics tracking
    this.uxMetrics = {
      totalLoadingEvents: 0,
      shortLoadingEvents: 0, // < minLoadingDuration
      longLoadingEvents: 0, // > maxAcceptableDelay
      flashingEvents: 0, // < flashingThreshold
      userFeedbackEvents: 0,
      accessibilityViolations: 0,
      rapidCyclingDetections: 0
    };
    
    // State tracking
    this.activeValidations = new Map();
    this.loadingHistory = [];
    this.userFeedbackQueue = [];
    this.accessibilityState = new Map();
    
    // Initialize validator
    this.initialize();
  }

  /**
   * Initialize the UX validator
   */
  initialize() {
    this.setupLoadingStateHooks();
    this.setupAccessibilityMonitoring();
    this.setupUserFeedbackSystem();
    this.setupPeriodicValidation();
    
    console.log('[UserExperienceValidator] Initialized with UX monitoring');
  }

  /**
   * Set up hooks into loading state manager
   */
  setupLoadingStateHooks() {
    // Hook into start loading
    const originalStartLoading = this.manager.startLoading.bind(this.manager);
    this.manager.startLoading = (operation, options = {}) => {
      const startTime = performance.now();
      const result = originalStartLoading(operation, options);
      
      this.validateLoadingStart(operation, startTime, options);
      return result;
    };
    
    // Hook into stop loading
    const originalStopLoading = this.manager.stopLoading.bind(this.manager);
    this.manager.stopLoading = (operation, options = {}) => {
      const endTime = performance.now();
      const result = originalStopLoading(operation, options);
      
      this.validateLoadingEnd(operation, endTime, options);
      return result;
    };
  }

  /**
   * Validate loading start from UX perspective
   */
  validateLoadingStart(operation, startTime, options) {
    const validation = {
      operation,
      startTime,
      userTriggered: this.isUserTriggered(options),
      hasUserFeedback: this.hasUserFeedback(operation),
      hasAccessibilitySupport: this.hasAccessibilitySupport(operation),
      expectedDuration: this.estimateOperationDuration(operation),
      issues: []
    };
    
    // Check for rapid cycling
    this.checkRapidCycling(operation, startTime, validation);
    
    // Check for accessibility requirements
    this.checkAccessibilityRequirements(operation, validation);
    
    // Check for user feedback requirements
    this.checkUserFeedbackRequirements(operation, validation);
    
    // Store validation
    this.activeValidations.set(operation, validation);
    
    // Update metrics
    this.uxMetrics.totalLoadingEvents++;
    
    // Schedule UX checks
    this.scheduleUXChecks(operation, validation);
    
    // Report issues immediately
    this.reportValidationIssues(validation);
  }

  /**
   * Validate loading end from UX perspective
   */
  validateLoadingEnd(operation, endTime, options) {
    const validation = this.activeValidations.get(operation);
    if (!validation) return;
    
    const duration = endTime - validation.startTime;
    validation.endTime = endTime;
    validation.duration = duration;
    validation.completedNormally = !options.isTimeout && !options.isError;
    
    // Validate duration appropriateness
    this.validateLoadingDuration(validation);
    
    // Check for flashing loading states
    this.checkFlashingLoading(validation);
    
    // Validate user feedback was appropriate
    this.validateUserFeedback(validation);
    
    // Update accessibility state
    this.updateAccessibilityState(operation, 'completed');
    
    // Add to history
    this.addToLoadingHistory(validation);
    
    // Clean up
    this.activeValidations.delete(operation);
    this.clearScheduledChecks(operation);
    
    // Report final validation results
    this.reportValidationResults(validation);
  }

  /**
   * Check for rapid cycling patterns
   */
  checkRapidCycling(operation, startTime, validation) {
    const windowStart = startTime - this.config.rapidCyclingWindow;
    const recentOperations = this.loadingHistory.filter(h => 
      h.operation === operation && 
      h.startTime > windowStart
    );
    
    if (recentOperations.length >= this.config.maxCyclesInWindow) {
      validation.issues.push({
        type: 'rapid_cycling',
        severity: 'high',
        message: `Operation ${operation} started ${recentOperations.length + 1} times in ${this.config.rapidCyclingWindow}ms`,
        recommendation: 'Implement debouncing or check for infinite loops',
        uxImpact: 'Causes jarring user experience with flashing loading states'
      });
      
      this.uxMetrics.rapidCyclingDetections++;
    }
  }

  /**
   * Check accessibility requirements
   */
  checkAccessibilityRequirements(operation, validation) {
    if (!this.config.enableAriaUpdates) return;
    
    const issues = [];
    
    // Check for ARIA live region updates
    if (!this.hasAriaLiveRegion()) {
      issues.push({
        type: 'missing_aria_live',
        severity: 'medium',
        message: 'No ARIA live region found for loading state announcements',
        recommendation: 'Add aria-live region for screen reader feedback',
        uxImpact: 'Screen reader users may not be aware of loading states'
      });
    }
    
    // Check for loading indicator accessibility
    if (!this.hasAccessibleLoadingIndicator(operation)) {
      issues.push({
        type: 'inaccessible_loading_indicator',
        severity: 'medium',
        message: `Loading indicator for ${operation} lacks accessibility attributes`,
        recommendation: 'Add aria-label, role, and aria-describedby attributes',
        uxImpact: 'Loading state not announced to assistive technologies'
      });
    }
    
    // Check for keyboard accessibility during loading
    if (validation.userTriggered && !this.maintainsKeyboardAccessibility(operation)) {
      issues.push({
        type: 'keyboard_accessibility_lost',
        severity: 'high',
        message: `Keyboard accessibility compromised during ${operation} loading`,
        recommendation: 'Ensure keyboard navigation remains functional during loading',
        uxImpact: 'Keyboard users cannot navigate while loading'
      });
    }
    
    validation.issues.push(...issues);
    this.uxMetrics.accessibilityViolations += issues.length;
  }

  /**
   * Check user feedback requirements
   */
  checkUserFeedbackRequirements(operation, validation) {
    const expectedDuration = validation.expectedDuration;
    
    // For operations expected to take longer than threshold, ensure feedback is planned
    if (expectedDuration > this.config.maxAcceptableDelay) {
      if (!validation.hasUserFeedback) {
        validation.issues.push({
          type: 'missing_user_feedback',
          severity: 'high',
          message: `Long operation ${operation} (expected ${expectedDuration}ms) lacks user feedback`,
          recommendation: 'Add progress indicator, status message, or cancel option',
          uxImpact: 'Users may think the application is frozen'
        });
      }
    }
    
    // Check for appropriate loading message
    if (!this.hasAppropriateLoadingMessage(operation)) {
      validation.issues.push({
        type: 'generic_loading_message',
        severity: 'low',
        message: `Operation ${operation} uses generic loading message`,
        recommendation: 'Provide specific, contextual loading messages',
        uxImpact: 'Users lack context about what is happening'
      });
    }
  }

  /**
   * Validate loading duration appropriateness
   */
  validateLoadingDuration(validation) {
    const duration = validation.duration;
    
    // Too short - may cause flashing
    if (duration < this.config.minLoadingDuration) {
      validation.issues.push({
        type: 'too_short_loading',
        severity: 'medium',
        message: `Loading duration ${duration}ms is too short, may cause flashing`,
        recommendation: 'Add minimum display time or skip loading indicator for very fast operations',
        uxImpact: 'Flashing loading states are jarring and distracting'
      });
      
      this.uxMetrics.shortLoadingEvents++;
    }
    
    // Too long without feedback
    if (duration > this.config.maxAcceptableDelay && !validation.hasUserFeedback) {
      validation.issues.push({
        type: 'too_long_without_feedback',
        severity: 'high',
        message: `Loading duration ${duration}ms exceeds acceptable delay without user feedback`,
        recommendation: 'Add progress indicator, estimated time, or cancel option',
        uxImpact: 'Users may think the application is unresponsive'
      });
      
      this.uxMetrics.longLoadingEvents++;
    }
  }

  /**
   * Check for flashing loading states
   */
  checkFlashingLoading(validation) {
    if (validation.duration < this.config.flashingThreshold) {
      validation.issues.push({
        type: 'flashing_loading',
        severity: 'medium',
        message: `Loading state flashed for only ${validation.duration}ms`,
        recommendation: 'Implement minimum display time or delay showing loading indicator',
        uxImpact: 'Flashing loading states create poor user experience'
      });
      
      this.uxMetrics.flashingEvents++;
    }
  }

  /**
   * Validate user feedback was appropriate
   */
  validateUserFeedback(validation) {
    if (validation.duration > this.config.progressFeedbackThreshold) {
      if (!this.providedProgressFeedback(validation.operation)) {
        validation.issues.push({
          type: 'missing_progress_feedback',
          severity: 'medium',
          message: `Long operation ${validation.operation} (${validation.duration}ms) lacked progress feedback`,
          recommendation: 'Show progress bar, percentage, or step indicators for long operations',
          uxImpact: 'Users cannot gauge progress of long-running operations'
        });
      }
    }
    
    if (validation.duration > this.config.timeoutWarningThreshold) {
      if (!this.providedTimeoutWarning(validation.operation)) {
        validation.issues.push({
          type: 'missing_timeout_warning',
          severity: 'low',
          message: `Very long operation ${validation.operation} (${validation.duration}ms) lacked timeout warning`,
          recommendation: 'Warn users about potentially long operations and provide cancel option',
          uxImpact: 'Users may abandon the application thinking it is broken'
        });
      }
    }
  }

  /**
   * Schedule UX checks during loading
   */
  scheduleUXChecks(operation, validation) {
    const checks = [];
    
    // Check for progress feedback after threshold
    if (validation.expectedDuration > this.config.progressFeedbackThreshold) {
      checks.push(setTimeout(() => {
        this.checkProgressFeedback(operation);
      }, this.config.progressFeedbackThreshold));
    }
    
    // Check for timeout warning
    if (validation.expectedDuration > this.config.timeoutWarningThreshold) {
      checks.push(setTimeout(() => {
        this.checkTimeoutWarning(operation);
      }, this.config.timeoutWarningThreshold));
    }
    
    // Store checks for cleanup
    validation.scheduledChecks = checks;
  }

  /**
   * Clear scheduled checks
   */
  clearScheduledChecks(operation) {
    const validation = this.activeValidations.get(operation);
    if (validation && validation.scheduledChecks) {
      validation.scheduledChecks.forEach(check => clearTimeout(check));
    }
  }

  /**
   * Check if operation is user-triggered
   */
  isUserTriggered(options) {
    return !!(options.userAction || options.triggerElement || options.explicit);
  }

  /**
   * Check if operation has user feedback
   */
  hasUserFeedback(operation) {
    // Check for loading indicators, progress bars, status messages
    const indicators = document.querySelectorAll('[data-loading-operation], [aria-busy="true"], .loading, .spinner');
    return Array.from(indicators).some(el => 
      el.dataset.loadingOperation === operation || 
      el.textContent.includes(operation) ||
      el.getAttribute('aria-label')?.includes(operation)
    );
  }

  /**
   * Check if operation has accessibility support
   */
  hasAccessibilitySupport(operation) {
    const ariaElements = document.querySelectorAll('[aria-busy], [aria-live], [role="status"], [role="progressbar"]');
    return ariaElements.length > 0;
  }

  /**
   * Estimate operation duration based on history
   */
  estimateOperationDuration(operation) {
    const historicalData = this.loadingHistory
      .filter(h => h.operation === operation && h.duration)
      .slice(-10); // Last 10 operations
    
    if (historicalData.length === 0) {
      return this.config.maxAcceptableDelay; // Default estimate
    }
    
    const averageDuration = historicalData.reduce((sum, h) => sum + h.duration, 0) / historicalData.length;
    return Math.round(averageDuration);
  }

  /**
   * Check for ARIA live region
   */
  hasAriaLiveRegion() {
    return document.querySelector('[aria-live]') !== null;
  }

  /**
   * Check for accessible loading indicator
   */
  hasAccessibleLoadingIndicator(operation) {
    const indicators = document.querySelectorAll('.loading, .spinner, [role="status"]');
    return Array.from(indicators).some(el => 
      el.getAttribute('aria-label') || 
      el.getAttribute('aria-describedby') ||
      el.getAttribute('role')
    );
  }

  /**
   * Check if keyboard accessibility is maintained
   */
  maintainsKeyboardAccessibility(operation) {
    // Check if focusable elements are still accessible
    const focusableElements = document.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    
    return focusableElements.length > 0;
  }

  /**
   * Check for appropriate loading message
   */
  hasAppropriateLoadingMessage(operation) {
    const messages = document.querySelectorAll('.loading-message, [role="status"]');
    return Array.from(messages).some(el => {
      const text = el.textContent.toLowerCase();
      return !text.includes('loading...') && !text.includes('please wait');
    });
  }

  /**
   * Check if progress feedback was provided
   */
  providedProgressFeedback(operation) {
    const progressElements = document.querySelectorAll('[role="progressbar"], .progress, .progress-bar');
    return progressElements.length > 0;
  }

  /**
   * Check if timeout warning was provided
   */
  providedTimeoutWarning(operation) {
    const warningElements = document.querySelectorAll('.timeout-warning, .long-operation-warning');
    return warningElements.length > 0;
  }

  /**
   * Check progress feedback during operation
   */
  checkProgressFeedback(operation) {
    if (!this.activeValidations.has(operation)) return;
    
    if (!this.providedProgressFeedback(operation)) {
      this.reportRealTimeIssue(operation, {
        type: 'missing_realtime_progress',
        severity: 'medium',
        message: `Operation ${operation} running longer than ${this.config.progressFeedbackThreshold}ms without progress feedback`,
        recommendation: 'Show progress indicator now',
        uxImpact: 'Users cannot see operation progress'
      });
    }
  }

  /**
   * Check timeout warning during operation
   */
  checkTimeoutWarning(operation) {
    if (!this.activeValidations.has(operation)) return;
    
    if (!this.providedTimeoutWarning(operation)) {
      this.reportRealTimeIssue(operation, {
        type: 'missing_realtime_timeout_warning',
        severity: 'low',
        message: `Operation ${operation} running longer than ${this.config.timeoutWarningThreshold}ms without timeout warning`,
        recommendation: 'Warn user about long operation and provide cancel option',
        uxImpact: 'Users may think application is frozen'
      });
    }
  }

  /**
   * Set up accessibility monitoring
   */
  setupAccessibilityMonitoring() {
    if (!this.config.enableAriaUpdates) return;
    
    // Monitor ARIA attribute changes
    if (typeof MutationObserver !== 'undefined') {
      this.ariaObserver = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          if (mutation.type === 'attributes' && 
              (mutation.attributeName === 'aria-busy' || 
               mutation.attributeName === 'aria-live' ||
               mutation.attributeName === 'role')) {
            this.handleAriaChange(mutation);
          }
        });
      });
      
      this.ariaObserver.observe(document.body, {
        attributes: true,
        subtree: true,
        attributeFilter: ['aria-busy', 'aria-live', 'role']
      });
    }
  }

  /**
   * Handle ARIA attribute changes
   */
  handleAriaChange(mutation) {
    const element = mutation.target;
    const attributeName = mutation.attributeName;
    const newValue = element.getAttribute(attributeName);
    
    // Track accessibility state changes
    if (attributeName === 'aria-busy') {
      this.updateAccessibilityState(element.id || 'unknown', newValue === 'true' ? 'busy' : 'idle');
    }
  }

  /**
   * Update accessibility state
   */
  updateAccessibilityState(operation, state) {
    this.accessibilityState.set(operation, {
      state,
      timestamp: Date.now(),
      element: operation
    });
  }

  /**
   * Set up user feedback system
   */
  setupUserFeedbackSystem() {
    // Monitor for user feedback elements
    if (typeof MutationObserver !== 'undefined') {
      this.feedbackObserver = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                this.checkForUserFeedbackElements(node);
              }
            });
          }
        });
      });
      
      this.feedbackObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  /**
   * Check for user feedback elements
   */
  checkForUserFeedbackElements(element) {
    const feedbackSelectors = [
      '.loading', '.spinner', '.progress', '[role="status"]', 
      '[role="progressbar"]', '[aria-busy="true"]'
    ];
    
    feedbackSelectors.forEach(selector => {
      if (element.matches && element.matches(selector)) {
        this.uxMetrics.userFeedbackEvents++;
      }
      
      element.querySelectorAll && element.querySelectorAll(selector).forEach(() => {
        this.uxMetrics.userFeedbackEvents++;
      });
    });
  }

  /**
   * Set up periodic validation
   */
  setupPeriodicValidation() {
    // Run comprehensive UX validation every 30 seconds
    this.validationInterval = setInterval(() => {
      this.runPeriodicValidation();
    }, 30000);
  }

  /**
   * Run periodic UX validation
   */
  runPeriodicValidation() {
    const issues = [];
    
    // Check for stuck loading states from UX perspective
    this.activeValidations.forEach((validation, operation) => {
      const duration = performance.now() - validation.startTime;
      
      if (duration > this.config.timeoutWarningThreshold * 2) {
        issues.push({
          type: 'ux_stuck_loading',
          severity: 'critical',
          operation,
          message: `Loading state stuck from UX perspective for ${Math.round(duration)}ms`,
          recommendation: 'Force stop loading and show error message',
          uxImpact: 'Users likely think application is broken'
        });
      }
    });
    
    // Report periodic issues
    issues.forEach(issue => this.reportRealTimeIssue(issue.operation, issue));
  }

  /**
   * Add validation to loading history
   */
  addToLoadingHistory(validation) {
    this.loadingHistory.unshift(validation);
    
    // Limit history size
    if (this.loadingHistory.length > 100) {
      this.loadingHistory = this.loadingHistory.slice(0, 50);
    }
  }

  /**
   * Report validation issues
   */
  reportValidationIssues(validation) {
    if (validation.issues.length === 0) return;
    
    console.group(`[UserExperienceValidator] UX Issues for ${validation.operation}`);
    validation.issues.forEach(issue => {
      const logLevel = issue.severity === 'critical' ? 'error' : 
                     issue.severity === 'high' ? 'error' :
                     issue.severity === 'medium' ? 'warn' : 'log';
      
      console[logLevel](`${issue.type}: ${issue.message}`);
      console[logLevel](`Recommendation: ${issue.recommendation}`);
      console[logLevel](`UX Impact: ${issue.uxImpact}`);
    });
    console.groupEnd();
  }

  /**
   * Report validation results
   */
  reportValidationResults(validation) {
    const hasIssues = validation.issues.length > 0;
    const logLevel = hasIssues ? 'warn' : 'log';
    
    console[logLevel](`[UserExperienceValidator] ${validation.operation} completed`, {
      duration: Math.round(validation.duration),
      userTriggered: validation.userTriggered,
      hasUserFeedback: validation.hasUserFeedback,
      hasAccessibilitySupport: validation.hasAccessibilitySupport,
      issueCount: validation.issues.length,
      completedNormally: validation.completedNormally
    });
    
    if (hasIssues) {
      this.reportValidationIssues(validation);
    }
  }

  /**
   * Report real-time issue
   */
  reportRealTimeIssue(operation, issue) {
    console.warn(`[UserExperienceValidator] Real-time UX issue: ${issue.type}`, {
      operation,
      message: issue.message,
      recommendation: issue.recommendation,
      uxImpact: issue.uxImpact,
      severity: issue.severity
    });
  }

  /**
   * Get UX metrics summary
   */
  getUXMetrics() {
    const totalEvents = this.uxMetrics.totalLoadingEvents;
    
    return {
      ...this.uxMetrics,
      flashingRate: totalEvents > 0 ? this.uxMetrics.flashingEvents / totalEvents : 0,
      longLoadingRate: totalEvents > 0 ? this.uxMetrics.longLoadingEvents / totalEvents : 0,
      userFeedbackRate: totalEvents > 0 ? this.uxMetrics.userFeedbackEvents / totalEvents : 0,
      accessibilityViolationRate: totalEvents > 0 ? this.uxMetrics.accessibilityViolations / totalEvents : 0,
      averageLoadingDuration: this.calculateAverageLoadingDuration()
    };
  }

  /**
   * Calculate average loading duration
   */
  calculateAverageLoadingDuration() {
    const completedOperations = this.loadingHistory.filter(h => h.duration);
    if (completedOperations.length === 0) return 0;
    
    const totalDuration = completedOperations.reduce((sum, h) => sum + h.duration, 0);
    return Math.round(totalDuration / completedOperations.length);
  }

  /**
   * Generate UX report
   */
  generateUXReport() {
    return {
      timestamp: Date.now(),
      metrics: this.getUXMetrics(),
      activeValidations: this.activeValidations.size,
      recentIssues: this.loadingHistory
        .slice(0, 10)
        .filter(h => h.issues && h.issues.length > 0)
        .map(h => ({
          operation: h.operation,
          duration: h.duration,
          issues: h.issues.map(i => ({ type: i.type, severity: i.severity }))
        })),
      recommendations: this.generateUXRecommendations()
    };
  }

  /**
   * Generate UX recommendations
   */
  generateUXRecommendations() {
    const recommendations = [];
    const metrics = this.getUXMetrics();
    
    if (metrics.flashingRate > 0.1) {
      recommendations.push('Implement minimum display time for loading indicators to prevent flashing');
    }
    
    if (metrics.longLoadingRate > 0.2) {
      recommendations.push('Add progress feedback for long-running operations');
    }
    
    if (metrics.userFeedbackRate < 0.5) {
      recommendations.push('Improve user feedback for loading states');
    }
    
    if (metrics.accessibilityViolationRate > 0.1) {
      recommendations.push('Improve accessibility support for loading states');
    }
    
    if (metrics.rapidCyclingDetections > 0) {
      recommendations.push('Implement debouncing to prevent rapid loading cycles');
    }
    
    return recommendations;
  }

  /**
   * Cleanup validator resources
   */
  cleanup() {
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
    }
    
    if (this.ariaObserver) {
      this.ariaObserver.disconnect();
    }
    
    if (this.feedbackObserver) {
      this.feedbackObserver.disconnect();
    }
    
    // Clear all scheduled checks
    this.activeValidations.forEach((validation, operation) => {
      this.clearScheduledChecks(operation);
    });
    
    console.log('[UserExperienceValidator] Cleanup completed');
  }
}

export default UserExperienceValidator;