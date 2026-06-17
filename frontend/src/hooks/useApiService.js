/**
 * useApiService - React hook for API service integration
 * 
 * This hook integrates the centralized API service with the simple loading
 * state management system, providing a clean interface for components to
 * make API calls with automatic loading states and error handling.
 */

import { useCallback } from 'react';
import ApiService from '../services/apiService';
import useSimpleLoading from './useSimpleLoading';

const useApiService = () => {
  const { withLoading } = useSimpleLoading();

  /**
   * Submit a comment with loading state management
   * @param {Object} comment - Comment data
   * @param {Object} options - Options for loading and error handling
   * @returns {Promise} - Promise that resolves with comment analysis
   */
  const submitComment = useCallback(async (comment, options = {}) => {
    const { onSuccess, onError, operationName = 'submitComment' } = options;
    
    return withLoading(operationName, async () => {
      try {
        const result = await ApiService.submitComment(comment);
        if (onSuccess) {
          onSuccess(result);
        }
        return result;
      } catch (error) {
        if (onError) {
          onError(error);
        }
        throw error;
      }
    }, {
      timeout: 25000, // Allow extra time for AI processing
      onTimeout: () => {
        if (options.onTimeout) {
          options.onTimeout('Comment processing is taking longer than expected. The AI system might be busy.');
        }
      }
    });
  }, [withLoading]);

  /**
   * Fetch comments with loading state management
   * @param {Object} options - Options for loading and error handling
   * @returns {Promise} - Promise that resolves with comments array
   */
  const fetchComments = useCallback(async (options = {}) => {
    const { onSuccess, onError, operationName = 'fetchComments' } = options;
    
    return withLoading(operationName, async () => {
      try {
        const result = await ApiService.fetchComments();
        if (onSuccess) {
          onSuccess(result);
        }
        return result;
      } catch (error) {
        if (onError) {
          onError(error);
        }
        throw error;
      }
    });
  }, [withLoading]);

  /**
   * Fetch dashboard statistics with loading state management
   * @param {Object} options - Options for loading and error handling
   * @returns {Promise} - Promise that resolves with dashboard stats
   */
  const fetchDashboardStats = useCallback(async (options = {}) => {
    const { onSuccess, onError, operationName = 'fetchDashboardStats' } = options;
    
    return withLoading(operationName, async () => {
      try {
        const result = await ApiService.fetchDashboardStats();
        if (onSuccess) {
          onSuccess(result);
        }
        return result;
      } catch (error) {
        if (onError) {
          onError(error);
        }
        throw error;
      }
    }, {
      timeout: 20000, // Dashboard might need more time
      onTimeout: () => {
        if (options.onTimeout) {
          options.onTimeout('Dashboard loading is taking longer than expected. Please try again.');
        }
      }
    });
  }, [withLoading]);

  /**
   * Generate word cloud with loading state management
   * @param {string} sentiment - Optional sentiment filter
   * @param {Object} options - Options for loading and error handling
   * @returns {Promise} - Promise that resolves with blob URL
   */
  const generateWordcloud = useCallback(async (sentiment = null, options = {}) => {
    const operationName = sentiment ? `generateWordcloud_${sentiment}` : 'generateWordcloud_all';
    const { onSuccess, onError } = options;
    
    return withLoading(operationName, async () => {
      try {
        const blob = await ApiService.generateWordcloud(sentiment);
        const imageUrl = URL.createObjectURL(blob);
        
        if (onSuccess) {
          onSuccess(imageUrl, sentiment);
        }
        return imageUrl;
      } catch (error) {
        if (onError) {
          onError(error);
        }
        throw error;
      }
    }, {
      timeout: 30000, // Word cloud generation needs more time
      onTimeout: () => {
        if (options.onTimeout) {
          options.onTimeout('Word cloud generation is taking longer than expected. Please try again.');
        }
      }
    });
  }, [withLoading]);

  /**
   * Upload CSV file with loading state management
   * @param {File} file - CSV file to upload
   * @param {Object} options - Options for loading and error handling
   * @returns {Promise} - Promise that resolves with upload result
   */
  const uploadCSV = useCallback(async (file, options = {}) => {
    const { onSuccess, onError, operationName = 'uploadCSV' } = options;
    
    return withLoading(operationName, async () => {
      try {
        const result = await ApiService.uploadCSV(file);
        if (onSuccess) {
          onSuccess(result, file);
        }
        return result;
      } catch (error) {
        if (onError) {
          onError(error, file);
        }
        throw error;
      }
    }, {
      timeout: 60000, // CSV upload needs more time
      onTimeout: () => {
        if (options.onTimeout) {
          options.onTimeout('CSV processing is taking longer than expected. Large files may take more time.');
        }
      }
    });
  }, [withLoading]);

  /**
   * Check backend health with loading state management
   * @param {Object} options - Options for loading and error handling
   * @returns {Promise} - Promise that resolves with health status
   */
  const checkHealth = useCallback(async (options = {}) => {
    const { onSuccess, onError, operationName = 'checkHealth' } = options;
    
    return withLoading(operationName, async () => {
      try {
        const result = await ApiService.checkHealth();
        if (onSuccess) {
          onSuccess(result);
        }
        return result;
      } catch (error) {
        if (onError) {
          onError(error);
        }
        throw error;
      }
    });
  }, [withLoading]);

  /**
   * Get detailed health information with loading state management
   * @param {Object} options - Options for loading and error handling
   * @returns {Promise} - Promise that resolves with detailed health info
   */
  const getDetailedHealth = useCallback(async (options = {}) => {
    const { onSuccess, onError, operationName = 'getDetailedHealth' } = options;
    
    return withLoading(operationName, async () => {
      try {
        const result = await ApiService.getDetailedHealth();
        if (onSuccess) {
          onSuccess(result);
        }
        return result;
      } catch (error) {
        if (onError) {
          onError(error);
        }
        throw error;
      }
    });
  }, [withLoading]);

  return {
    submitComment,
    fetchComments,
    fetchDashboardStats,
    generateWordcloud,
    uploadCSV,
    checkHealth,
    getDetailedHealth
  };
};

export default useApiService;