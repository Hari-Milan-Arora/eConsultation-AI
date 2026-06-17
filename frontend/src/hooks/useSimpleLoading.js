/**
 * useSimpleLoading - Simple React hook for loading state management
 * 
 * This hook provides basic loading state functionality without the complexity
 * of the previous LoadingStateManager architecture. It focuses on:
 * - Simple start/stop/check functionality
 * - Independent loading states for different operations
 * - Automatic cleanup on component unmount
 * - Basic error handling and timeout management
 */

import { useState, useCallback, useRef, useEffect } from 'react';

const useSimpleLoading = () => {
  const [loading, setLoading] = useState({});
  const timeoutsRef = useRef(new Map());
  const mountedRef = useRef(true);
  const operationStartTimes = useRef(new Map());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      // Clear all timeouts
      timeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutsRef.current.clear();
      operationStartTimes.current.clear();
    };
  }, []);

  // Listen for global loading state cleanup events
  useEffect(() => {
    const handleClearAllLoading = (event) => {
      const reason = event.detail?.reason || 'Global cleanup';
      clearAllLoading(reason);
    };

    window.addEventListener('clearAllLoadingStates', handleClearAllLoading);
    
    return () => {
      window.removeEventListener('clearAllLoadingStates', handleClearAllLoading);
    };
  }, []);

  // Automatic cleanup for stuck loading states
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      if (!mountedRef.current) return;

      const now = Date.now();
      const stuckOperations = [];

      operationStartTimes.current.forEach((startTime, operation) => {
        const duration = now - startTime;
        // Consider operations stuck if they've been running for more than 2 minutes
        if (duration > 120000 && loading[operation]) {
          stuckOperations.push({ operation, duration });
        }
      });

      if (stuckOperations.length > 0) {
        console.warn('[useSimpleLoading] Detected stuck loading operations:', stuckOperations);
        
        stuckOperations.forEach(({ operation, duration }) => {
          console.warn(`[useSimpleLoading] Force clearing stuck operation: ${operation} (${Math.round(duration / 1000)}s)`);
          setLoading(prev => ({ ...prev, [operation]: false }));
          
          // Clear timeout and start time
          if (timeoutsRef.current.has(operation)) {
            clearTimeout(timeoutsRef.current.get(operation));
            timeoutsRef.current.delete(operation);
          }
          operationStartTimes.current.delete(operation);
        });
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(cleanupInterval);
  }, [loading]);

  /**
   * Start loading for a specific operation
   * @param {string} operation - Operation name
   * @param {Object} options - Options
   * @param {number} options.timeout - Timeout in milliseconds (default: 30000)
   * @param {Function} options.onTimeout - Callback when timeout occurs
   */
  const startLoading = useCallback((operation, options = {}) => {
    if (!operation || typeof operation !== 'string') {
      console.error('[useSimpleLoading] Invalid operation name:', operation);
      return;
    }

    if (!mountedRef.current) return;

    const { timeout = 30000, onTimeout } = options;

    setLoading(prev => ({ ...prev, [operation]: true }));
    
    // Record start time for timeout detection
    operationStartTimes.current.set(operation, Date.now());

    // Clear existing timeout for this operation
    if (timeoutsRef.current.has(operation)) {
      clearTimeout(timeoutsRef.current.get(operation));
    }

    // Set timeout protection
    if (timeout > 0) {
      const timeoutId = setTimeout(() => {
        if (!mountedRef.current) return;
        
        const duration = Date.now() - (operationStartTimes.current.get(operation) || 0);
        console.warn(`[useSimpleLoading] Operation "${operation}" timed out after ${timeout}ms (actual: ${duration}ms)`);
        
        setLoading(prev => ({ ...prev, [operation]: false }));
        timeoutsRef.current.delete(operation);
        operationStartTimes.current.delete(operation);
        
        if (onTimeout) {
          try {
            onTimeout(operation, duration);
          } catch (error) {
            console.error('[useSimpleLoading] Error in timeout callback:', error);
          }
        }
      }, timeout);

      timeoutsRef.current.set(operation, timeoutId);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[useSimpleLoading] Started loading: ${operation}`);
    }
  }, []);

  /**
   * Stop loading for a specific operation
   * @param {string} operation - Operation name
   */
  const stopLoading = useCallback((operation) => {
    if (!operation || typeof operation !== 'string') {
      console.error('[useSimpleLoading] Invalid operation name for stopLoading:', operation);
      return;
    }

    if (!mountedRef.current) return;

    const startTime = operationStartTimes.current.get(operation);
    const duration = startTime ? Date.now() - startTime : 0;

    setLoading(prev => ({ ...prev, [operation]: false }));

    // Clear timeout for this operation
    if (timeoutsRef.current.has(operation)) {
      clearTimeout(timeoutsRef.current.get(operation));
      timeoutsRef.current.delete(operation);
    }

    // Clear start time
    operationStartTimes.current.delete(operation);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[useSimpleLoading] Stopped loading: ${operation} (duration: ${duration}ms)`);
    }
  }, []);

  /**
   * Check if a specific operation is loading
   * @param {string} operation - Operation name
   * @returns {boolean} - True if loading
   */
  const isLoading = useCallback((operation) => {
    if (!operation) {
      // Return true if any operation is loading
      return Object.values(loading).some(Boolean);
    }
    return loading[operation] || false;
  }, [loading]);

  /**
   * Get all active loading operations
   * @returns {Array} - Array of operation names that are currently loading
   */
  const getActiveOperations = useCallback(() => {
    return Object.keys(loading).filter(operation => loading[operation]);
  }, [loading]);

  /**
   * Clear all loading states
   * @param {string} reason - Reason for clearing (for debugging)
   */
  const clearAllLoading = useCallback((reason = 'manual') => {
    if (!mountedRef.current) return;

    if (process.env.NODE_ENV === 'development') {
      const activeOps = Object.keys(loading).filter(op => loading[op]);
      if (activeOps.length > 0) {
        console.log(`[useSimpleLoading] Clearing all loading states (${reason}):`, activeOps);
      }
    }

    setLoading({});
    
    // Clear all timeouts
    timeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutsRef.current.clear();
    
    // Clear all start times
    operationStartTimes.current.clear();
  }, [loading]);

  /**
   * Helper function to wrap async operations with loading state
   * @param {string} operation - Operation name
   * @param {Function} asyncFunction - Async function to execute
   * @param {Object} options - Options (timeout, onTimeout, onError)
   * @returns {Promise} - Promise that resolves with the async function result
   */
  const withLoading = useCallback(async (operation, asyncFunction, options = {}) => {
    const { onError } = options;
    
    try {
      startLoading(operation, options);
      const result = await asyncFunction();
      return result;
    } catch (error) {
      if (onError) {
        try {
          onError(error, operation);
        } catch (callbackError) {
          console.error('[useSimpleLoading] Error in error callback:', callbackError);
        }
      }
      throw error;
    } finally {
      stopLoading(operation);
    }
  }, [startLoading, stopLoading]);

  /**
   * Helper function to create loading-aware event handlers
   * @param {string} operation - Operation name
   * @param {Function} handler - Event handler function
   * @param {Object} options - Options (timeout, onTimeout, onError)
   * @returns {Function} - Enhanced event handler
   */
  const createLoadingHandler = useCallback((operation, handler, options = {}) => {
    return async (event) => {
      const { onError } = options;
      
      try {
        startLoading(operation, {
          ...options,
          userAction: `${event?.type || 'unknown'} event`
        });
        await handler(event);
      } catch (error) {
        console.error(`[useSimpleLoading] Error in loading handler for ${operation}:`, error);
        
        if (onError) {
          try {
            onError(error, operation);
          } catch (callbackError) {
            console.error('[useSimpleLoading] Error in error callback:', callbackError);
          }
        }
        
        throw error;
      } finally {
        stopLoading(operation);
      }
    };
  }, [startLoading, stopLoading]);

  // Computed values for convenience
  const hasAnyLoading = isLoading();
  const activeOperationCount = getActiveOperations().length;

  return {
    // Core functions
    startLoading,
    stopLoading,
    isLoading,
    
    // Helper functions
    withLoading,
    createLoadingHandler,
    
    // Utility functions
    getActiveOperations,
    clearAllLoading,
    
    // Computed state
    hasAnyLoading,
    activeOperationCount,
    
    // Direct access to loading state (for advanced use cases)
    loadingState: loading
  };
};

export default useSimpleLoading;