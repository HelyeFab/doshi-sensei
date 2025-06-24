'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatsOverview } from '@/components/admin/StatsOverview';

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

        {/* Real-time Stats overview */}
        <StatsOverview />

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
              icon="�"
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
