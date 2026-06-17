/**
 * Pattern Monitor for Loading States
 * 
 * This module monitors loading state patterns and frequencies to detect
 * anomalies, performance issues, and user behavior patterns that could
 * indicate problems with the loading system.
 */

class PatternMonitor {
  constructor(loadingStateManager, config = {}) {
    this.manager = loadingStateManager;
    this.config = {
      // Pattern detection windows
      shortTermWindow: config.shortTermWindow || 60000, // 1 minute
      mediumTermWindow: config.mediumTermWindow || 300000, // 5 minutes
      longTermWindow: config.longTermWindow || 1800000, // 30 minutes
      
      // Frequency thresholds
      rapidCyclingThreshold: config.rapidCyclingThreshold || 5, // operations per minute
      highFrequencyThreshold: config.highFrequencyThreshold || 20, // operations per 5 minutes
      burstThreshold: config.burstThreshold || 10, // operations in 10 seconds
      
      // Pattern analysis
      enableTimePatternAnalysis: config.enableTimePatternAnalysis !== false,
      enableUserBehaviorAnalysis: config.enableUserBehaviorAnalysis !== false,
      enablePerformancePatternAnalysis: config.enablePerformancePatternAnalysis !== false,
      enableErrorPatternAnalysis: config.enableErrorPatternAnalysis !== false,
      
      // Anomaly detection
      anomalyDetectionSensitivity: config.anomalyDetectionSensitivity || 0.8,
      minimumDataPoints: config.minimumDataPoints || 10,
      
      ...config
    };
    
    // Pattern data storage
    this.patterns = {
      operationFrequency: new Map(), // operation -> timestamps[]
      timePatterns: new Map(), // hour -> operation counts
      userBehaviorPatterns: new Map(), // user action -> loading patterns
      performancePatterns: new Map(), // operation -> performance data
      errorPatterns: new Map(), // error type -> occurrences
      sessionPatterns: new Map(), // session data
      correlationPatterns: new Map() // operation correlations
    };
    
    // Analysis results
    this.analysisResults = {
      detectedAnomalies: [],
      performanceInsights: [],
      userBehaviorInsights: [],
      recommendations: []
    };
    
    // Monitoring state
    this.isMonitoring = false;
    this.sessionStartTime = Date.now();
    this.sessionId = this.generateSessionId();
    
    this.initialize();
  }

  /**
   * Initialize pattern monitoring
   */
  initialize() {
    this.setupLoadingStateHooks();
    this.startPatternAnalysis();
    this.setupPeriodicAnalysis();
    
    this.isMonitoring = true;
    console.log('[PatternMonitor] Initialized with pattern detection');
  }

  /**
   * Set up hooks into loading state manager
   */
  setupLoadingStateHooks() {
    // Hook into start loading
    const originalStartLoading = this.manager.startLoading.bind(this.manager);
    this.manager.startLoading = (operation, options = {}) => {
      const timestamp = Date.now();
      const result = originalStartLoading(operation, options);
      
      this.recordLoadingStart(operation, timestamp, options);
      return result;
    };
    
    // Hook into stop loading
    const originalStopLoading = this.manager.stopLoading.bind(this.manager);
    this.manager.stopLoading = (operation, options = {}) => {
      const timestamp = Date.now();
      const result = originalStopLoading(operation, options);
      
      this.recordLoadingEnd(operation, timestamp, options);
      return result;
    };
  }

  /**
   * Record loading start for pattern analysis
   */
  recordLoadingStart(operation, timestamp, options) {
    // Record operation frequency
    this.recordOperationFrequency(operation, timestamp);
    
    // Record time patterns
    if (this.config.enableTimePatternAnalysis) {
      this.recordTimePattern(operation, timestamp);
    }
    
    // Record user behavior patterns
    if (this.config.enableUserBehaviorAnalysis) {
      this.recordUserBehaviorPattern(operation, timestamp, options);
    }
    
    // Check for immediate pattern violations
    this.checkImmediatePatterns(operation, timestamp);
  }

  /**
   * Record loading end for pattern analysis
   */
  recordLoadingEnd(operation, timestamp, options) {
    const startData = this.findStartData(operation);
    if (!startData) return;
    
    const duration = timestamp - startData.timestamp;
    
    // Record performance patterns
    if (this.config.enablePerformancePatternAnalysis) {
      this.recordPerformancePattern(operation, duration, options);
    }
    
    // Record error patterns
    if (this.config.enableErrorPatternAnalysis && (options.isError || options.isTimeout)) {
      this.recordErrorPattern(operation, options, duration);
    }
    
    // Update correlation patterns
    this.updateCorrelationPatterns(operation, duration);
  }

  /**
   * Record operation frequency
   */
  recordOperationFrequency(operation, timestamp) {
    if (!this.patterns.operationFrequency.has(operation)) {
      this.patterns.operationFrequency.set(operation, []);
    }
    
    const timestamps = this.patterns.operationFrequency.get(operation);
    timestamps.push(timestamp);
    
    // Clean old timestamps
    this.cleanOldTimestamps(timestamps, timestamp, this.config.longTermWindow);
  }

  /**
   * Record time patterns
   */
  recordTimePattern(operation, timestamp) {
    const hour = new Date(timestamp).getHours();
    const dayOfWeek = new Date(timestamp).getDay();
    
    // Hourly patterns
    const hourKey = `hour_${hour}`;
    if (!this.patterns.timePatterns.has(hourKey)) {
      this.patterns.timePatterns.set(hourKey, new Map());
    }
    const hourData = this.patterns.timePatterns.get(hourKey);
    hourData.set(operation, (hourData.get(operation) || 0) + 1);
    
    // Daily patterns
    const dayKey = `day_${dayOfWeek}`;
    if (!this.patterns.timePatterns.has(dayKey)) {
      this.patterns.timePatterns.set(dayKey, new Map());
    }
    const dayData = this.patterns.timePatterns.get(dayKey);
    dayData.set(operation, (dayData.get(operation) || 0) + 1);
  }

  /**
   * Record user behavior patterns
   */
  recordUserBehaviorPattern(operation, timestamp, options) {
    const userAction = this.extractUserAction(options);
    const behaviorKey = `${userAction}_${operation}`;
    
    if (!this.patterns.userBehaviorPatterns.has(behaviorKey)) {
      this.patterns.userBehaviorPatterns.set(behaviorKey, {
        count: 0,
        timestamps: [],
        userActions: [],
        contexts: []
      });
    }
    
    const behaviorData = this.patterns.userBehaviorPatterns.get(behaviorKey);
    behaviorData.count++;
    behaviorData.timestamps.push(timestamp);
    behaviorData.userActions.push(userAction);
    behaviorData.contexts.push(this.extractContext(options));
    
    // Clean old data
    this.cleanOldBehaviorData(behaviorData, timestamp);
  }

  /**
   * Record performance patterns
   */
  recordPerformancePattern(operation, duration, options) {
    if (!this.patterns.performancePatterns.has(operation)) {
      this.patterns.performancePatterns.set(operation, {
        durations: [],
        averageDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        variance: 0,
        trendDirection: 'stable',
        performanceScore: 1.0
      });
    }
    
    const perfData = this.patterns.performancePatterns.get(operation);
    perfData.durations.push({
      duration,
      timestamp: Date.now(),
      isError: options.isError || false,
      isTimeout: options.isTimeout || false
    });
    
    // Limit data size
    if (perfData.durations.length > 100) {
      perfData.durations = perfData.durations.slice(-50);
    }
    
    // Update statistics
    this.updatePerformanceStatistics(perfData);
  }

  /**
   * Record error patterns
   */
  recordErrorPattern(operation, options, duration) {
    const errorType = options.isTimeout ? 'timeout' : 'error';
    const errorKey = `${operation}_${errorType}`;
    
    if (!this.patterns.errorPatterns.has(errorKey)) {
      this.patterns.errorPatterns.set(errorKey, {
        count: 0,
        timestamps: [],
        durations: [],
        contexts: []
      });
    }
    
    const errorData = this.patterns.errorPatterns.get(errorKey);
    errorData.count++;
    errorData.timestamps.push(Date.now());
    errorData.durations.push(duration);
    errorData.contexts.push(this.extractContext(options));
    
    // Clean old error data
    this.cleanOldErrorData(errorData);
  }

  /**
   * Update correlation patterns
   */
  updateCorrelationPatterns(operation, duration) {
    const activeOperations = Object.keys(this.manager.getActiveOperations());
    
    // Record which operations tend to run together
    activeOperations.forEach(activeOp => {
      if (activeOp !== operation) {
        const correlationKey = [operation, activeOp].sort().join('_');
        
        if (!this.patterns.correlationPatterns.has(correlationKey)) {
          this.patterns.correlationPatterns.set(correlationKey, {
            count: 0,
            averageConcurrentDuration: 0,
            contexts: []
          });
        }
        
        const corrData = this.patterns.correlationPatterns.get(correlationKey);
        corrData.count++;
        corrData.averageConcurrentDuration = 
          (corrData.averageConcurrentDuration * (corrData.count - 1) + duration) / corrData.count;
      }
    });
  }

  /**
   * Check for immediate pattern violations
   */
  checkImmediatePatterns(operation, timestamp) {
    const issues = [];
    
    // Check for rapid cycling
    const rapidCycling = this.detectRapidCycling(operation, timestamp);
    if (rapidCycling) {
      issues.push(rapidCycling);
    }
    
    // Check for burst patterns
    const burstPattern = this.detectBurstPattern(operation, timestamp);
    if (burstPattern) {
      issues.push(burstPattern);
    }
    
    // Check for unusual timing
    const timingAnomaly = this.detectTimingAnomaly(operation, timestamp);
    if (timingAnomaly) {
      issues.push(timingAnomaly);
    }
    
    // Report immediate issues
    issues.forEach(issue => this.reportPatternIssue(issue));
  }

  /**
   * Detect rapid cycling
   */
  detectRapidCycling(operation, timestamp) {
    const timestamps = this.patterns.operationFrequency.get(operation) || [];
    const recentTimestamps = timestamps.filter(ts => 
      timestamp - ts < this.config.shortTermWindow
    );
    
    const frequency = recentTimestamps.length / (this.config.shortTermWindow / 60000); // per minute
    
    if (frequency > this.config.rapidCyclingThreshold) {
      return {
        type: 'rapid_cycling',
        severity: 'high',
        operation,
        frequency: Math.round(frequency * 10) / 10,
        threshold: this.config.rapidCyclingThreshold,
        message: `Operation ${operation} cycling rapidly at ${frequency} times per minute`,
        recommendation: 'Implement debouncing or check for infinite loops'
      };
    }
    
    return null;
  }

  /**
   * Detect burst patterns
   */
  detectBurstPattern(operation, timestamp) {
    const timestamps = this.patterns.operationFrequency.get(operation) || [];
    const burstWindow = 10000; // 10 seconds
    const recentBurst = timestamps.filter(ts => timestamp - ts < burstWindow);
    
    if (recentBurst.length > this.config.burstThreshold) {
      return {
        type: 'burst_pattern',
        severity: 'medium',
        operation,
        burstSize: recentBurst.length,
        threshold: this.config.burstThreshold,
        message: `Operation ${operation} burst detected: ${recentBurst.length} operations in 10 seconds`,
        recommendation: 'Check for user interface issues causing multiple rapid triggers'
      };
    }
    
    return null;
  }

  /**
   * Detect timing anomalies
   */
  detectTimingAnomaly(operation, timestamp) {
    const hour = new Date(timestamp).getHours();
    const hourKey = `hour_${hour}`;
    
    if (!this.patterns.timePatterns.has(hourKey)) return null;
    
    const hourData = this.patterns.timePatterns.get(hourKey);
    const operationCount = hourData.get(operation) || 0;
    
    // Calculate average for this hour across all operations
    const totalOperations = Array.from(hourData.values()).reduce((sum, count) => sum + count, 0);
    const averagePerOperation = totalOperations / hourData.size;
    
    // Check if this operation is significantly above average
    if (operationCount > averagePerOperation * 3 && operationCount > 10) {
      return {
        type: 'timing_anomaly',
        severity: 'low',
        operation,
        hour,
        count: operationCount,
        average: Math.round(averagePerOperation),
        message: `Operation ${operation} unusually frequent at hour ${hour}: ${operationCount} vs average ${Math.round(averagePerOperation)}`,
        recommendation: 'Investigate why this operation is more frequent at this time'
      };
    }
    
    return null;
  }

  /**
   * Start pattern analysis
   */
  startPatternAnalysis() {
    // Analyze patterns every 2 minutes
    this.analysisInterval = setInterval(() => {
      this.runPatternAnalysis();
    }, 120000);
  }

  /**
   * Set up periodic analysis
   */
  setupPeriodicAnalysis() {
    // Comprehensive analysis every 10 minutes
    this.comprehensiveAnalysisInterval = setInterval(() => {
      this.runComprehensiveAnalysis();
    }, 600000);
  }

  /**
   * Run pattern analysis
   */
  runPatternAnalysis() {
    if (!this.isMonitoring) return;
    
    const results = {
      timestamp: Date.now(),
      anomalies: [],
      insights: [],
      recommendations: []
    };
    
    // Analyze frequency patterns
    results.anomalies.push(...this.analyzeFrequencyPatterns());
    
    // Analyze performance patterns
    results.insights.push(...this.analyzePerformancePatterns());
    
    // Analyze user behavior patterns
    results.insights.push(...this.analyzeUserBehaviorPatterns());
    
    // Generate recommendations
    results.recommendations.push(...this.generatePatternRecommendations(results));
    
    // Store results
    this.analysisResults = results;
    
    // Report significant findings
    this.reportAnalysisResults(results);
  }

  /**
   * Run comprehensive analysis
   */
  runComprehensiveAnalysis() {
    if (!this.isMonitoring) return;
    
    console.log('[PatternMonitor] Running comprehensive pattern analysis');
    
    const comprehensiveResults = {
      timestamp: Date.now(),
      sessionDuration: Date.now() - this.sessionStartTime,
      patternSummary: this.generatePatternSummary(),
      anomalyReport: this.generateAnomalyReport(),
      performanceInsights: this.generatePerformanceInsights(),
      userBehaviorInsights: this.generateUserBehaviorInsights(),
      recommendations: this.generateComprehensiveRecommendations()
    };
    
    console.log('[PatternMonitor] Comprehensive analysis completed', comprehensiveResults);
  }

  /**
   * Analyze frequency patterns
   */
  analyzeFrequencyPatterns() {
    const anomalies = [];
    const now = Date.now();
    
    this.patterns.operationFrequency.forEach((timestamps, operation) => {
      // Check medium-term frequency
      const mediumTermOps = timestamps.filter(ts => now - ts < this.config.mediumTermWindow);
      const mediumTermFrequency = mediumTermOps.length / (this.config.mediumTermWindow / 60000);
      
      if (mediumTermFrequency > this.config.highFrequencyThreshold / 5) { // per minute
        anomalies.push({
          type: 'high_frequency',
          severity: 'medium',
          operation,
          frequency: Math.round(mediumTermFrequency * 10) / 10,
          timeWindow: '5 minutes',
          message: `High frequency detected for ${operation}: ${Math.round(mediumTermFrequency * 10) / 10} per minute`,
          recommendation: 'Review if this frequency is expected or indicates an issue'
        });
      }
      
      // Check for frequency spikes
      const shortTermOps = timestamps.filter(ts => now - ts < this.config.shortTermWindow);
      const longTermOps = timestamps.filter(ts => now - ts < this.config.longTermWindow);
      
      if (shortTermOps.length > 0 && longTermOps.length > shortTermOps.length) {
        const shortTermRate = shortTermOps.length / (this.config.shortTermWindow / 60000);
        const longTermRate = longTermOps.length / (this.config.longTermWindow / 60000);
        
        if (shortTermRate > longTermRate * 3) {
          anomalies.push({
            type: 'frequency_spike',
            severity: 'high',
            operation,
            shortTermRate: Math.round(shortTermRate * 10) / 10,
            longTermRate: Math.round(longTermRate * 10) / 10,
            message: `Frequency spike detected for ${operation}: ${Math.round(shortTermRate * 10) / 10} vs ${Math.round(longTermRate * 10) / 10} per minute`,
            recommendation: 'Investigate cause of sudden frequency increase'
          });
        }
      }
    });
    
    return anomalies;
  }

  /**
   * Analyze performance patterns
   */
  analyzePerformancePatterns() {
    const insights = [];
    
    this.patterns.performancePatterns.forEach((perfData, operation) => {
      if (perfData.durations.length < this.config.minimumDataPoints) return;
      
      // Analyze performance trends
      const trend = this.calculatePerformanceTrend(perfData.durations);
      if (trend.direction !== 'stable') {
        insights.push({
          type: 'performance_trend',
          operation,
          trend: trend.direction,
          change: Math.round(trend.change),
          message: `Performance trend for ${operation}: ${trend.direction} (${trend.change}ms change)`,
          recommendation: trend.direction === 'degrading' ? 
            'Investigate performance degradation' : 
            'Performance improvement detected'
        });
      }
      
      // Analyze performance variance
      if (perfData.variance > 1000000) { // High variance threshold
        insights.push({
          type: 'performance_variance',
          operation,
          variance: Math.round(Math.sqrt(perfData.variance)),
          message: `High performance variance for ${operation}: ${Math.round(Math.sqrt(perfData.variance))}ms`,
          recommendation: 'Investigate causes of inconsistent performance'
        });
      }
    });
    
    return insights;
  }

  /**
   * Analyze user behavior patterns
   */
  analyzeUserBehaviorPatterns() {
    const insights = [];
    
    this.patterns.userBehaviorPatterns.forEach((behaviorData, behaviorKey) => {
      if (behaviorData.count < this.config.minimumDataPoints) return;
      
      // Analyze behavior frequency
      const avgTimeBetween = this.calculateAverageTimeBetween(behaviorData.timestamps);
      if (avgTimeBetween < 5000) { // Less than 5 seconds between actions
        insights.push({
          type: 'rapid_user_behavior',
          behaviorKey,
          avgTimeBetween: Math.round(avgTimeBetween),
          count: behaviorData.count,
          message: `Rapid user behavior detected: ${behaviorKey} every ${Math.round(avgTimeBetween)}ms`,
          recommendation: 'Consider if UI is causing unintended rapid interactions'
        });
      }
      
      // Analyze behavior clustering
      const clusters = this.detectBehaviorClusters(behaviorData.timestamps);
      if (clusters.length > 1) {
        insights.push({
          type: 'behavior_clustering',
          behaviorKey,
          clusterCount: clusters.length,
          message: `Behavior clustering detected for ${behaviorKey}: ${clusters.length} clusters`,
          recommendation: 'Analyze what triggers these behavior clusters'
        });
      }
    });
    
    return insights;
  }

  /**
   * Generate pattern recommendations
   */
  generatePatternRecommendations(results) {
    const recommendations = [];
    
    // Based on anomalies
    const highSeverityAnomalies = results.anomalies.filter(a => a.severity === 'high');
    if (highSeverityAnomalies.length > 0) {
      recommendations.push('Address high-severity pattern anomalies immediately');
    }
    
    // Based on frequency patterns
    const rapidCycling = results.anomalies.filter(a => a.type === 'rapid_cycling');
    if (rapidCycling.length > 0) {
      recommendations.push('Implement debouncing for rapidly cycling operations');
    }
    
    // Based on performance insights
    const degradingPerformance = results.insights.filter(i => 
      i.type === 'performance_trend' && i.trend === 'degrading'
    );
    if (degradingPerformance.length > 0) {
      recommendations.push('Investigate and address performance degradation');
    }
    
    return recommendations;
  }

  /**
   * Generate pattern summary
   */
  generatePatternSummary() {
    return {
      totalOperations: Array.from(this.patterns.operationFrequency.values())
        .reduce((sum, timestamps) => sum + timestamps.length, 0),
      uniqueOperations: this.patterns.operationFrequency.size,
      timePatterns: this.patterns.timePatterns.size,
      userBehaviorPatterns: this.patterns.userBehaviorPatterns.size,
      performancePatterns: this.patterns.performancePatterns.size,
      errorPatterns: this.patterns.errorPatterns.size,
      correlationPatterns: this.patterns.correlationPatterns.size
    };
  }

  /**
   * Generate anomaly report
   */
  generateAnomalyReport() {
    return {
      totalAnomalies: this.analysisResults.anomalies.length,
      criticalAnomalies: this.analysisResults.anomalies.filter(a => a.severity === 'critical').length,
      highAnomalies: this.analysisResults.anomalies.filter(a => a.severity === 'high').length,
      mediumAnomalies: this.analysisResults.anomalies.filter(a => a.severity === 'medium').length,
      lowAnomalies: this.analysisResults.anomalies.filter(a => a.severity === 'low').length,
      anomalyTypes: [...new Set(this.analysisResults.anomalies.map(a => a.type))]
    };
  }

  /**
   * Generate performance insights
   */
  generatePerformanceInsights() {
    const insights = [];
    
    this.patterns.performancePatterns.forEach((perfData, operation) => {
      insights.push({
        operation,
        averageDuration: Math.round(perfData.averageDuration),
        minDuration: perfData.minDuration,
        maxDuration: perfData.maxDuration,
        variance: Math.round(perfData.variance),
        trendDirection: perfData.trendDirection,
        performanceScore: Math.round(perfData.performanceScore * 100) / 100
      });
    });
    
    return insights;
  }

  /**
   * Generate user behavior insights
   */
  generateUserBehaviorInsights() {
    const insights = [];
    
    this.patterns.userBehaviorPatterns.forEach((behaviorData, behaviorKey) => {
      insights.push({
        behaviorKey,
        count: behaviorData.count,
        averageTimeBetween: this.calculateAverageTimeBetween(behaviorData.timestamps),
        mostCommonContext: this.findMostCommonContext(behaviorData.contexts)
      });
    });
    
    return insights;
  }

  /**
   * Generate comprehensive recommendations
   */
  generateComprehensiveRecommendations() {
    const recommendations = [];
    
    // Add specific recommendations based on patterns
    if (this.patterns.errorPatterns.size > 0) {
      recommendations.push('Review error patterns and implement better error handling');
    }
    
    if (this.patterns.correlationPatterns.size > 5) {
      recommendations.push('Consider optimizing frequently correlated operations');
    }
    
    const highVarianceOps = Array.from(this.patterns.performancePatterns.entries())
      .filter(([, data]) => data.variance > 1000000);
    
    if (highVarianceOps.length > 0) {
      recommendations.push('Address high performance variance in operations');
    }
    
    return recommendations;
  }

  /**
   * Helper methods
   */
  
  extractUserAction(options) {
    return options.userAction || 
           (options.triggerElement ? options.triggerElement.tagName : 'unknown') ||
           'automatic';
  }

  extractContext(options) {
    return {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 50) : '',
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.pathname : '',
      userTriggered: !!(options.userAction || options.triggerElement)
    };
  }

  findStartData(operation) {
    // This would need to be implemented based on how start data is stored
    return { timestamp: Date.now() - 1000 }; // Placeholder
  }

  cleanOldTimestamps(timestamps, currentTime, maxAge) {
    const cutoff = currentTime - maxAge;
    const index = timestamps.findIndex(ts => ts > cutoff);
    if (index > 0) {
      timestamps.splice(0, index);
    }
  }

  cleanOldBehaviorData(behaviorData, currentTime) {
    const cutoff = currentTime - this.config.longTermWindow;
    const validIndices = behaviorData.timestamps
      .map((ts, index) => ts > cutoff ? index : -1)
      .filter(index => index !== -1);
    
    if (validIndices.length < behaviorData.timestamps.length) {
      behaviorData.timestamps = validIndices.map(i => behaviorData.timestamps[i]);
      behaviorData.userActions = validIndices.map(i => behaviorData.userActions[i]);
      behaviorData.contexts = validIndices.map(i => behaviorData.contexts[i]);
      behaviorData.count = validIndices.length;
    }
  }

  cleanOldErrorData(errorData) {
    const cutoff = Date.now() - this.config.longTermWindow;
    const validIndices = errorData.timestamps
      .map((ts, index) => ts > cutoff ? index : -1)
      .filter(index => index !== -1);
    
    if (validIndices.length < errorData.timestamps.length) {
      errorData.timestamps = validIndices.map(i => errorData.timestamps[i]);
      errorData.durations = validIndices.map(i => errorData.durations[i]);
      errorData.contexts = validIndices.map(i => errorData.contexts[i]);
      errorData.count = validIndices.length;
    }
  }

  updatePerformanceStatistics(perfData) {
    const durations = perfData.durations.map(d => d.duration);
    
    perfData.averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    perfData.minDuration = Math.min(...durations);
    perfData.maxDuration = Math.max(...durations);
    
    // Calculate variance
    const mean = perfData.averageDuration;
    const squaredDiffs = durations.map(d => Math.pow(d - mean, 2));
    perfData.variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / durations.length;
    
    // Calculate trend
    perfData.trendDirection = this.calculatePerformanceTrend(perfData.durations).direction;
    
    // Calculate performance score (lower is better)
    perfData.performanceScore = Math.min(1.0, 5000 / perfData.averageDuration);
  }

  calculatePerformanceTrend(durations) {
    if (durations.length < 5) return { direction: 'stable', change: 0 };
    
    const recent = durations.slice(-5).map(d => d.duration);
    const older = durations.slice(-10, -5).map(d => d.duration);
    
    if (older.length === 0) return { direction: 'stable', change: 0 };
    
    const recentAvg = recent.reduce((sum, d) => sum + d, 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + d, 0) / older.length;
    
    const change = recentAvg - olderAvg;
    const changePercent = Math.abs(change) / olderAvg;
    
    if (changePercent < 0.1) return { direction: 'stable', change };
    return { 
      direction: change > 0 ? 'degrading' : 'improving', 
      change 
    };
  }

  calculateAverageTimeBetween(timestamps) {
    if (timestamps.length < 2) return 0;
    
    const intervals = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }
    
    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  }

  detectBehaviorClusters(timestamps) {
    // Simple clustering based on time gaps
    const clusters = [];
    let currentCluster = [timestamps[0]];
    const clusterThreshold = 60000; // 1 minute
    
    for (let i = 1; i < timestamps.length; i++) {
      if (timestamps[i] - timestamps[i - 1] < clusterThreshold) {
        currentCluster.push(timestamps[i]);
      } else {
        clusters.push(currentCluster);
        currentCluster = [timestamps[i]];
      }
    }
    
    if (currentCluster.length > 0) {
      clusters.push(currentCluster);
    }
    
    return clusters.filter(cluster => cluster.length > 1);
  }

  findMostCommonContext(contexts) {
    const contextCounts = {};
    
    contexts.forEach(context => {
      const key = context.url || 'unknown';
      contextCounts[key] = (contextCounts[key] || 0) + 1;
    });
    
    return Object.keys(contextCounts).reduce((a, b) => 
      contextCounts[a] > contextCounts[b] ? a : b
    );
  }

  reportPatternIssue(issue) {
    const logLevel = issue.severity === 'critical' ? 'error' : 
                    issue.severity === 'high' ? 'error' :
                    issue.severity === 'medium' ? 'warn' : 'log';
    
    console[logLevel](`[PatternMonitor] ${issue.type}: ${issue.message}`, {
      operation: issue.operation,
      severity: issue.severity,
      recommendation: issue.recommendation
    });
  }

  reportAnalysisResults(results) {
    if (results.anomalies.length > 0 || results.insights.length > 0) {
      console.log('[PatternMonitor] Pattern analysis results', {
        anomalies: results.anomalies.length,
        insights: results.insights.length,
        recommendations: results.recommendations.length
      });
      
      // Report high-severity issues
      const criticalIssues = results.anomalies.filter(a => 
        a.severity === 'critical' || a.severity === 'high'
      );
      
      if (criticalIssues.length > 0) {
        console.error('[PatternMonitor] Critical pattern issues detected:', criticalIssues);
      }
    }
  }

  generateSessionId() {
    return `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current pattern analysis results
   */
  getAnalysisResults() {
    return { ...this.analysisResults };
  }

  /**
   * Get pattern summary
   */
  getPatternSummary() {
    return this.generatePatternSummary();
  }

  /**
   * Export pattern data
   */
  exportPatternData() {
    return {
      sessionId: this.sessionId,
      sessionDuration: Date.now() - this.sessionStartTime,
      patterns: {
        operationFrequency: Object.fromEntries(this.patterns.operationFrequency),
        timePatterns: Object.fromEntries(this.patterns.timePatterns),
        userBehaviorPatterns: Object.fromEntries(this.patterns.userBehaviorPatterns),
        performancePatterns: Object.fromEntries(this.patterns.performancePatterns),
        errorPatterns: Object.fromEntries(this.patterns.errorPatterns),
        correlationPatterns: Object.fromEntries(this.patterns.correlationPatterns)
      },
      analysisResults: this.analysisResults,
      timestamp: Date.now()
    };
  }

  /**
   * Cleanup pattern monitor
   */
  cleanup() {
    this.isMonitoring = false;
    
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }
    
    if (this.comprehensiveAnalysisInterval) {
      clearInterval(this.comprehensiveAnalysisInterval);
    }
    
    // Clear pattern data
    this.patterns.operationFrequency.clear();
    this.patterns.timePatterns.clear();
    this.patterns.userBehaviorPatterns.clear();
    this.patterns.performancePatterns.clear();
    this.patterns.errorPatterns.clear();
    this.patterns.correlationPatterns.clear();
    
    console.log('[PatternMonitor] Cleanup completed');
  }
}

export default PatternMonitor;