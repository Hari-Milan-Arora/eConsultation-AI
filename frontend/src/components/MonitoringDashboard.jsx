/**
 * Monitoring Dashboard Component
 * 
 * Production monitoring dashboard for system administrators
 * Shows real-time performance metrics, health status, and error logs
 */

import React, { useState, useEffect } from 'react';
import ApiService from '../services/apiService';
import monitoringService from '../services/monitoringService';

const MonitoringDashboard = () => {
  const [backendHealth, setBackendHealth] = useState(null);
  const [backendPerformance, setBackendPerformance] = useState(null);
  const [frontendStats, setFrontendStats] = useState(null);
  const [recentErrors, setRecentErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Refresh data
  const refreshData = async () => {
    try {
      setError(null);
      
      // Get backend health and performance
      const [healthData, performanceData] = await Promise.allSettled([
        ApiService.getComprehensiveHealth(),
        ApiService.getPerformanceStats()
      ]);

      if (healthData.status === 'fulfilled') {
        setBackendHealth(healthData.value);
      } else {
        console.warn('Failed to get backend health:', healthData.reason);
      }

      if (performanceData.status === 'fulfilled') {
        setBackendPerformance(performanceData.value);
      } else {
        console.warn('Failed to get backend performance:', performanceData.reason);
      }

      // Get frontend stats
      setFrontendStats(ApiService.getFrontendStats());
      setRecentErrors(ApiService.getRecentErrors(10));

    } catch (err) {
      setError(`Failed to refresh monitoring data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    refreshData();

    if (autoRefresh) {
      const interval = setInterval(refreshData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Status indicator component
  const StatusIndicator = ({ status, label }) => {
    const getStatusColor = (status) => {
      switch (status) {
        case 'healthy': return 'text-green-600 bg-green-100';
        case 'warning': return 'text-yellow-600 bg-yellow-100';
        case 'unhealthy': return 'text-red-600 bg-red-100';
        default: return 'text-gray-600 bg-gray-100';
      }
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
        {label || status}
      </span>
    );
  };

  // Performance metric component
  const PerformanceMetric = ({ label, value, unit, target, isGood }) => {
    const exceedsTarget = target && value > target;
    const colorClass = isGood 
      ? 'text-green-600' 
      : exceedsTarget 
        ? 'text-red-600' 
        : 'text-blue-600';

    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="text-sm text-gray-600">{label}</div>
        <div className={`text-2xl font-bold ${colorClass}`}>
          {typeof value === 'number' ? value.toFixed(1) : value}{unit}
        </div>
        {target && (
          <div className="text-xs text-gray-500">
            Target: {target}{unit} {exceedsTarget && '⚠️'}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">System Monitoring</h1>
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="mr-2"
            />
            Auto-refresh (30s)
          </label>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Backend Health</h2>
          {backendHealth ? (
            <div className="space-y-2">
              <StatusIndicator status={backendHealth.overall_status} />
              <div className="text-sm text-gray-600">
                Last checked: {new Date(backendHealth.timestamp).toLocaleTimeString()}
              </div>
              {backendHealth.unhealthy_components > 0 && (
                <div className="text-sm text-red-600">
                  {backendHealth.unhealthy_components} unhealthy components
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500">Unable to connect to backend</div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Frontend Performance</h2>
          {frontendStats ? (
            <div className="space-y-2">
              <div className="text-sm">
                API Calls: {frontendStats.apiCalls.total} 
                ({frontendStats.apiCalls.failed} failed)
              </div>
              <div className="text-sm">
                Avg Response: {frontendStats.apiCalls.averageResponseTime}ms
              </div>
              <div className="text-sm">
                Error Rate: {frontendStats.apiCalls.errorRate.toFixed(1)}%
              </div>
            </div>
          ) : (
            <div className="text-gray-500">No frontend data available</div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-2">
            <div className="text-sm">
              Total Errors: {recentErrors.length}
            </div>
            {recentErrors.length > 0 && (
              <div className="text-sm text-red-600">
                Latest: {recentErrors[0].context} - {recentErrors[0].message.substring(0, 50)}...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      {backendPerformance && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <PerformanceMetric
              label="Comment Processing"
              value={backendPerformance.endpoints?.submit_comment?.avg_response_time || 0}
              unit="ms"
              target={2000}
            />
            <PerformanceMetric
              label="Dashboard Loading"
              value={backendPerformance.endpoints?.get_dashboard_stats?.avg_response_time || 0}
              unit="ms"
              target={3000}
            />
            <PerformanceMetric
              label="Word Cloud Generation"
              value={backendPerformance.endpoints?.generate_wordcloud?.avg_response_time || 0}
              unit="ms"
              target={10000}
            />
            <PerformanceMetric
              label="Overall Error Rate"
              value={backendPerformance.overall?.overall_error_rate || 0}
              unit="%"
              isGood={true}
            />
          </div>
        </div>
      )}

      {/* Backend Health Details */}
      {backendHealth && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">System Health Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Database Health */}
            {backendHealth.checks?.database && (
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-semibold mb-2">Database</h3>
                <StatusIndicator status={backendHealth.checks.database.status} />
                <div className="mt-2 text-sm space-y-1">
                  <div>Response: {backendHealth.checks.database.response_time_ms}ms</div>
                  <div>Comments: {backendHealth.checks.database.comment_count}</div>
                  <div>Size: {backendHealth.checks.database.size_mb}MB</div>
                </div>
              </div>
            )}

            {/* AI Models Health */}
            {backendHealth.checks?.ai_models && (
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-semibold mb-2">AI Models</h3>
                <StatusIndicator status={backendHealth.checks.ai_models.status} />
                <div className="mt-2 text-sm space-y-1">
                  <div>Response: {backendHealth.checks.ai_models.response_time_ms}ms</div>
                  <div>Sentiment Cache: {backendHealth.checks.ai_models.models?.sentiment_analyzer?.cache_size || 0}</div>
                  <div>Summary Cache: {backendHealth.checks.ai_models.models?.summarizer?.cache_size || 0}</div>
                </div>
              </div>
            )}

            {/* System Resources */}
            {backendHealth.checks?.system && (
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-semibold mb-2">System Resources</h3>
                <StatusIndicator status={backendHealth.checks.system.status} />
                <div className="mt-2 text-sm space-y-1">
                  <div>Memory: {backendHealth.checks.system.memory?.used_percent}%</div>
                  <div>Disk: {backendHealth.checks.system.disk?.used_percent}%</div>
                  <div>CPU: {backendHealth.checks.system.cpu?.usage_percent}%</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Errors */}
      {recentErrors.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Recent Errors</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              {recentErrors.map((error, index) => (
                <div key={index} className="p-4 border-b border-gray-200 last:border-b-0">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-red-600">{error.context}</div>
                      <div className="text-sm text-gray-600 mt-1">{error.message}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(error.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                      {error.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Export Data */}
      <div className="text-center">
        <button
          onClick={() => {
            const data = ApiService.exportMonitoringData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `monitoring-data-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Export Monitoring Data
        </button>
      </div>
    </div>
  );
};

export default MonitoringDashboard;