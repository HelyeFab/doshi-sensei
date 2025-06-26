'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatsOverview } from '@/components/admin/StatsOverview';
import { ArticleMonitoringDashboard } from '@/components/admin/ArticleMonitoringDashboard';
import { 
  triggerWatanocScraping, 
  triggerTodaiiScraping, 
  triggerNHKEasyScraping,
  triggerAllSourcesScraping,
  NEWS_SOURCES,
  formatScrapingResult
} from '@/utils/newsSources';

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
  const router = useRouter();
  const [scrapingLoading, setScrapingLoading] = useState<Record<string, boolean>>({
    watanoc: false,
    todaii: false,
    nhkEasy: false,
    all: false
  });
  const [scrapingStatus, setScrapingStatus] = useState<Record<string, string>>({
    watanoc: '',
    todaii: '',
    nhkEasy: '',
    all: ''
  });

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
      case 'logs':
        // TODO: Implement logs page
        break;
      default:
    }
  };

  // Individual source scraping handlers
  const handleSourceScraping = async (sourceId: string, scrapingFunction: () => Promise<any>) => {
    setScrapingLoading(prev => ({ ...prev, [sourceId]: true }));
    setScrapingStatus(prev => ({ ...prev, [sourceId]: `🚀 Starting ${NEWS_SOURCES[sourceId]?.name || sourceId} scraping...` }));
    
    try {
      const result = await scrapingFunction();
      const source = NEWS_SOURCES[sourceId];
      
      if (result.success) {
        const message = formatScrapingResult(result, source);
        setScrapingStatus(prev => ({ ...prev, [sourceId]: message }));
      } else {
        const message = formatScrapingResult(result, source);
        setScrapingStatus(prev => ({ ...prev, [sourceId]: message }));
      }
    } catch (error) {
      setScrapingStatus(prev => ({ 
        ...prev, 
        [sourceId]: `❌ ${NEWS_SOURCES[sourceId]?.name || sourceId}: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }));
    } finally {
      setScrapingLoading(prev => ({ ...prev, [sourceId]: false }));
      // Clear status after 10 seconds
      setTimeout(() => {
        setScrapingStatus(prev => ({ ...prev, [sourceId]: '' }));
      }, 10000);
    }
  };

  const handleWatanocScraping = () => handleSourceScraping('watanoc', triggerWatanocScraping);
  const handleTodaiiScraping = () => handleSourceScraping('todaii', triggerTodaiiScraping);
  const handleNHKEasyScraping = () => handleSourceScraping('nhkEasy', triggerNHKEasyScraping);

  const handleAllSourcesScraping = async () => {
    setScrapingLoading(prev => ({ ...prev, all: true }));
    setScrapingStatus(prev => ({ ...prev, all: '🚀 Starting all sources scraping...' }));
    
    try {
      const results = await triggerAllSourcesScraping();
      const { overall } = results;
      
      // Set individual results
      setScrapingStatus(prev => ({
        ...prev,
        watanoc: formatScrapingResult(results.watanoc, NEWS_SOURCES.watanoc),
        todaii: formatScrapingResult(results.todaii, NEWS_SOURCES.todaii),
        nhkEasy: formatScrapingResult(results.nhkEasy, NEWS_SOURCES.nhkEasy),
        all: `🎉 All sources completed: ${overall.totalArticles} total articles from ${overall.successfulSources}/3 sources (${overall.totalTimeElapsed}s)`
      }));
    } catch (error) {
      setScrapingStatus(prev => ({ 
        ...prev, 
        all: `❌ All sources failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }));
    } finally {
      setScrapingLoading(prev => ({ ...prev, all: false }));
      // Clear all status after 15 seconds
      setTimeout(() => {
        setScrapingStatus({
          watanoc: '',
          todaii: '',
          nhkEasy: '',
          all: ''
        });
      }, 15000);
    }
  };

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {/* Welcome section */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 sm:p-6 border border-blue-200 dark:border-blue-800">
          <h2 className="text-xl font-bold text-foreground mb-2">
            Welcome to Admin Dashboard
          </h2>
          <p className="text-muted-foreground">
            Manage users, monitor statistics, and configure mood boards from this central hub.
          </p>
        </div>

        {/* Real-time Stats overview */}
        <StatsOverview />

        {/* Article Monitoring Dashboard */}
        <ArticleMonitoringDashboard />

        {/* Quick actions */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <QuickAction
              title="Manage Users"
              description="Search users and manage premium accounts"
              icon="👥"
              onClick={() => handleQuickAction('users')}
            />
            <QuickAction
              title="Create Mood Board"
              description="Add new kanji mood boards"
              icon="🗺️"
              onClick={() => handleQuickAction('create-mood-board')}
            />
            <QuickAction
              title="Manage Articles"
              description="View article stats and management"
              icon="📋"
              onClick={() => handleQuickAction('articles')}
            />
          </div>
        </div>

        {/* News Sources Scraping */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">News Sources Scraping</h3>
          
          {/* Individual source buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <QuickAction
              title={NEWS_SOURCES.watanoc.name}
              description={NEWS_SOURCES.watanoc.description}
              icon={NEWS_SOURCES.watanoc.emoji}
              onClick={handleWatanocScraping}
              loading={scrapingLoading.watanoc}
            />
            <QuickAction
              title={NEWS_SOURCES.todaii.name}
              description={NEWS_SOURCES.todaii.description}
              icon={NEWS_SOURCES.todaii.emoji}
              onClick={handleTodaiiScraping}
              loading={scrapingLoading.todaii}
            />
            <QuickAction
              title={NEWS_SOURCES.nhkEasy.name}
              description={NEWS_SOURCES.nhkEasy.description}
              icon={NEWS_SOURCES.nhkEasy.emoji}
              onClick={handleNHKEasyScraping}
              loading={scrapingLoading.nhkEasy}
            />
            <QuickAction
              title="All Sources"
              description="Scrape all three sources in parallel"
              icon="🚀"
              onClick={handleAllSourcesScraping}
              loading={scrapingLoading.all}
            />
          </div>
          
          {/* Scraping status */}
          <div className="space-y-2">
            {Object.entries(scrapingStatus).map(([sourceId, status]) => 
              status && (
                <div key={sourceId} className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-mono">{status}</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Recent activity placeholder */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
          <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-muted-foreground">
                Real-time activity feed coming soon...
              </p>
            </div>
          </div>
        </div>

        {/* System status */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">System Status</h3>
          <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-foreground font-medium">All systems operational</span>
            </div>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Firebase Connection</span>
                <span className="text-green-600">✓ Connected</span>
              </div>
              <div className="flex justify-between">
                <span>Admin Dashboard</span>
                <span className="text-green-600">✓ Active</span>
              </div>
              <div className="flex justify-between">
                <span>Branch</span>
                <span className="text-blue-600">feature/admin-dashboard</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
