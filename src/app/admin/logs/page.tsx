'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAdminLogs } from '@/hooks/useAdminLogs';
import { AdminLogAction } from '@/types/admin';
import { useStrings } from '@/hooks/useLanguage';
import { formatLogAction, getActionSeverity } from '@/utils/adminLogs';

const ACTIONS_PER_PAGE = 20;

export default function AdminLogsPage() {
  const strings = useStrings();
  const [selectedAction, setSelectedAction] = useState<AdminLogAction | 'all'>('all');
  const [searchUserId, setSearchUserId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const {
    logs,
    loading,
    error,
    refreshLogs,
    totalActions,
    actionsByType
  } = useAdminLogs({
    action: selectedAction === 'all' ? undefined : selectedAction,
    targetUserId: searchUserId.trim() || undefined,
    limitCount: 100,
  });

  // Pagination
  const totalPages = Math.ceil(logs.length / ACTIONS_PER_PAGE);
  const startIndex = (currentPage - 1) * ACTIONS_PER_PAGE;
  const endIndex = startIndex + ACTIONS_PER_PAGE;
  const currentLogs = logs.slice(startIndex, endIndex);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  const getActionIcon = (action: AdminLogAction) => {
    switch (action) {
      case 'user_upgraded_to_premium':
      case 'user_downgraded_to_free':
        return '👤';
      case 'user_suspended':
      case 'user_unsuspended':
      case 'user_deleted':
        return '🚫';
      case 'mood_board_created':
      case 'mood_board_updated':
      case 'mood_board_deleted':
        return '🎨';
      case 'mood_board_published':
      case 'mood_board_unpublished':
        return '📢';
      case 'system_backup_created':
        return '💾';
      case 'system_settings_updated':
        return '⚙️';
      case 'admin_login':
      case 'admin_logout':
        return '🔐';
      default:
        return '📝';
    }
  };

  return (
    <AdminLayout title={strings.admin.activityLogs}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{strings.admin.activityLogsTitle}</h1>
            <p className="text-gray-600">{strings.admin.activityLogsDescription}</p>
          </div>
          <button
            onClick={refreshLogs}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? strings.admin.refreshing : strings.admin.refresh}
          </button>
        </div>

        {/* Activity Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{strings.admin.recentActivity}</h3>
            <p className="text-3xl font-bold text-blue-600">{totalActions}</p>
            <p className="text-gray-600">{strings.admin.actionsInLast7Days}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{strings.admin.mostCommon}</h3>
            <div className="space-y-2">
              {Object.entries(actionsByType)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([action, count]) => (
                  <div key={action} className="flex justify-between text-sm">
                    <span className="text-gray-600">{formatLogAction(action as AdminLogAction)}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{strings.admin.systemStatus}</h3>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span className="text-green-600 font-medium">{strings.admin.allSystemsOperational}</span>
            </div>
            <p className="text-gray-600 text-sm mt-1">{strings.admin.lastChecked}: {formatDate(new Date())}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="actionFilter" className="block text-sm font-medium text-gray-700 mb-2">
                {strings.admin.filterByAction}
              </label>
              <select
                id="actionFilter"
                value={selectedAction}
                onChange={(e) => {
                  setSelectedAction(e.target.value as AdminLogAction | 'all');
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">{strings.admin.allActions}</option>
                <option value="user_upgraded_to_premium">{strings.admin.userUpgrades}</option>
                <option value="user_suspended">{strings.admin.userSuspensions}</option>
                <option value="mood_board_created">{strings.admin.moodBoardCreated}</option>
                <option value="mood_board_updated">{strings.admin.moodBoardUpdated}</option>
                <option value="mood_board_deleted">{strings.admin.moodBoardDeleted}</option>
                <option value="admin_login">{strings.admin.adminLogins}</option>
              </select>
            </div>

            <div>
              <label htmlFor="userSearch" className="block text-sm font-medium text-gray-700 mb-2">
                {strings.admin.filterByUserId}
              </label>
              <input
                id="userSearch"
                type="text"
                value={searchUserId}
                onChange={(e) => {
                  setSearchUserId(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={strings.forms.placeholders.userFilter}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{strings.admin.errorLoadingLogs}</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{strings.admin.activityLog}</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading logs...</p>
            </div>
          ) : currentLogs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">No logs found matching your criteria.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Target
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentLogs.map((log) => {
                      const severity = getActionSeverity(log.action);
                      const severityColor = getSeverityColor(severity);

                      return (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="text-lg mr-3">{getActionIcon(log.action)}</span>
                              <div>
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${severityColor}`}>
                                  {formatLogAction(log.action)}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.targetUserId && (
                              <div>User: {log.targetUserId.slice(0, 8)}...</div>
                            )}
                            {log.targetMoodBoardId && (
                              <div>Board: {log.targetMoodBoardId}</div>
                            )}
                            {!log.targetUserId && !log.targetMoodBoardId && (
                              <span className="text-gray-400">System</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {Object.keys(log.details).length > 0 ? (
                              <details className="cursor-pointer">
                                <summary className="text-blue-600 hover:text-blue-800">View details</summary>
                                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </details>
                            ) : (
                              <span className="text-gray-400">No details</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(log.timestamp)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {startIndex + 1} to {Math.min(endIndex, logs.length)} of {logs.length} logs
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded">
                      {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
