/**
 * Dashboard Component
 * Shows comprehensive analytics and statistics
 */

import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  MessageSquare,
  Percent,
  Clock,
  FileText
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const Dashboard = ({ stats }) => {
  // Show loading state if no stats
  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl p-8 shadow-md">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Prepare data for charts
  const sentimentData = [
    { name: 'Positive', value: stats.positive_percentage, count: Math.round(stats.total_comments * stats.positive_percentage / 100), color: '#10B981' },
    { name: 'Neutral', value: stats.neutral_percentage, count: Math.round(stats.total_comments * stats.neutral_percentage / 100), color: '#6B7280' },
    { name: 'Negative', value: stats.negative_percentage, count: Math.round(stats.total_comments * stats.negative_percentage / 100), color: '#EF4444' }
  ];

  // Stakeholder analysis from recent comments
  const stakeholderData = stats.recent_comments?.reduce((acc, comment) => {
    const type = comment.stakeholder_type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {}) || {};

  const stakeholderChartData = Object.entries(stakeholderData).map(([type, count]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    value: count,
    percentage: stats.recent_comments?.length ? ((count / stats.recent_comments.length) * 100).toFixed(1) : '0'
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-8 text-white">
        <div className="flex items-center space-x-3 mb-4">
          <BarChart3 className="h-8 w-8" />
          <div>
            <h2 className="text-3xl font-bold">Analytics Dashboard</h2>
            <p className="text-lg opacity-90">Comprehensive comment analysis insights</p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Comments"
          value={stats.total_comments}
          icon={MessageSquare}
          color="blue"
          description="All analyzed comments"
        />
        <MetricCard
          title="Positive Sentiment"
          value={`${stats.positive_percentage.toFixed(1)}%`}
          icon={TrendingUp}
          color="green"
          description={`${Math.round(stats.total_comments * stats.positive_percentage / 100)} comments`}
        />
        <MetricCard
          title="Negative Sentiment"
          value={`${stats.negative_percentage.toFixed(1)}%`}
          icon={TrendingDown}
          color="red"
          description={`${Math.round(stats.total_comments * stats.negative_percentage / 100)} comments`}
        />
        <MetricCard
          title="Neutral Sentiment"
          value={`${stats.neutral_percentage.toFixed(1)}%`}
          icon={Percent}
          color="gray"
          description={`${Math.round(stats.total_comments * stats.neutral_percentage / 100)} comments`}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sentiment Distribution Pie Chart */}
        <div className="bg-white rounded-xl p-6 shadow-md">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Sentiment Distribution
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value.toFixed(1)}%`, 'Percentage']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="mt-4 grid grid-cols-3 gap-4">
            {sentimentData.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm text-gray-600">
                  {item.name}: {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Stakeholder Distribution Bar Chart */}
        <div className="bg-white rounded-xl p-6 shadow-md">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Stakeholder Distribution
          </h3>
          {stakeholderChartData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stakeholderChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [value, 'Comments']} />
                  <Bar dataKey="value" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No stakeholder data available</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Statistics */}
      <div className="bg-white rounded-xl p-6 shadow-md">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Detailed Statistics
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Sentiment Breakdown */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Sentiment Analysis</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="flex items-center text-green-700">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  Positive
                </span>
                <div className="text-right">
                  <div className="font-medium">{Math.round(stats.total_comments * stats.positive_percentage / 100)}</div>
                  <div className="text-sm text-gray-500">{stats.positive_percentage.toFixed(1)}%</div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center text-gray-700">
                  <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
                  Neutral
                </span>
                <div className="text-right">
                  <div className="font-medium">{Math.round(stats.total_comments * stats.neutral_percentage / 100)}</div>
                  <div className="text-sm text-gray-500">{stats.neutral_percentage.toFixed(1)}%</div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center text-red-700">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  Negative
                </span>
                <div className="text-right">
                  <div className="font-medium">{Math.round(stats.total_comments * stats.negative_percentage / 100)}</div>
                  <div className="text-sm text-gray-500">{stats.negative_percentage.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Overall Health Score */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Overall Sentiment Health</h4>
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">
                <span className={`${getSentimentHealthColor(stats)} `}>
                  {getSentimentHealthScore(stats)}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {getSentimentHealthDescription(stats)}
              </div>
              <div className="mt-3 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getSentimentHealthBarColor(stats)}`}
                  style={{ width: `${getSentimentHealthScore(stats)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Quick Insights */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Quick Insights</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                <span>
                  Most common sentiment: <strong>{getMostCommonSentiment(stats)}</strong>
                </span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                <span>
                  {stats.positive_percentage > stats.negative_percentage ? 'More positive' : 'More negative'} feedback overall
                </span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                <span>
                  {stakeholderChartData.length} different stakeholder types
                </span>
              </div>
              {stats.recent_comments && stats.recent_comments.length > 0 && (
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                  <span>
                    Latest comment from: <strong>{formatStakeholderType(stats.recent_comments[0].stakeholder_type)}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Comments Preview */}
      {stats.recent_comments && stats.recent_comments.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-md">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Recent Comments Preview
          </h3>
          <div className="space-y-4">
            {stats.recent_comments.slice(0, 3).map((comment) => (
              <div key={comment.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSentimentBadgeColor(comment.sentiment_label)}`}>
                      {comment.sentiment_label?.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatStakeholderType(comment.stakeholder_type)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatDate(comment.created_at)}
                  </span>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {comment.summary || comment.raw_text?.substring(0, 100) + '...'}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <span className="text-sm text-gray-500">
              Showing {Math.min(3, stats.recent_comments.length)} of {stats.recent_comments.length} recent comments
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Utility Components and Functions
const MetricCard = ({ title, value, icon: Icon, color, description }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    red: 'from-red-500 to-red-600',
    gray: 'from-gray-500 to-gray-600',
    purple: 'from-purple-500 to-purple-600',
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
        </div>
        <div className={`bg-gradient-to-r ${colorClasses[color]} p-3 rounded-lg ml-4`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
};

// Helper functions
const getSentimentHealthScore = (stats) => {
  // Calculate a health score based on positive vs negative ratio
  const positiveWeight = stats.positive_percentage * 1;
  const neutralWeight = stats.neutral_percentage * 0.5;
  const negativeWeight = stats.negative_percentage * 0;
  
  return Math.round(positiveWeight + neutralWeight + negativeWeight);
};

const getSentimentHealthColor = (stats) => {
  const score = getSentimentHealthScore(stats);
  if (score >= 70) return 'text-green-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-600';
};

const getSentimentHealthBarColor = (stats) => {
  const score = getSentimentHealthScore(stats);
  if (score >= 70) return 'bg-green-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
};

const getSentimentHealthDescription = (stats) => {
  const score = getSentimentHealthScore(stats);
  if (score >= 70) return 'Excellent sentiment health';
  if (score >= 50) return 'Good sentiment health';
  return 'Needs attention';
};

const getMostCommonSentiment = (stats) => {
  const sentiments = [
    { name: 'Positive', value: stats.positive_percentage },
    { name: 'Neutral', value: stats.neutral_percentage },
    { name: 'Negative', value: stats.negative_percentage }
  ];
  
  return sentiments.reduce((prev, current) => 
    prev.value > current.value ? prev : current
  ).name;
};

const getSentimentBadgeColor = (sentiment) => {
  switch (sentiment?.toLowerCase()) {
    case 'positive':
      return 'bg-green-100 text-green-800';
    case 'negative':
      return 'bg-red-100 text-red-800';
    case 'neutral':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const formatStakeholderType = (type) => {
  return type?.charAt(0).toUpperCase() + type?.slice(1).toLowerCase() || 'Unknown';
};

const formatDate = (dateString) => {
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
};

export default Dashboard;