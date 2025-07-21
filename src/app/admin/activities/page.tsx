'use client';

import React, { useState, useEffect } from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import { useRouter } from 'next/navigation';
import { statsTracker } from '@/lib/stats/statsTracker';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { activityTypesManager, ActivityTypeConfig } from '@/utils/activityTypes';

interface ActivityEvent {
  id: string;
  type: string;
  timestamp: number;
  userId?: string;
  details: any;
}

export default function ActivitiesPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const router = useRouter();
  const [activityTypes, setActivityTypes] = useState<ActivityTypeConfig[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingType, setEditingType] = useState<string | null>(null);
  const [newType, setNewType] = useState<Partial<ActivityTypeConfig>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchUserId, setSearchUserId] = useState('');
  const [userActivities, setUserActivities] = useState<Record<string, ActivityEvent[]>>({});
  const [loadingUserActivities, setLoadingUserActivities] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/');
      return;
    }

    if (isAdmin) {
      loadActivityTypes();
      loadRecentActivities();
    }
  }, [isAdmin, adminLoading, router]);

  const loadActivityTypes = async () => {
    try {
      const data = await activityTypesManager.getActivityTypes();
      setActivityTypes(data.types);
    } catch (error) {
      console.error('Error loading activity types:', error);
      // The manager already handles fallback internally
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivities = async () => {
    try {
      const activities = await statsTracker.getRecentActivities(50);
      setRecentActivities(activities);
    } catch (error) {
      console.error('Error loading recent activities:', error);
    }
  };

  const saveActivityTypes = async (types: ActivityTypeConfig[]) => {
    try {
      await activityTypesManager.updateActivityTypes(types);
      // Force refresh from Firebase to ensure consistency
      activityTypesManager.clearCache();
      await loadActivityTypes();
    } catch (error) {
      console.error('Error saving activity types:', error);
      alert('Failed to save activity types');
    }
  };

  const handleSaveType = async (type: ActivityTypeConfig) => {
    const updatedTypes = activityTypes.map(t => 
      t.type === type.type ? type : t
    );
    setActivityTypes(updatedTypes);
    await saveActivityTypes(updatedTypes);
    setEditingType(null);
  };

  const handleAddType = async () => {
    if (!newType.type || !newType.displayName || !newType.statsField) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await activityTypesManager.addActivityType({
        type: newType.type,
        displayName: newType.displayName,
        icon: newType.icon || '📊',
        statsField: newType.statsField,
        description: newType.description || '',
        trackingFunction: newType.trackingFunction,
        enabled: true
      });
      
      // Refresh the list
      await loadActivityTypes();
      setShowAddForm(false);
      setNewType({});
    } catch (error) {
      console.error('Error adding activity type:', error);
      alert(error instanceof Error ? error.message : 'Failed to add activity type');
    }
  };

  const handleToggleType = async (type: string) => {
    try {
      await activityTypesManager.toggleActivityType(type);
      // Refresh the list
      await loadActivityTypes();
    } catch (error) {
      console.error('Error toggling activity type:', error);
      alert('Failed to toggle activity type');
    }
  };

  const getActivityCount = (type: string) => {
    return recentActivities.filter(a => a.type === type).length;
  };

  const loadUserActivities = async () => {
    if (!searchUserId.trim()) {
      alert('Please enter a user ID');
      return;
    }

    setLoadingUserActivities(true);
    setUserActivities({});

    try {
      // Load user's daily activities from Firestore
      const dailyActivitiesRef = collection(db, 'userStats', searchUserId.trim(), 'dailyActivities');
      const q = query(dailyActivitiesRef, orderBy('date', 'desc'), limit(30)); // Last 30 days
      const snapshot = await getDocs(q);

      const activitiesByDate: Record<string, ActivityEvent[]> = {};

      for (const doc of snapshot.docs) {
        const dailyData = doc.data();
        const date = dailyData.date || doc.id;
        
        // Extract activities from the daily activity document
        if (dailyData.activities && Array.isArray(dailyData.activities)) {
          activitiesByDate[date] = dailyData.activities.map((activity: any) => ({
            ...activity,
            date
          }));
        }
      }

      setUserActivities(activitiesByDate);

      if (Object.keys(activitiesByDate).length === 0) {
        alert('No activities found for this user. Note: Only premium users have cloud-synced activities.');
      }
    } catch (error) {
      console.error('Error loading user activities:', error);
      alert('Failed to load user activities. Make sure the user ID is correct and they have cloud sync enabled (premium users only).');
    } finally {
      setLoadingUserActivities(false);
    }
  };

  if (adminLoading || loading) {
    return <div>Loading activity tracking...</div>;
  }

  return (
    <AdminLayout title="Activity Tracking Management">
      <div className="space-y-6">
        <p className="text-muted-foreground">Configure and monitor activity types tracked by the stats system</p>

        {/* Activity Types Configuration */}
        <div className="bg-card shadow rounded-lg">
          <div className="px-6 py-4 border-b border-border flex justify-between items-center">
            <h2 className="text-xl font-semibold text-foreground">Activity Types</h2>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  setLoading(true);
                  activityTypesManager.clearCache();
                  await loadActivityTypes();
                }}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
                title="Refresh from Firebase"
              >
                🔄 Refresh
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Add New Type
              </button>
            </div>
          </div>

          {showAddForm && (
            <div className="px-6 py-4 bg-muted border-b border-border">
              <h3 className="text-lg font-medium mb-4">Add New Activity Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Type ID (e.g., 'reading')"
                  value={newType.type || ''}
                  onChange={(e) => setNewType({ ...newType, type: e.target.value })}
                  className="px-3 py-2 border border-border rounded-md"
                />
                <input
                  type="text"
                  placeholder="Display Name"
                  value={newType.displayName || ''}
                  onChange={(e) => setNewType({ ...newType, displayName: e.target.value })}
                  className="px-3 py-2 border border-border rounded-md"
                />
                <input
                  type="text"
                  placeholder="Icon (emoji)"
                  value={newType.icon || ''}
                  onChange={(e) => setNewType({ ...newType, icon: e.target.value })}
                  className="px-3 py-2 border border-border rounded-md"
                />
                <input
                  type="text"
                  placeholder="Stats Field Name"
                  value={newType.statsField || ''}
                  onChange={(e) => setNewType({ ...newType, statsField: e.target.value })}
                  className="px-3 py-2 border border-border rounded-md"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={newType.description || ''}
                  onChange={(e) => setNewType({ ...newType, description: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md md:col-span-2"
                />
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleAddType}
                  className="px-4 py-2 bg-green-600 text-primary-foreground rounded-md hover:bg-green-700"
                >
                  Add Type
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewType({});
                  }}
                  className="px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Display Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Stats Field
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Recent Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {activityTypes.map((activityType) => (
                  <tr key={activityType.type}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {activityType.icon?.startsWith('/') ? (
                          <img src={activityType.icon} alt={activityType.displayName} className="w-6 h-6 mr-2" />
                        ) : (
                          <span className="text-2xl mr-2">{activityType.icon}</span>
                        )}
                        <span className="text-sm font-medium text-foreground">{activityType.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingType === activityType.type ? (
                        <input
                          type="text"
                          value={activityType.displayName}
                          onChange={(e) => {
                            const updated = activityTypes.map(t =>
                              t.type === activityType.type
                                ? { ...t, displayName: e.target.value }
                                : t
                            );
                            setActivityTypes(updated);
                          }}
                          className="px-2 py-1 border border-border rounded"
                        />
                      ) : (
                        <span className="text-sm text-foreground">{activityType.displayName}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {activityType.statsField}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-foreground">{getActivityCount(activityType.type)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleType(activityType.type)}
                        className={`px-2 py-1 text-xs rounded-full ${
                          activityType.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {activityType.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {editingType === activityType.type ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveType(activityType)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingType(null)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingType(activityType.type)}
                          className="text-primary hover:text-primary/80"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-card shadow rounded-lg">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground">Recent Activities (Last 50)</h2>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    User
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {recentActivities.map((activity) => {
                  const activityConfig = activityTypes.find(t => t.type === activity.type);
                  return (
                    <tr key={activity.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {new Date(activity.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {activityConfig?.icon?.startsWith('/') ? (
                            <img src={activityConfig.icon} alt={activityConfig.displayName} className="w-5 h-5 mr-2" />
                          ) : (
                            <span className="text-lg mr-2">
                              {activityConfig?.icon || '📊'}
                            </span>
                          )}
                          <span className="text-sm font-medium text-foreground">
                            {activityConfig?.displayName || activity.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        <pre className="text-xs bg-muted p-2 rounded max-w-xs overflow-x-auto">
                          {JSON.stringify(activity.details, null, 2)}
                        </pre>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {activity.userId || 'Anonymous'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Activity Viewer */}
        <div className="bg-card shadow rounded-lg">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground">User Activity Viewer</h2>
            <p className="text-sm text-muted-foreground mt-1">View all activities for a specific user, organized by day</p>
          </div>
          <div className="p-6">
            <div className="flex gap-4 mb-6">
              <input
                type="text"
                placeholder="Enter User ID (e.g., WawMEtfq0dcoVPMr3nuwpFAzr9F2)"
                value={searchUserId}
                onChange={(e) => setSearchUserId(e.target.value)}
                className="flex-1 px-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={loadUserActivities}
                disabled={loadingUserActivities}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:bg-muted"
              >
                {loadingUserActivities ? 'Loading...' : 'Load Activities'}
              </button>
            </div>

            {Object.keys(userActivities).length > 0 && (
              <div className="space-y-6 max-h-96 overflow-y-auto">
                {Object.entries(userActivities)
                  .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
                  .map(([date, activities]) => (
                    <div key={date} className="border border-border rounded-lg p-4">
                      <h4 className="font-semibold text-lg mb-3 text-foreground">
                        {new Date(date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                        <span className="ml-2 text-sm text-muted-foreground">({activities.length} activities)</span>
                      </h4>
                      <div className="space-y-2">
                        {activities.map((activity, idx) => {
                          const activityConfig = activityTypes.find(t => t.type === activity.type);
                          return (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-muted rounded">
                              {activityConfig?.icon?.startsWith('/') ? (
                                <img src={activityConfig.icon} alt={activityConfig.displayName} className="w-8 h-8 mt-1" />
                              ) : (
                                <span className="text-2xl mt-1">
                                  {activityConfig?.icon || '📊'}
                                </span>
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-foreground">
                                    {activityConfig?.displayName || activity.type}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    {new Date(activity.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                  {activity.details.itemTitle && (
                                    <div>Title: {activity.details.itemTitle}</div>
                                  )}
                                  {activity.details.feature && (
                                    <div>Feature: {activity.details.feature}</div>
                                  )}
                                  {activity.details.correct !== undefined && activity.details.total !== undefined && (
                                    <div>
                                      Score: {activity.details.correct}/{activity.details.total} 
                                      ({Math.round((activity.details.correct / activity.details.total) * 100)}%)
                                    </div>
                                  )}
                                  {activity.details.duration && (
                                    <div>Duration: {Math.round(activity.details.duration / 1000)}s</div>
                                  )}
                                  {activity.details.score !== undefined && (
                                    <div>Score: {activity.details.score}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {searchUserId && !loadingUserActivities && Object.keys(userActivities).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No activities found for user ID: {searchUserId}</p>
                <p className="text-sm mt-2">Note: Only premium users have cloud-synced activity data</p>
              </div>
            )}
          </div>
        </div>

        {/* Implementation Guide */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">Implementation Guide</h3>
          <p className="text-blue-800 dark:text-blue-200 mb-4">
            To track a new activity type in your code:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-blue-800 dark:text-blue-200">
            <li>Add the activity type configuration above</li>
            <li>Create a tracking function in <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">/src/lib/stats/trackingEvents.ts</code></li>
            <li>Add the corresponding field to <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">UserStatsV2</code> interface</li>
            <li>Update the stats processing logic in <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">statsTracker.ts</code></li>
            <li>Import and call your tracking function where the activity occurs</li>
          </ol>
        </div>
      </div>
    </AdminLayout>
  );
}