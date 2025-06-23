'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';

// Placeholder components that we'll implement later
function StatsCard({ title, value, icon, trend }: {
  title: string;
  value: string | number;
  icon: string;
  trend?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {trend && (
            <p className="text-xs text-green-600 mt-1">
              {trend}
            </p>
          )}
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}

function QuickAction({ title, description, icon, onClick }: {
  title: string;
  description: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-card border border-border rounded-lg p-4 text-left hover:bg-muted transition-colors w-full"
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl">{icon}</div>
        <div>
          <h3 className="font-medium text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
    </button>
  );
}

export default function AdminDashboard() {
  // Placeholder data - will be replaced with real data later
  const stats = {
    totalUsers: 156,
    newUsersToday: 8,
    premiumUsers: 23,
    moodBoards: 3,
  };

  const handleQuickAction = (action: string) => {
    console.log(`Quick action: ${action}`);
    // TODO: Implement navigation or action
  };

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {/* Welcome section */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <h2 className="text-xl font-bold text-foreground mb-2">
            Welcome to Admin Dashboard
          </h2>
          <p className="text-muted-foreground">
            Manage users, monitor statistics, and configure mood boards from this central hub.
          </p>
        </div>

        {/* Stats overview */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Users"
              value={stats.totalUsers}
              icon="👥"
              trend="+12% this month"
            />
            <StatsCard
              title="New Users Today"
              value={stats.newUsersToday}
              icon="🆕"
            />
            <StatsCard
              title="Premium Users"
              value={stats.premiumUsers}
              icon="⭐"
              trend="+3 this week"
            />
            <StatsCard
              title="Mood Boards"
              value={stats.moodBoards}
              icon="🎨"
            />
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <QuickAction
              title="Manage Users"
              description="Search users and manage premium accounts"
              icon="👥"
              onClick={() => handleQuickAction('users')}
            />
            <QuickAction
              title="Create Mood Board"
              description="Add new kanji mood boards"
              icon="🎨"
              onClick={() => handleQuickAction('create-mood-board')}
            />
            <QuickAction
              title="View Activity Logs"
              description="Monitor recent admin actions"
              icon="📝"
              onClick={() => handleQuickAction('logs')}
            />
          </div>
        </div>

        {/* Recent activity placeholder */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
          <div className="bg-card border border-border rounded-lg p-6">
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
          <div className="bg-card border border-border rounded-lg p-6">
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
