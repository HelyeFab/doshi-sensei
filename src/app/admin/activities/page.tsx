'use client';

import React, { useState, useEffect } from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import { useRouter } from 'next/navigation';
import { statsTracker } from '@/lib/stats/statsTracker';
import { doc, getDoc, setDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ActivityTypeConfig {
  type: string;
  displayName: string;
  icon: string;
  statsField: string;
  description: string;
  trackingFunction?: string;
  enabled: boolean;
}

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

  // Default activity types
  const defaultActivityTypes: ActivityTypeConfig[] = [
    {
      type: 'drill',
      displayName: 'Drill Practice',
      icon: '⚡',
      statsField: 'drillsCompleted',
      description: 'Conjugation drill exercises',
      trackingFunction: 'trackDrillCompleted',
      enabled: true
    },
    {
      type: 'story',
      displayName: 'Story Reading',
      icon: '📖',
      statsField: 'storiesRead',
      description: 'Story reading sessions',
      trackingFunction: 'trackStoryRead',
      enabled: true
    },
    {
      type: 'article',
      displayName: 'Article Reading',
      icon: '📰',
      statsField: 'articlesRead',
      description: 'News article reading',
      trackingFunction: 'trackArticleRead',
      enabled: true
    },
    {
      type: 'kanji',
      displayName: 'Kanji Study',
      icon: '漢',
      statsField: 'kanjiStudySessions',
      description: 'Kanji learning sessions',
      trackingFunction: 'trackKanjiStudy',
      enabled: true
    },
    {
      type: 'game',
      displayName: 'Games',
      icon: '🎮',
      statsField: 'gamesPlayed',
      description: 'Educational games',
      trackingFunction: 'trackGamePlayed',
      enabled: true
    },
    {
      type: 'vocab',
      displayName: 'Vocabulary',
      icon: '📝',
      statsField: 'vocabStudied',
      description: 'Vocabulary study',
      trackingFunction: 'trackVocabStudied',
      enabled: true
    },
    {
      type: 'flashcard',
      displayName: 'Flashcards',
      icon: '🎴',
      statsField: 'flashcardsReviewed',
      description: 'Flashcard reviews',
      trackingFunction: 'trackFlashcardReviewed',
      enabled: true
    },
    {
      type: 'practice',
      displayName: 'Practice Sessions',
      icon: '🎯',
      statsField: 'practiceSessionsCompleted',
      description: 'General practice sessions (kana, verbs)',
      trackingFunction: 'trackPracticeSession',
      enabled: true
    }
  ];

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
      const configDoc = await getDoc(doc(db, 'admin', 'activityTypes'));
      if (configDoc.exists()) {
        setActivityTypes(configDoc.data().types || defaultActivityTypes);
      } else {
        // Initialize with defaults
        setActivityTypes(defaultActivityTypes);
        await saveActivityTypes(defaultActivityTypes);
      }
    } catch (error) {
      console.error('Error loading activity types:', error);
      setActivityTypes(defaultActivityTypes);
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
      await setDoc(doc(db, 'admin', 'activityTypes'), {
        types,
        lastUpdated: new Date().toISOString()
      });
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

    const newActivityType: ActivityTypeConfig = {
      type: newType.type,
      displayName: newType.displayName,
      icon: newType.icon || '📊',
      statsField: newType.statsField,
      description: newType.description || '',
      enabled: true
    };

    const updatedTypes = [...activityTypes, newActivityType];
    setActivityTypes(updatedTypes);
    await saveActivityTypes(updatedTypes);
    setShowAddForm(false);
    setNewType({});
  };

  const handleToggleType = async (type: string) => {
    const updatedTypes = activityTypes.map(t => 
      t.type === type ? { ...t, enabled: !t.enabled } : t
    );
    setActivityTypes(updatedTypes);
    await saveActivityTypes(updatedTypes);
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading activity tracking...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Activity Tracking Management</h1>
          <p className="mt-2 text-gray-600">Configure and monitor activity types tracked by the stats system</p>
        </div>

        {/* Activity Types Configuration */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Activity Types</h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Add New Type
            </button>
          </div>

          {showAddForm && (
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-medium mb-4">Add New Activity Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Type ID (e.g., 'reading')"
                  value={newType.type || ''}
                  onChange={(e) => setNewType({ ...newType, type: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  type="text"
                  placeholder="Display Name"
                  value={newType.displayName || ''}
                  onChange={(e) => setNewType({ ...newType, displayName: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  type="text"
                  placeholder="Icon (emoji)"
                  value={newType.icon || ''}
                  onChange={(e) => setNewType({ ...newType, icon: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  type="text"
                  placeholder="Stats Field Name"
                  value={newType.statsField || ''}
                  onChange={(e) => setNewType({ ...newType, statsField: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md"
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
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Add Type
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewType({});
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Display Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stats Field
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recent Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activityTypes.map((activityType) => (
                  <tr key={activityType.type}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-2xl mr-2">{activityType.icon}</span>
                        <span className="text-sm font-medium text-gray-900">{activityType.type}</span>
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
                          className="px-2 py-1 border border-gray-300 rounded"
                        />
                      ) : (
                        <span className="text-sm text-gray-900">{activityType.displayName}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {activityType.statsField}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{getActivityCount(activityType.type)}</span>
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
                            className="text-gray-600 hover:text-gray-900"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingType(activityType.type)}
                          className="text-indigo-600 hover:text-indigo-900"
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
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Activities (Last 50)</h2>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentActivities.map((activity) => {
                  const activityConfig = activityTypes.find(t => t.type === activity.type);
                  return (
                    <tr key={activity.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(activity.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-lg mr-2">
                            {activityConfig?.icon || '📊'}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {activityConfig?.displayName || activity.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <pre className="text-xs bg-gray-100 p-2 rounded max-w-xs overflow-x-auto">
                          {JSON.stringify(activity.details, null, 2)}
                        </pre>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">User Activity Viewer</h2>
            <p className="text-sm text-gray-600 mt-1">View all activities for a specific user, organized by day</p>
          </div>
          <div className="p-6">
            <div className="flex gap-4 mb-6">
              <input
                type="text"
                placeholder="Enter User ID (e.g., WawMEtfq0dcoVPMr3nuwpFAzr9F2)"
                value={searchUserId}
                onChange={(e) => setSearchUserId(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={loadUserActivities}
                disabled={loadingUserActivities}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {loadingUserActivities ? 'Loading...' : 'Load Activities'}
              </button>
            </div>

            {Object.keys(userActivities).length > 0 && (
              <div className="space-y-6 max-h-96 overflow-y-auto">
                {Object.entries(userActivities)
                  .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
                  .map(([date, activities]) => (
                    <div key={date} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-lg mb-3 text-gray-800">
                        {new Date(date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                        <span className="ml-2 text-sm text-gray-500">({activities.length} activities)</span>
                      </h4>
                      <div className="space-y-2">
                        {activities.map((activity, idx) => {
                          const activityConfig = activityTypes.find(t => t.type === activity.type);
                          return (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                              <span className="text-2xl mt-1">
                                {activityConfig?.icon || '📊'}
                              </span>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">
                                    {activityConfig?.displayName || activity.type}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    {new Date(activity.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                                <div className="mt-1 text-sm text-gray-600">
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
              <div className="text-center py-8 text-gray-500">
                <p>No activities found for user ID: {searchUserId}</p>
                <p className="text-sm mt-2">Note: Only premium users have cloud-synced activity data</p>
              </div>
            )}
          </div>
        </div>

        {/* Implementation Guide */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Implementation Guide</h3>
          <p className="text-blue-800 mb-4">
            To track a new activity type in your code:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Add the activity type configuration above</li>
            <li>Create a tracking function in <code className="bg-blue-100 px-1 rounded">/src/lib/stats/trackingEvents.ts</code></li>
            <li>Add the corresponding field to <code className="bg-blue-100 px-1 rounded">UserStatsV2</code> interface</li>
            <li>Update the stats processing logic in <code className="bg-blue-100 px-1 rounded">statsTracker.ts</code></li>
            <li>Import and call your tracking function where the activity occurs</li>
          </ol>
        </div>
      </div>
    </div>
  );
}