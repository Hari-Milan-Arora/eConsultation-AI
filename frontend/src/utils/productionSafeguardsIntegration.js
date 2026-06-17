/**
 * Production Safeguards Integration
 * 
 * This module integrates all production safeguards components and provides
 * a unified interface for initializing and managing production-safe loading
 * state monitoring and validation.
 */

import ProductionSafeguards from './productionSafeguards.js';
import ProductionConfig from './productionConfig.js';
import UserExperienceValidator from './userExperienceValidator.js';
import PatternMonitor from './patternMonitor.js';

class ProductionSafeguardsIntegration {
  constructor(loadingStateManager, options = {}) {
    this.manager = loadingStateManager;
    this.config = ProductionConfig;
    this.isInitialized = false;
    
    // Configuration
    this.options = {
      enableProductionSafeguards: options.enableProductionSafeguards !== false,
      enableUserExperienceValidation: options.enableUserExperienceValidation !== false,
      enablePatternMonitoring: options.enablePatternMonitoring !== false,
      enableAnalytics: options.enableAnalytics !== false,
      ...options
    };
    
    // Component instances
    this.productionSafeguards = null;
    this.userExperienceValidator = null;
    this.patternMonitor = null;
    
    // Integrated metrics
    this.integratedMetrics = {
      sessionId: this.generateSessionId(),
      sessionStartTime: Date.now(),
      totalIssuesDetected: 0,
      criticalIssuesDetected: 0,
      performanceMetrics: {},
      userExperienceMetrics: {},
      patternAnalysisResults: {},
      overallHealthScore: 1.0
    };
    
    // Event handlers
    this.eventHandlers = new Map();
    
    this.initialize();
  }

  /**
   * Initialize all production safeguards
   */
  initialize() {
    try {
      const logger = this.config.createLogger('ProductionSafeguardsIntegration');
      
      logger.info('Initializing production safeguards integration', {
        environment: this.config.environment.nodeEnv,
        enabledFeatures: this.options
      });
      
      // Initialize core production safeguards
      if (this.options.enableProductionSafeguards) {
        this.initializeProductionSafeguards();
      }
      
      // Initialize user experience validation
      if (this.options.enableUserExperienceValidation) {
        this.initializeUserExperienceValidation();
      }
      
      // Initialize pattern monitoring
      if (this.options.enablePatternMonitoring) {
        this.initializePatternMonitoring();
      }
      
      // Set up integrated monitoring
      this.setupIntegratedMonitoring();
      
      // Set up event coordination
      this.setupEventCoordination();
      
      // Set up cleanup handlers
      this.setupCleanupHandlers();
      
      this.isInitialized = true;
      
      logger.info('Production safeguards integration initialized successfully', {
        sessionId: this.integratedMetrics.sessionId,
        componentsInitialized: {
          productionSafeguards: !!this.productionSafeguards,
          userExperienceValidator: !!this.userExperienceValidator,
          patternMonitor: !!this.patternMonitor
        }
      });
      
    } catch (error) {
      console.error('[ProductionSafeguardsIntegration] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize production safeguards
   */
  initializeProductionSafeguards() {
    const safeguardsConfig = {
      enablePerformanceMonitoring: this.config.isEnabled('enablePerformanceMonitoring'),
      enableUserExperienceValidation: this.config.isEnabled('enableUserExperienceValidation'),
      enablePatternMonitoring: this.config.isEnabled('enablePatternMonitoring'),
      performanceThresholds: this.config.getPerformanceThresholds(),
      reportingEndpoint: this.config.get('analyticsEndpoint'),
      enableLocalStorage: this.config.get('enableLocalStorage'),
      ...this.options
    };
    
    this.productionSafeguards = new ProductionSafeguards(this.manager, safeguardsConfig);
    
    // Set up event handlers
    this.setupProductionSafeguardsEvents();
  }

  /**
   * Initialize user experience validation
   */
  initializeUserExperienceValidation() {
    const uxConfig = {
      minLoadingDuration: this.config.get('minLoadingDuration', 100),
      maxAcceptableDelay: this.config.get('maxAcceptableDelay', 3000),
      flashingThreshold: this.config.get('flashingThreshold', 200),
      progressFeedbackThreshold: this.config.get('progressFeedbackThreshold', 5000),
      timeoutWarningThreshold: this.config.get('timeoutWarningThreshold', 15000),
      enableAriaUpdates: this.config.get('enableAriaUpdates', true),
      enableScreenReaderFeedback: this.config.get('enableScreenReaderFeedback', true),
      ...this.options
    };
    
    this.userExperienceValidator = new UserExperienceValidator(this.manager, uxConfig);
    
    // Set up event handlers
    this.setupUserExperienceValidationEvents();
  }

  /**
   * Initialize pattern monitoring
   */
  initializePatternMonitoring() {
    const patternConfig = {
      shortTermWindow: this.config.get('shortTermWindow', 60000),
      mediumTermWindow: this.config.get('mediumTermWindow', 300000),
      longTermWindow: this.config.get('longTermWindow', 1800000),
      rapidCyclingThreshold: this.config.get('rapidCyclingThreshold', 5),
      highFrequencyThreshold: this.config.get('highFrequencyThreshold', 20),
      burstThreshold: this.config.get('burstThreshold', 10),
      enableTimePatternAnalysis: this.config.get('enableTimePatternAnalysis', true),
      enableUserBehaviorAnalysis: this.config.get('enableUserBehaviorAnalysis', true),
      enablePerformancePatternAnalysis: this.config.get('enablePerformancePatternAnalysis', true),
      enableErrorPatternAnalysis: this.config.get('enableErrorPatternAnalysis', true),
      ...this.options
    };
    
    this.patternMonitor = new PatternMonitor(this.manager, patternConfig);
    
    // Set up event handlers
    this.setupPatternMonitoringEvents();
  }

  /**
   * Set up production safeguards events
   */
  setupProductionSafeguardsEvents() {
    // This would be implemented if ProductionSafeguards had event emitters
    // For now, we'll use periodic polling
  }

  /**
   * Set up user experience validation events
   */
  setupUserExperienceValidationEvents() {
    // This would be implemented if UserExperienceValidator had event emitters
    // For now, we'll use periodic polling
  }

  /**
   * Set up pattern monitoring events
   */
  setupPatternMonitoringEvents() {
    // This would be implemented if PatternMonitor had event emitters
    // For now, we'll use periodic polling
  }

  /**
   * Set up integrated monitoring
   */
  setupIntegratedMonitoring() {
    // Monitor and correlate data from all components every 30 seconds
    this.integratedMonitoringInterval = setInterval(() => {
      this.runIntegratedAnalysis();
    }, 30000);
    
    // Generate comprehensive reports every 5 minutes
    this.reportingInterval = setInterval(() => {
      this.generateIntegratedReport();
    }, 300000);
  }

  /**
   * Set up event coordination between components
   */
  setupEventCoordination() {
    // Coordinate events between different safeguard components
    // This allows for cross-component analysis and correlation
    
    this.eventCoordinationInterval = setInterval(() => {
      this.coordinateComponentEvents();
    }, 10000);
  }

  /**
   * Run integrated analysis
   */
  runIntegratedAnalysis() {
    try {
      const analysis = {
        timestamp: Date.now(),
        sessionDuration: Date.now() - this.integratedMetrics.sessionStartTime,
        componentStatus: this.getComponentStatus(),
        correlatedIssues: this.correlateIssuesAcrossComponents(),
        overallHealthScore: this.calculateOverallHealthScore(),
        recommendations: this.generateIntegratedRecommendations()
      };
      
      // Update integrated metrics
      this.updateIntegratedMetrics(analysis);
      
      // Report critical issues
      this.reportCriticalIssues(analysis);
      
    } catch (error) {
      console.error('[ProductionSafeguardsIntegration] Integrated analysis failed:', error);
    }
  }

  /**
   * Get status of all components
   */
  getComponentStatus() {
    const status = {
      productionSafeguards: null,
      userExperienceValidator: null,
      patternMonitor: null
    };
    
    if (this.productionSafeguards) {
      status.productionSafeguards = {
        isActive: true,
        metrics: this.productionSafeguards.getMetricsSummary(),
        issues: this.productionSafeguards.alertHistory.length
      };
    }
    
    if (this.userExperienceValidator) {
      status.userExperienceValidator = {
        isActive: true,
        metrics: this.userExperienceValidator.getUXMetrics(),
        activeValidations: this.userExperienceValidator.activeValidations.size
      };
    }
    
    if (this.patternMonitor) {
      status.patternMonitor = {
        isActive: this.patternMonitor.isMonitoring,
        summary: this.patternMonitor.getPatternSummary(),
        analysisResults: this.patternMonitor.getAnalysisResults()
      };
    }
    
    return status;
  }

  /**
   * Correlate issues across components
   */
  correlateIssuesAcrossComponents() {
    const correlatedIssues = [];
    
    // Get issues from all components
    const productionIssues = this.productionSafeguards ? 
      this.productionSafeguards.alertHistory.slice(-10) : [];
    
    const uxIssues = this.userExperienceValidator ? 
      this.userExperienceValidator.loadingHistory
        .filter(h => h.issues && h.issues.length > 0)
        .slice(-10) : [];
    
    const patternIssues = this.patternMonitor ? 
      this.patternMonitor.analysisResults.anomalies || [] : [];
    
    // Look for correlations
    const timeWindow = 60000; // 1 minute correlation window
    const now = Date.now();
    
    // Correlate production issues with UX issues
    productionIssues.forEach(prodIssue => {
      const relatedUXIssues = uxIssues.filter(uxIssue => 
        Math.abs(prodIssue.timestamp - uxIssue.startTime) < timeWindow
      );
      
      if (relatedUXIssues.length > 0) {
        correlatedIssues.push({
          type: 'production_ux_correlation',
          productionIssue: prodIssue,
          uxIssues: relatedUXIssues,
          correlation: 'Performance issue correlates with UX problems',
          severity: 'high',
          recommendation: 'Address both performance and UX aspects together'
        });
      }
    });
    
    // Correlate pattern issues with performance issues
    patternIssues.forEach(patternIssue => {
      const relatedProdIssues = productionIssues.filter(prodIssue =>
        prodIssue.details && prodIssue.details.operation === patternIssue.operation &&
        Math.abs(prodIssue.timestamp - patternIssue.timestamp) < timeWindow
      );
      
      if (relatedProdIssues.length > 0) {
        correlatedIssues.push({
          type: 'pattern_performance_correlation',
          patternIssue: patternIssue,
          productionIssues: relatedProdIssues,
          correlation: 'Pattern anomaly correlates with performance issues',
          severity: 'medium',
          recommendation: 'Investigate root cause affecting both pattern and performance'
        });
      }
    });
    
    return correlatedIssues;
  }

  /**
   * Calculate overall health score
   */
  calculateOverallHealthScore() {
    let healthScore = 1.0;
    let factors = 0;
    
    // Factor in production safeguards health
    if (this.productionSafeguards) {
      const metrics = this.productionSafeguards.getMetricsSummary();
      const criticalIssues = this.productionSafeguards.alertHistory
        .filter(issue => issue.severity === 'critical').length;
      
      const productionHealth = Math.max(0, 1.0 - (criticalIssues * 0.2));
      healthScore = (healthScore * factors + productionHealth) / (factors + 1);
      factors++;
    }
    
    // Factor in UX health
    if (this.userExperienceValidator) {
      const uxMetrics = this.userExperienceValidator.getUXMetrics();
      const uxHealth = Math.max(0, 1.0 - 
        (uxMetrics.flashingRate * 0.3) - 
        (uxMetrics.longLoadingRate * 0.2) - 
        (uxMetrics.accessibilityViolationRate * 0.4)
      );
      
      healthScore = (healthScore * factors + uxHealth) / (factors + 1);
      factors++;
    }
    
    // Factor in pattern health
    if (this.patternMonitor) {
      const analysisResults = this.patternMonitor.getAnalysisResults();
      const criticalAnomalies = analysisResults.anomalies ? 
        analysisResults.anomalies.filter(a => a.severity === 'critical').length : 0;
      
      const patternHealth = Math.max(0, 1.0 - (criticalAnomalies * 0.15));
      healthScore = (healthScore * factors + patternHealth) / (factors + 1);
      factors++;
    }
    
    return Math.round(healthScore * 100) / 100;
  }

  /**
   * Generate integrated recommendations
   */
  generateIntegratedRecommendations() {
    const recommendations = [];
    
    // Get recommendations from all components
    if (this.productionSafeguards) {
      // Production safeguards don't have a direct recommendation method
      // but we can infer from alert history
      const recentCriticalIssues = this.productionSafeguards.alertHistory
        .filter(issue => issue.severity === 'critical' && 
                Date.now() - issue.timestamp < 300000); // Last 5 minutes
      
      if (recentCriticalIssues.length > 0) {
        recommendations.push('Address critical production issues immediately');
      }
    }
    
    if (this.userExperienceValidator) {
      const uxRecommendations = this.userExperienceValidator.generateUXRecommendations();
      recommendations.push(...uxRecommendations);
    }
    
    if (this.patternMonitor) {
      const analysisResults = this.patternMonitor.getAnalysisResults();
      if (analysisResults.recommendations) {
        recommendations.push(...analysisResults.recommendations);
      }
    }
    
    // Add integrated recommendations
    const overallHealth = this.calculateOverallHealthScore();
    if (overallHealth < 0.7) {
      recommendations.push('Overall system health is degraded - comprehensive review needed');
    }
    
    // Remove duplicates and limit to top 10
    return [...new Set(recommendations)].slice(0, 10);
  }

  /**
   * Update integrated metrics
   */
  updateIntegratedMetrics(analysis) {
    this.integratedMetrics.overallHealthScore = analysis.overallHealthScore;
    this.integratedMetrics.lastAnalysisTimestamp = analysis.timestamp;
    
    // Count total issues
    let totalIssues = 0;
    let criticalIssues = 0;
    
    if (this.productionSafeguards) {
      totalIssues += this.productionSafeguards.alertHistory.length;
      criticalIssues += this.productionSafeguards.alertHistory
        .filter(issue => issue.severity === 'critical').length;
    }
    
    if (this.userExperienceValidator) {
      const uxIssues = this.userExperienceValidator.loadingHistory
        .filter(h => h.issues && h.issues.length > 0);
      totalIssues += uxIssues.length;
      criticalIssues += uxIssues.filter(h => 
        h.issues.some(issue => issue.severity === 'critical')
      ).length;
    }
    
    if (this.patternMonitor) {
      const analysisResults = this.patternMonitor.getAnalysisResults();
      if (analysisResults.anomalies) {
        totalIssues += analysisResults.anomalies.length;
        criticalIssues += analysisResults.anomalies
          .filter(a => a.severity === 'critical').length;
      }
    }
    
    this.integratedMetrics.totalIssuesDetected = totalIssues;
    this.integratedMetrics.criticalIssuesDetected = criticalIssues;
  }

  /**
   * Report critical issues
   */
  reportCriticalIssues(analysis) {
    const criticalIssues = analysis.correlatedIssues.filter(issue => 
      issue.severity === 'critical'
    );
    
    if (criticalIssues.length > 0) {
      console.error('[ProductionSafeguardsIntegration] Critical correlated issues detected:', {
        count: criticalIssues.length,
        issues: criticalIssues,
        overallHealthScore: analysis.overallHealthScore,
        recommendations: analysis.recommendations
      });
    }
    
    // Report if overall health is critically low
    if (analysis.overallHealthScore < 0.5) {
      console.error('[ProductionSafeguardsIntegration] System health critically low:', {
        healthScore: analysis.overallHealthScore,
        sessionDuration: analysis.sessionDuration,
        recommendations: analysis.recommendations
      });
    }
  }

  /**
   * Coordinate events between components
   */
  coordinateComponentEvents() {
    // This method coordinates events and data sharing between components
    // For example, if pattern monitor detects rapid cycling, we can
    // inform UX validator to be more sensitive to flashing issues
    
    try {
      if (this.patternMonitor && this.userExperienceValidator) {
        const analysisResults = this.patternMonitor.getAnalysisResults();
        const rapidCyclingIssues = analysisResults.anomalies ? 
          analysisResults.anomalies.filter(a => a.type === 'rapid_cycling') : [];
        
        if (rapidCyclingIssues.length > 0) {
          // Notify UX validator about rapid cycling
          // This could adjust UX validation thresholds
          console.log('[ProductionSafeguardsIntegration] Coordinating rapid cycling detection with UX validation');
        }
      }
      
      if (this.productionSafeguards && this.patternMonitor) {
        const metrics = this.productionSafeguards.getMetricsSummary();
        if (metrics.issues.critical > 0) {
          // Notify pattern monitor about critical performance issues
          // This could adjust pattern detection sensitivity
          console.log('[ProductionSafeguardsIntegration] Coordinating critical performance issues with pattern monitoring');
        }
      }
      
    } catch (error) {
      console.error('[ProductionSafeguardsIntegration] Event coordination failed:', error);
    }
  }

  /**
   * Generate integrated report
   */
  generateIntegratedReport() {
    try {
      const report = {
        timestamp: Date.now(),
        sessionId: this.integratedMetrics.sessionId,
        sessionDuration: Date.now() - this.integratedMetrics.sessionStartTime,
        
        // Overall metrics
        overallHealthScore: this.integratedMetrics.overallHealthScore,
        totalIssuesDetected: this.integratedMetrics.totalIssuesDetected,
        criticalIssuesDetected: this.integratedMetrics.criticalIssuesDetected,
        
        // Component status
        componentStatus: this.getComponentStatus(),
        
        // Correlated analysis
        correlatedIssues: this.correlateIssuesAcrossComponents(),
        
        // Integrated recommendations
        recommendations: this.generateIntegratedRecommendations(),
        
        // Environment info
        environment: {
          nodeEnv: this.config.environment.nodeEnv,
          isProduction: this.config.environment.isProduction,
          userAgent: this.config.environment.userAgent.substring(0, 100)
        }
      };
      
      // Log report summary
      console.log('[ProductionSafeguardsIntegration] Integrated report generated:', {
        healthScore: report.overallHealthScore,
        totalIssues: report.totalIssuesDetected,
        criticalIssues: report.criticalIssuesDetected,
        recommendationCount: report.recommendations.length
      });
      
      // Send to analytics if configured
      if (this.options.enableAnalytics && this.config.get('analyticsEndpoint')) {
        this.sendReportToAnalytics(report);
      }
      
      return report;
      
    } catch (error) {
      console.error('[ProductionSafeguardsIntegration] Report generation failed:', error);
      return null;
    }
  }

  /**
   * Send report to analytics
   */
  async sendReportToAnalytics(report) {
    try {
      const endpoint = this.config.get('analyticsEndpoint');
      if (!endpoint) return;
      
      const sanitizedReport = this.config.sanitizeForProduction(report);
      
      if (navigator.sendBeacon) {
        const success = navigator.sendBeacon(
          endpoint,
          JSON.stringify({
            type: 'integrated_safeguards_report',
            ...sanitizedReport
          })
        );
        
        if (!success) {
          throw new Error('sendBeacon failed');
        }
      } else {
        await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'integrated_safeguards_report',
            ...sanitizedReport
          }),
          keepalive: true
        });
      }
      
    } catch (error) {
      console.error('[ProductionSafeguardsIntegration] Failed to send report to analytics:', error);
    }
  }

  /**
   * Set up cleanup handlers
   */
  setupCleanupHandlers() {
    if (typeof window !== 'undefined') {
      const cleanup = () => {
        this.generateFinalReport();
        this.cleanup();
      };
      
      window.addEventListener('beforeunload', cleanup);
      window.addEventListener('pagehide', cleanup);
    }
  }

  /**
   * Generate final report before cleanup
   */
  generateFinalReport() {
    const finalReport = this.generateIntegratedReport();
    if (finalReport) {
      finalReport.type = 'final_session_report';
      console.log('[ProductionSafeguardsIntegration] Final session report:', finalReport);
      
      // Send final report to analytics
      if (this.options.enableAnalytics) {
        this.sendReportToAnalytics(finalReport);
      }
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      sessionId: this.integratedMetrics.sessionId,
      sessionDuration: Date.now() - this.integratedMetrics.sessionStartTime,
      overallHealthScore: this.integratedMetrics.overallHealthScore,
      totalIssuesDetected: this.integratedMetrics.totalIssuesDetected,
      criticalIssuesDetected: this.integratedMetrics.criticalIssuesDetected,
      componentsActive: {
        productionSafeguards: !!this.productionSafeguards,
        userExperienceValidator: !!this.userExperienceValidator,
        patternMonitor: !!this.patternMonitor
      }
    };
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return `psi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup all components
   */
  cleanup() {
    console.log('[ProductionSafeguardsIntegration] Starting cleanup');
    
    // Clear intervals
    if (this.integratedMonitoringInterval) {
      clearInterval(this.integratedMonitoringInterval);
    }
    
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }
    
    if (this.eventCoordinationInterval) {
      clearInterval(this.eventCoordinationInterval);
    }
    
    // Cleanup components
    if (this.productionSafeguards) {
      this.productionSafeguards.cleanup();
    }
    
    if (this.userExperienceValidator) {
      this.userExperienceValidator.cleanup();
    }
    
    if (this.patternMonitor) {
      this.patternMonitor.cleanup();
    }
    
    // Clear references
    this.productionSafeguards = null;
    this.userExperienceValidator = null;
    this.patternMonitor = null;
    
    this.isInitialized = false;
    
    console.log('[ProductionSafeguardsIntegration] Cleanup completed');
  }
}

// Export both the class and a factory function
export { ProductionSafeguardsIntegration };

/**
 * Factory function to create and initialize production safeguards
 * @param {Object} loadingStateManager - LoadingStateManager instance
 * @param {Object} options - Configuration options
 * @returns {ProductionSafeguardsIntegration} - Initialized integration instance
 */
export const createProductionSafeguards = (loadingStateManager, options = {}) => {
  return new ProductionSafeguardsIntegration(loadingStateManager, options);
};

export default ProductionSafeguardsIntegration;