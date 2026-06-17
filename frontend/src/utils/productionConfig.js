/**
 * Production Configuration for Loading State System
 * 
 * This module manages production-safe configuration and feature flags
 * for the loading state management system.
 */

class ProductionConfig {
  constructor() {
    this.environment = this.detectEnvironment();
    this.buildConfig = this.loadBuildConfig();
    this.runtimeConfig = this.loadRuntimeConfig();
    
    // Merge configurations with precedence: runtime > build > defaults
    this.config = {
      ...this.getDefaultConfig(),
      ...this.buildConfig,
      ...this.runtimeConfig
    };
    
    // Validate configuration
    this.validateConfig();
  }

  /**
   * Detect current environment
   */
  detectEnvironment() {
    // Check various environment indicators
    const nodeEnv = process.env.NODE_ENV;
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');
    const hasDevTools = typeof window !== 'undefined' && window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    
    return {
      nodeEnv,
      isProduction: nodeEnv === 'production',
      isDevelopment: nodeEnv === 'development',
      isTest: nodeEnv === 'test',
      isLocalhost,
      hasDevTools,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      timestamp: Date.now()
    };
  }

  /**
   * Load build-time configuration
   */
  loadBuildConfig() {
    return {
      // Build-time feature flags
      enableDebugLogging: process.env.REACT_APP_ENABLE_DEBUG_LOGGING === 'true',
      enablePerformanceMonitoring: process.env.REACT_APP_ENABLE_PERFORMANCE_MONITORING !== 'false',
      enableUserExperienceValidation: process.env.REACT_APP_ENABLE_UX_VALIDATION !== 'false',
      enablePatternMonitoring: process.env.REACT_APP_ENABLE_PATTERN_MONITORING !== 'false',
      
      // Analytics configuration
      analyticsEndpoint: process.env.REACT_APP_ANALYTICS_ENDPOINT || null,
      enableAnalytics: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
      
      // Performance thresholds
      slowOperationMs: parseInt(process.env.REACT_APP_SLOW_OPERATION_MS) || 5000,
      verySlowOperationMs: parseInt(process.env.REACT_APP_VERY_SLOW_OPERATION_MS) || 15000,
      stuckOperationMs: parseInt(process.env.REACT_APP_STUCK_OPERATION_MS) || 30000,
      
      // Debug settings
      maxDebugHistorySize: parseInt(process.env.REACT_APP_MAX_DEBUG_HISTORY) || 100,
      enableStackTraces: process.env.REACT_APP_ENABLE_STACK_TRACES !== 'false',
      
      // Version info
      buildVersion: process.env.REACT_APP_VERSION || '1.0.0',
      buildTimestamp: process.env.REACT_APP_BUILD_TIMESTAMP || Date.now()
    };
  }

  /**
   * Load runtime configuration (from localStorage, URL params, etc.)
   */
  loadRuntimeConfig() {
    const config = {};
    
    try {
      // Load from localStorage (development only)
      if (this.environment.isDevelopment && typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('loadingStateConfig');
        if (stored) {
          Object.assign(config, JSON.parse(stored));
        }
      }
      
      // Load from URL parameters (development only)
      if (this.environment.isDevelopment && typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        
        if (urlParams.has('debug')) {
          config.enableDebugLogging = urlParams.get('debug') === 'true';
        }
        
        if (urlParams.has('performance')) {
          config.enablePerformanceMonitoring = urlParams.get('performance') === 'true';
        }
        
        if (urlParams.has('verbose')) {
          config.verboseLogging = urlParams.get('verbose') === 'true';
        }
      }
    } catch (error) {
      console.warn('[ProductionConfig] Error loading runtime config:', error.message);
    }
    
    return config;
  }

  /**
   * Get default configuration
   */
  getDefaultConfig() {
    return {
      // Debug settings
      enableDebugLogging: this.environment.isDevelopment,
      verboseLogging: false,
      enableStackTraces: this.environment.isDevelopment,
      maxDebugHistorySize: this.environment.isProduction ? 50 : 200,
      
      // Monitoring settings
      enablePerformanceMonitoring: true,
      enableUserExperienceValidation: true,
      enablePatternMonitoring: true,
      
      // Performance thresholds
      slowOperationMs: 5000,
      verySlowOperationMs: 15000,
      stuckOperationMs: 30000,
      maxConcurrentOperations: 5,
      rapidCyclingThreshold: 3,
      
      // Analytics settings
      enableAnalytics: this.environment.isProduction,
      analyticsEndpoint: null,
      enableLocalStorage: this.environment.isDevelopment,
      
      // Production safeguards
      enableProductionLogging: false,
      sanitizeProductionData: this.environment.isProduction,
      enableErrorReporting: this.environment.isProduction,
      
      // Feature flags
      enableRealTimeMonitoring: true,
      enableAutomaticCleanup: true,
      enableVisibilityTracking: true,
      
      // Security settings
      allowRemoteConfig: false,
      enableCORS: false,
      maxPayloadSize: 1024 * 1024, // 1MB
      
      // Version info
      configVersion: '1.0.0',
      lastUpdated: Date.now()
    };
  }

  /**
   * Validate configuration
   */
  validateConfig() {
    const errors = [];
    
    // Validate performance thresholds
    if (this.config.slowOperationMs >= this.config.verySlowOperationMs) {
      errors.push('slowOperationMs must be less than verySlowOperationMs');
    }
    
    if (this.config.verySlowOperationMs >= this.config.stuckOperationMs) {
      errors.push('verySlowOperationMs must be less than stuckOperationMs');
    }
    
    // Validate numeric values
    const numericFields = [
      'slowOperationMs', 'verySlowOperationMs', 'stuckOperationMs',
      'maxConcurrentOperations', 'rapidCyclingThreshold', 'maxDebugHistorySize'
    ];
    
    numericFields.forEach(field => {
      if (typeof this.config[field] !== 'number' || this.config[field] < 0) {
        errors.push(`${field} must be a positive number`);
      }
    });
    
    // Validate analytics endpoint
    if (this.config.enableAnalytics && !this.config.analyticsEndpoint) {
      console.warn('[ProductionConfig] Analytics enabled but no endpoint configured');
    }
    
    if (errors.length > 0) {
      console.error('[ProductionConfig] Configuration validation errors:', errors);
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Get configuration value with fallback
   */
  get(key, fallback = null) {
    return this.config.hasOwnProperty(key) ? this.config[key] : fallback;
  }

  /**
   * Check if feature is enabled
   */
  isEnabled(feature) {
    return !!this.config[feature];
  }

  /**
   * Get performance thresholds
   */
  getPerformanceThresholds() {
    return {
      slowOperationMs: this.config.slowOperationMs,
      verySlowOperationMs: this.config.verySlowOperationMs,
      stuckOperationMs: this.config.stuckOperationMs,
      maxConcurrentOperations: this.config.maxConcurrentOperations,
      rapidCyclingThreshold: this.config.rapidCyclingThreshold
    };
  }

  /**
   * Get debug configuration
   */
  getDebugConfig() {
    return {
      enableDebugLogging: this.config.enableDebugLogging && !this.environment.isProduction,
      verboseLogging: this.config.verboseLogging && this.environment.isDevelopment,
      enableStackTraces: this.config.enableStackTraces && !this.environment.isProduction,
      maxDebugHistorySize: this.config.maxDebugHistorySize,
      enableProductionLogging: this.config.enableProductionLogging && this.environment.isProduction
    };
  }

  /**
   * Get analytics configuration
   */
  getAnalyticsConfig() {
    return {
      enableAnalytics: this.config.enableAnalytics,
      analyticsEndpoint: this.config.analyticsEndpoint,
      enableLocalStorage: this.config.enableLocalStorage && this.environment.isDevelopment,
      sanitizeData: this.config.sanitizeProductionData
    };
  }

  /**
   * Get monitoring configuration
   */
  getMonitoringConfig() {
    return {
      enablePerformanceMonitoring: this.config.enablePerformanceMonitoring,
      enableUserExperienceValidation: this.config.enableUserExperienceValidation,
      enablePatternMonitoring: this.config.enablePatternMonitoring,
      enableRealTimeMonitoring: this.config.enableRealTimeMonitoring,
      enableVisibilityTracking: this.config.enableVisibilityTracking
    };
  }

  /**
   * Update configuration at runtime (development only)
   */
  updateConfig(updates) {
    if (this.environment.isProduction) {
      console.warn('[ProductionConfig] Runtime config updates disabled in production');
      return false;
    }
    
    try {
      // Validate updates
      const testConfig = { ...this.config, ...updates };
      const originalConfig = this.config;
      this.config = testConfig;
      this.validateConfig();
      
      // Save to localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('loadingStateConfig', JSON.stringify(updates));
      }
      
      console.log('[ProductionConfig] Configuration updated:', updates);
      return true;
    } catch (error) {
      // Restore original config on validation error
      this.config = originalConfig;
      console.error('[ProductionConfig] Failed to update config:', error.message);
      return false;
    }
  }

  /**
   * Reset configuration to defaults
   */
  resetConfig() {
    if (this.environment.isProduction) {
      console.warn('[ProductionConfig] Config reset disabled in production');
      return false;
    }
    
    this.config = {
      ...this.getDefaultConfig(),
      ...this.buildConfig
    };
    
    // Clear localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('loadingStateConfig');
    }
    
    console.log('[ProductionConfig] Configuration reset to defaults');
    return true;
  }

  /**
   * Export current configuration
   */
  exportConfig() {
    return {
      environment: this.environment,
      config: { ...this.config },
      timestamp: Date.now()
    };
  }

  /**
   * Get configuration summary for debugging
   */
  getConfigSummary() {
    return {
      environment: this.environment.nodeEnv,
      isProduction: this.environment.isProduction,
      debugEnabled: this.config.enableDebugLogging,
      monitoringEnabled: {
        performance: this.config.enablePerformanceMonitoring,
        userExperience: this.config.enableUserExperienceValidation,
        patterns: this.config.enablePatternMonitoring
      },
      analyticsEnabled: this.config.enableAnalytics,
      thresholds: this.getPerformanceThresholds(),
      version: this.config.buildVersion
    };
  }

  /**
   * Create production-safe logger
   */
  createLogger(component = 'LoadingState') {
    const debugConfig = this.getDebugConfig();
    
    return {
      debug: (message, data = {}) => {
        if (debugConfig.enableDebugLogging) {
          console.log(`[${component}] ${message}`, data);
        }
      },
      
      info: (message, data = {}) => {
        if (debugConfig.enableDebugLogging || debugConfig.enableProductionLogging) {
          console.info(`[${component}] ${message}`, this.sanitizeForProduction(data));
        }
      },
      
      warn: (message, data = {}) => {
        console.warn(`[${component}] ${message}`, this.sanitizeForProduction(data));
      },
      
      error: (message, data = {}) => {
        console.error(`[${component}] ${message}`, this.sanitizeForProduction(data));
      },
      
      verbose: (message, data = {}) => {
        if (debugConfig.verboseLogging) {
          console.log(`[${component}] [VERBOSE] ${message}`, data);
        }
      }
    };
  }

  /**
   * Sanitize data for production logging
   */
  sanitizeForProduction(data) {
    if (!this.environment.isProduction || !this.config.sanitizeProductionData) {
      return data;
    }
    
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    const sanitized = {};
    const sensitiveFields = ['stackTrace', 'stack', 'error', 'userAgent', 'token', 'key', 'secret'];
    
    Object.keys(data).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof data[key] === 'object' && data[key] !== null) {
        sanitized[key] = this.sanitizeForProduction(data[key]);
      } else {
        sanitized[key] = data[key];
      }
    });
    
    return sanitized;
  }
}

// Create singleton instance
const productionConfig = new ProductionConfig();

export default productionConfig;
export { ProductionConfig };