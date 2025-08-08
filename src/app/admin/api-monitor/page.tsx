'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface ApiStats {
  supadata: {
    monthlyLimit: number;
    currentUsage: number;
    recentErrors: any[];
  };
  searchapi: {
    monthlyLimit: number;
    currentUsage: number;
    recentErrors: any[];
  };
  youtube: {
    dailyQuota: number;
    currentUsage: number;
    recentErrors: any[];
  };
  cache: {
    totalCached: number;
    totalHits: number;
    totalMisses: number;
    popularVideos: any[];
  };
}

export default function ApiMonitorPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<ApiStats | null>(null);
  const [percentages, setPercentages] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Add user check in production
    // if (!user) {
    //   router.push('/');
    //   return;
    // }

    fetchApiStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchApiStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchApiStats = async () => {
    try {
      // TODO: Add authentication in production
      const response = await fetch('/api/admin/api-usage');

      if (!response.ok) {
        throw new Error('Failed to fetch API stats');
      }

      const data = await response.json();
      setStats(data.stats);
      setPercentages(data.usagePercentages);
      setRecommendations(data.recommendations);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 100) return '🚨';
    if (percentage >= 80) return '⚠️';
    return '✅';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading API statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="text-lg">No API statistics available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Smart header spacing - same as homepage */}
      <div className="h-[60px] md:h-[80px]" />
      
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header with back button */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => router.push('/admin')}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
              aria-label="Back to admin dashboard"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-3xl font-bold">API Usage Monitor</h1>
          </div>

        {/* API Usage Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* SupaData Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">SupaData AI</h2>
              <span className="text-2xl">{getStatusIcon(percentages?.supadata || 0)}</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Usage:</span>
                <span className="font-medium">
                  {stats.supadata.currentUsage} / {stats.supadata.monthlyLimit}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full ${getUsageColor(percentages?.supadata || 0)}`}
                  style={{ width: `${Math.min(percentages?.supadata || 0, 100)}%` }}
                />
              </div>
              <div className="text-sm text-gray-600">
                {percentages?.supadata?.toFixed(1)}% of monthly limit
              </div>
              {stats.supadata.recentErrors.length > 0 && (
                <div className="text-sm text-red-600 mt-2">
                  Recent errors: {stats.supadata.recentErrors.length}
                </div>
              )}
            </div>
          </div>

          {/* SearchAPI Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">SearchAPI</h2>
              <span className="text-2xl">{getStatusIcon(percentages?.searchapi || 0)}</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Usage:</span>
                <span className="font-medium">
                  {stats.searchapi.currentUsage} / {stats.searchapi.monthlyLimit}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full ${getUsageColor(percentages?.searchapi || 0)}`}
                  style={{ width: `${Math.min(percentages?.searchapi || 0, 100)}%` }}
                />
              </div>
              <div className="text-sm text-gray-600">
                {percentages?.searchapi?.toFixed(1)}% of monthly limit
              </div>
            </div>
          </div>

          {/* Cache Stats Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Transcript Cache</h2>
              <span className="text-2xl">💾</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Cached:</span>
                <span className="font-medium">{stats.cache.totalCached}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Hits:</span>
                <span className="font-medium">{stats.cache.totalHits}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Hit Rate:</span>
                <span className="font-medium">
                  {percentages?.cacheHitRate?.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Recommendations</h2>
            <ul className="space-y-2">
              {recommendations.map((rec, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Popular Cached Videos */}
        {stats.cache.popularVideos.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Popular Cached Videos</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Access Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Language
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.cache.popularVideos.map((video) => (
                    <tr key={video.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {video.title || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {video.accessCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {video.language}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          video.method === 'supadata-ai' ? 'bg-purple-100 text-purple-800' :
                          video.method === 'searchapi' ? 'bg-blue-100 text-blue-800' :
                          video.method === 'youtube-oauth' ? 'bg-green-100 text-green-800' :
                          video.method === 'cache' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {video.method || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {video.url && (
                          <a 
                            href={`/tools/youtube-shadowing?url=${encodeURIComponent(video.url)}`}
                            className="text-blue-600 hover:text-blue-900"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Practice
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}