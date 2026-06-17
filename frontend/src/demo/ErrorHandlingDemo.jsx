/**
 * Error Handling Demo
 * 
 * This component demonstrates the comprehensive error handling system:
 * - ErrorBoundary catching React errors
 * - ErrorRecovery showing user-friendly messages
 * - Timeout detection and cleanup
 * - Different error types and recovery actions
 */

import React, { useState } from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import ErrorRecovery from '../components/ErrorRecovery';
import useSimpleLoading from '../hooks/useSimpleLoading';

// Component that can throw different types of errors
const ErrorThrower = ({ errorType, shouldThrow }) => {
  if (shouldThrow) {
    switch (errorType) {
      case 'network':
        throw new Error('Failed to fetch data from server');
      case 'timeout':
        const timeoutError = new Error('Request timed out after 5000ms');
        timeoutError.name = 'AbortError';
        throw timeoutError;
      case 'chunk':
        const chunkError = new Error('Loading chunk 1 failed');
        chunkError.name = 'ChunkLoadError';
        throw chunkError;
      case 'validation':
        throw new Error('Validation failed: required field missing');
      default:
        throw new Error('Something went wrong unexpectedly');
    }
  }
  return <div className="p-4 bg-green-50 border border-green-200 rounded">✅ No errors - component working normally</div>;
};

const ErrorHandlingDemo = () => {
  const [errorType, setErrorType] = useState('network');
  const [shouldThrow, setShouldThrow] = useState(false);
  const [showErrorRecovery, setShowErrorRecovery] = useState(false);
  const [simulatedError, setSimulatedError] = useState(null);
  const { clearAllLoading } = useSimpleLoading();

  const errorTypes = [
    { value: 'network', label: 'Network Error' },
    { value: 'timeout', label: 'Timeout Error' },
    { value: 'chunk', label: 'Chunk Load Error' },
    { value: 'validation', label: 'Validation Error' },
    { value: 'generic', label: 'Generic Error' }
  ];

  const handleThrowError = () => {
    setShouldThrow(true);
    // Reset after a brief moment to allow error boundary to catch
    setTimeout(() => setShouldThrow(false), 100);
  };

  const handleShowErrorRecovery = () => {
    let error;
    switch (errorType) {
      case 'network':
        error = new Error('Failed to fetch data from server');
        break;
      case 'timeout':
        error = new Error('Request timed out after 5000ms');
        error.name = 'AbortError';
        break;
      case 'chunk':
        error = new Error('Loading chunk 1 failed');
        error.name = 'ChunkLoadError';
        break;
      case 'validation':
        error = new Error('Validation failed: required field missing');
        break;
      default:
        error = new Error('Something went wrong unexpectedly');
    }
    
    setSimulatedError(error);
    setShowErrorRecovery(true);
  };

  const handleErrorBoundaryError = (error, errorInfo) => {
    console.log('ErrorBoundary caught:', error, errorInfo);
    clearAllLoading('Error boundary cleanup');
  };

  const handleRetry = () => {
    console.log('Retry attempted');
    setShouldThrow(false);
  };

  const handleRecoveryRetry = () => {
    console.log('Recovery retry attempted');
    setShowErrorRecovery(false);
    setSimulatedError(null);
  };

  const handleGoHome = () => {
    console.log('Go home requested');
    setShouldThrow(false);
    setShowErrorRecovery(false);
    setSimulatedError(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Error Handling System Demo</h1>
        
        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Error Type Selection</h3>
            <select
              value={errorType}
              onChange={(e) => setErrorType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {errorTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Demo Actions</h3>
            <div className="space-y-2">
              <button
                onClick={handleThrowError}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
              >
                Trigger Error Boundary
              </button>
              <button
                onClick={handleShowErrorRecovery}
                className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition"
              >
                Show Error Recovery
              </button>
            </div>
          </div>
        </div>

        {/* Error Boundary Demo */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Error Boundary Demo</h3>
          <div className="border border-gray-200 rounded-lg p-4">
            <ErrorBoundary
              onError={handleErrorBoundaryError}
              onRetry={handleRetry}
              onGoHome={handleGoHome}
              title={`${errorType.charAt(0).toUpperCase() + errorType.slice(1)} Error Demo`}
            >
              <ErrorThrower errorType={errorType} shouldThrow={shouldThrow} />
            </ErrorBoundary>
          </div>
        </div>

        {/* Error Recovery Demo */}
        {showErrorRecovery && simulatedError && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Error Recovery Demo</h3>
            <ErrorRecovery
              error={simulatedError}
              operation="demo operation"
              context={{ retryCount: 0 }}
              onRetry={handleRecoveryRetry}
              onDismiss={() => setShowErrorRecovery(false)}
              onGoHome={handleGoHome}
              onRefresh={() => console.log('Refresh requested')}
              onReload={() => console.log('Reload requested')}
            />
          </div>
        )}

        {/* Features Overview */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Error Handling Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">Error Boundary:</h4>
              <ul className="space-y-1">
                <li>• Catches React component errors</li>
                <li>• Provides fallback UI</li>
                <li>• Automatic loading state cleanup</li>
                <li>• Retry functionality with limits</li>
                <li>• Technical details in development</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Error Recovery:</h4>
              <ul className="space-y-1">
                <li>• User-friendly error messages</li>
                <li>• Contextual recovery actions</li>
                <li>• Retry with exponential backoff</li>
                <li>• Error categorization</li>
                <li>• Helpful suggestions</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Timeout Detection:</h4>
              <ul className="space-y-1">
                <li>• Automatic timeout handling</li>
                <li>• Loading state cleanup</li>
                <li>• Stuck operation detection</li>
                <li>• Configurable timeouts</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Error Service:</h4>
              <ul className="space-y-1">
                <li>• Error categorization</li>
                <li>• Message transformation</li>
                <li>• Recovery suggestions</li>
                <li>• Error history tracking</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorHandlingDemo;