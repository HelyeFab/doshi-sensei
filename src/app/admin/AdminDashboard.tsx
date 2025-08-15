'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatsOverviewEnhanced } from '@/components/admin/StatsOverviewEnhanced';
import { ArticleMonitoringDashboard } from '@/components/admin/ArticleMonitoringDashboard';
import SubscriptionAnalytics from '@/components/admin/SubscriptionAnalytics';
import { useStrings } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { VersionDisplay } from '@/components/VersionDisplay';

function QuickAction({ title, description, icon, onClick, loading }: {
  title: string;
  description: string;
  icon: string;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="bg-card border border-border rounded-lg p-4 text-left hover:bg-muted transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl">{loading ? '⏳' : icon}</div>
        <div>
          <h3 className="font-medium text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
    </button>
  );
}

export default function AdminDashboard() {
  const strings = useStrings();
  const router = useRouter();
  const { user } = useAuth();
  const [firebaseStatus, setFirebaseStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [gitBranch, setGitBranch] = useState<string>('main');

  useEffect(() => {
    // Check Firebase connection
    const checkFirebaseConnection = async () => {
      try {
        // Try to read the user's own document to verify connection
        if (user?.uid) {
          const userRef = doc(db, 'users', user.uid);
          await getDoc(userRef);
          setFirebaseStatus('connected');
        }
      } catch (error) {
        console.error('Firebase connection error:', error);
        setFirebaseStatus('error');
      }
    };

    if (user) {
      checkFirebaseConnection();
    }

    // Get git branch from environment or default
    const branch = process.env.NEXT_PUBLIC_GIT_BRANCH || 'main';
    setGitBranch(branch);
  }, [user]);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'users':
        router.push('/admin/users');
        break;
      case 'create-mood-board':
        router.push('/admin/mood-boards/new');
        break;
      case 'articles':
        router.push('/admin/articles');
        break;
      case 'create-resource':
        router.push('/admin/resources/new');
        break;
      case 'manage-resources':
        router.push('/admin/resources');
        break;
      case 'create-blog':
        router.push('/admin/blog/new');
        break;
      case 'manage-blog':
        router.push('/admin/blog');
        break;
      case 'youtube-series':
        router.push('/admin/youtube-series');
        break;
      case 'create-story':
        router.push('/admin/stories/new');
        break;
      case 'manage-stories':
        router.push('/admin/stories');
        break;
      case 'logs':
        // TODO: Implement logs page
        break;
      case 'analytics':
        router.push('/admin/analytics');
        break;
      case 'pricing':
        router.push('/admin/pricing');
        break;
      case 'bugs':
        router.push('/admin/bugs');
        break;
      case 'system-health':
        router.push('/admin/system-health');
        break;
      case 'maintenance':
        router.push('/admin/maintenance');
        break;
      case 'mockup-generator':
        router.push('/admin/mockup-generator');
        break;
      default:
    }
  };

  return (
    <AdminLayout title="Admin Dashboard">

      <div className="space-y-6">
        {/* Welcome section */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 sm:p-6 border border-blue-200 dark:border-blue-800">
          <h2 className="text-xl font-bold text-foreground mb-2">
            {strings.admin.welcomeTitle}
          </h2>
          <p className="text-muted-foreground">
            {strings.admin.welcomeDescription}
          </p>
        </div>

        {/* Real-time Stats overview */}
        <StatsOverviewEnhanced />

        {/* Article Monitoring Dashboard */}
        <ArticleMonitoringDashboard />

        {/* Subscription Analytics */}
        <SubscriptionAnalytics />

        {/* Quick actions */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">{strings.admin.quickActions}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Emergency Maintenance - First position for visibility */}
            <QuickAction
              title="🚨 Maintenance Mode"
              description="Emergency shutdown control"
              icon="🔴"
              onClick={() => handleQuickAction('maintenance')}
            />
            <QuickAction
              title={strings.admin.manageUsers}
              description={strings.admin.manageUsersDescription}
              icon="👥"
              onClick={() => handleQuickAction('users')}
            />
            <QuickAction
              title={strings.admin.createMoodBoard}
              description={strings.admin.createMoodBoardDescription}
              icon="🗺️"
              onClick={() => handleQuickAction('create-mood-board')}
            />
            <QuickAction
              title={strings.admin.manageArticles}
              description={strings.admin.manageArticlesDescription}
              icon="📋"
              onClick={() => handleQuickAction('articles')}
            />
            <QuickAction
              title="Bug Reports"
              description="View and manage bug reports"
              icon="🐛"
              onClick={() => handleQuickAction('bugs')}
            />
            <QuickAction
              title={strings.admin.createResource}
              description={strings.admin.createResourceDescription}
              icon="📄"
              onClick={() => handleQuickAction('create-resource')}
            />
            <QuickAction
              title={strings.admin.manageResources}
              description={strings.admin.manageResourcesDescription}
              icon="📚"
              onClick={() => handleQuickAction('manage-resources')}
            />
            <QuickAction
              title="Create Blog Post"
              description="Write and publish blog articles"
              icon="✍️"
              onClick={() => handleQuickAction('create-blog')}
            />
            <QuickAction
              title="Manage Blog"
              description="Edit and manage blog posts"
              icon="📰"
              onClick={() => handleQuickAction('manage-blog')}
            />
            <QuickAction
              title="YouTube Series"
              description="Manage YouTube channel monitoring"
              icon="📺"
              onClick={() => handleQuickAction('youtube-series')}
            />
            <QuickAction
              title={strings.admin.createStory}
              description={strings.admin.createStoryDescription}
              icon="📖"
              onClick={() => handleQuickAction('create-story')}
            />
            <QuickAction
              title={strings.admin.manageStories}
              description={strings.admin.manageStoriesDescription}
              icon="📚"
              onClick={() => handleQuickAction('manage-stories')}
            />
            <QuickAction
              title="Analytics Dashboard"
              description="View platform usage and insights"
              icon="📊"
              onClick={() => handleQuickAction('analytics')}
            />
            <QuickAction
              title="Pricing Configuration"
              description="Manage subscription pricing"
              icon="💰"
              onClick={() => handleQuickAction('pricing')}
            />
            <QuickAction
              title="System Health"
              description="Monitor subscription & data health"
              icon="🏥"
              onClick={() => handleQuickAction('system-health')}
            />
            <QuickAction
              title="Mockup Generator"
              description="Create marketing mockups"
              icon="🎨"
              onClick={() => handleQuickAction('mockup-generator')}
            />
          </div>
        </div>


        {/* Recent activity placeholder */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">{strings.admin.recentActivity}</h3>
          <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-muted-foreground">
                {strings.admin.realTimeActivityComingSoon}
              </p>
            </div>
          </div>
        </div>

        {/* System status */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">{strings.admin.systemStatus}</h3>
          <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                firebaseStatus === 'connected' ? 'bg-green-500' :
                firebaseStatus === 'error' ? 'bg-red-500' :
                'bg-yellow-500 animate-pulse'
              }`}></div>
              <span className="text-foreground font-medium">
                {firebaseStatus === 'connected' ? strings.admin.allSystemsOperational :
                 firebaseStatus === 'error' ? 'System Issues Detected' :
                 'Checking Systems...'}
              </span>
            </div>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>{strings.admin.firebaseConnection}</span>
                <span className={firebaseStatus === 'connected' ? 'text-green-600' :
                                firebaseStatus === 'error' ? 'text-red-600' :
                                'text-yellow-600'}>
                  {firebaseStatus === 'connected' ? '✓ ' + strings.admin.connected :
                   firebaseStatus === 'error' ? '✗ Error' :
                   '⏳ Checking...'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{strings.admin.adminDashboard}</span>
                <span className="text-green-600">✓ {strings.admin.active}</span>
              </div>
              <div className="flex justify-between">
                <span>{strings.admin.branch}</span>
                <span className="text-blue-600">{gitBranch}</span>
              </div>
              <div className="flex justify-between">
                <span>Version</span>
                <VersionDisplay showDetails={true} className="text-foreground" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
