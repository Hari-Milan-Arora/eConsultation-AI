/**
 * LoadingStateExample - Example component demonstrating LoadingStateManager usage
 * 
 * This component shows how to properly integrate LoadingStateManager with React components
 * to ensure loading states only occur on explicit user actions.
 */

import React from 'react';
import { useLoadingState } from '../hooks/useLoadingState';
import { LoadingButton, LoadingDebugPanel } from './LoadingIndicator';

const LoadingStateExample = () => {
  const {
    startLoading,
    stopLoading,
    isLoading,
    withLoading,
    createLoadingHandler,
    getDebugInfo,
    loadingManager
  } = useLoadingState();

  // Example 1: Manual loading control
  const handleManualLoading = async (event) => {
    try {
      startLoading('manualOperation', {
        userAction: 'Manual loading button click',
        triggerElement: event.target
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Manual operation completed');
    } catch (error) {
      console.error('Manual operation failed:', error);
    } finally {
      stopLoading('manualOperation');
    }
  };

  // Example 2: Using withLoading helper
  const handleWithLoadingExample = async () => {
    try {
      const result = await withLoading(
        'withLoadingOperation',
        async () => {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1500));
          return 'Operation successful';
        },
        {
          userAction: 'withLoading button click'
        }
      );
      
      console.log('withLoading result:', result);
    } catch (error) {
      console.error('withLoading operation failed:', error);
    }
  };

  // Example 3: Using createLoadingHandler
  const handleAutoLoadingExample = createLoadingHandler(
    'autoHandlerOperation',
    async (event) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Auto handler operation completed');
    },
    {
      userAction: 'Auto handler button click'
    }
  );

  // Example 4: Simulating an API fetch
  const fetchDataExample = async (event) => {
    try {
      startLoading('fetchData', {
        userAction: 'Fetch data button click',
        triggerElement: event.target
      });

      // Simulate API call with potential error
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() > 0.7) {
            reject(new Error('Simulated API error'));
          } else {
            resolve('Data fetched successfully');
          }
        }, 2000);
      });

      console.log('Data fetch completed successfully');
    } catch (error) {
      console.error('Data fetch failed:', error);
    } finally {
      stopLoading('fetchData');
    }
  };

  // Example 5: Multiple concurrent operations
  const handleConcurrentOperations = async (event) => {
    const operations = ['operation1', 'operation2', 'operation3'];
    
    // Start all operations
    operations.forEach(op => {
      startLoading(op, {
        userAction: `Concurrent ${op} started`,
        triggerElement: event.target
      });
    });

    // Simulate different completion times
    const promises = operations.map((op, index) => 
      new Promise(resolve => {
        setTimeout(() => {
          stopLoading(op);
          console.log(`${op} completed`);
          resolve();
        }, (index + 1) * 1000);
      })
    );

    await Promise.all(promises);
    console.log('All concurrent operations completed');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">LoadingStateManager Examples</h2>
      
      <div className="space-y-6">
        {/* Example 1: Manual Loading Control */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">Manual Loading Control</h3>
          <p className="text-gray-600 mb-4">
            Manually start and stop loading states with explicit user action tracking.
          </p>
          <LoadingButton
            loading={isLoading('manualOperation')}
            loadingText="Processing..."
            onClick={handleManualLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Start Manual Loading
          </LoadingButton>
        </div>

        {/* Example 2: withLoading Helper */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">withLoading Helper</h3>
          <p className="text-gray-600 mb-4">
            Use the withLoading helper to automatically manage loading states around async operations.
          </p>
          <LoadingButton
            loading={isLoading('withLoadingOperation')}
            loadingText="Processing..."
            onClick={handleWithLoadingExample}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Use withLoading
          </LoadingButton>
        </div>

        {/* Example 3: createLoadingHandler */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">createLoadingHandler</h3>
          <p className="text-gray-600 mb-4">
            Create event handlers that automatically manage loading states.
          </p>
          <LoadingButton
            loading={isLoading('autoHandlerOperation')}
            loadingText="Processing..."
            onClick={handleAutoLoadingExample}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            Auto Handler
          </LoadingButton>
        </div>

        {/* Example 4: API Fetch Simulation */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">API Fetch Simulation</h3>
          <p className="text-gray-600 mb-4">
            Simulate an API call with potential errors and proper loading state management.
          </p>
          <LoadingButton
            loading={isLoading('fetchData')}
            loadingText="Fetching..."
            onClick={fetchDataExample}
            className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
          >
            Fetch Data
          </LoadingButton>
        </div>

        {/* Example 5: Concurrent Operations */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">Concurrent Operations</h3>
          <p className="text-gray-600 mb-4">
            Start multiple loading operations simultaneously and track them independently.
          </p>
          <LoadingButton
            loading={isLoading('operation1') || isLoading('operation2') || isLoading('operation3')}
            loadingText="Running Operations..."
            onClick={handleConcurrentOperations}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Start Concurrent Operations
          </LoadingButton>
          
          {/* Show individual operation status */}
          <div className="mt-3 space-y-1">
            {['operation1', 'operation2', 'operation3'].map(op => (
              <div key={op} className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  isLoading(op) ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'
                }`} />
                <span className="text-sm text-gray-600">{op}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Debug Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Debug Information</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <div>Active Operations: {getDebugInfo().operationCount}</div>
            <div>Debug Mode: {getDebugInfo().debugMode ? 'Enabled' : 'Disabled'}</div>
            <div>
              Recent Operations: 
              {getDebugInfo().history.slice(0, 3).map((op, index) => (
                <span key={index} className="ml-2 px-2 py-1 bg-gray-200 rounded text-xs">
                  {op.action}: {op.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Debug Panel (only shows in development with active operations) */}
      <LoadingDebugPanel loadingManager={loadingManager} />
    </div>
  );
};

export default LoadingStateExample;