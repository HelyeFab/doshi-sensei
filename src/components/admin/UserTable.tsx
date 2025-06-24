'use client';

import { useState, useEffect } from 'react';
import { AdminUserDetails } from '@/types/admin';
import { UserDetailsModal } from './UserDetailsModal';
import { PremiumUpgradeButton } from './PremiumUpgradeButton';
import { useUsers } from '@/hooks/useUsers';
import { formatLimit, isPremiumPlan } from '@/types/subscription';

interface UserTableProps {
  searchQuery: string;
  filterType: 'all' | 'free' | 'premium' | 'active';
  onUserSelect: (user: AdminUserDetails) => void;
  onUserUpdate: (user: AdminUserDetails) => void;
  selectedUser: AdminUserDetails | null;
}

export function UserTable({
  searchQuery,
  filterType,
  onUserSelect,
  onUserUpdate,
  selectedUser,
}: UserTableProps) {
  const { users, loading, error, refreshUsers, upgradeUserToPremium } = useUsers();
  const [filteredUsers, setFilteredUsers] = useState<AdminUserDetails[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);

  // Filter users based on search query and filter type
  useEffect(() => {
    let filtered = users;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((user: AdminUserDetails) =>
        user.email.toLowerCase().includes(query) ||
        user.displayName?.toLowerCase().includes(query) ||
        user.id.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    switch (filterType) {
      case 'free':
        filtered = filtered.filter((user: AdminUserDetails) => user.subscription?.subscription?.plan === 'free');
        break;
      case 'premium':
        filtered = filtered.filter((user: AdminUserDetails) =>
          user.subscription?.subscription?.plan === 'monthly' ||
          user.subscription?.subscription?.plan === 'yearly'
        );
        break;
      case 'active':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filtered = filtered.filter((user: AdminUserDetails) =>
          user.lastLoginAt && new Date(user.lastLoginAt) >= today
        );
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    setFilteredUsers(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [users, searchQuery, filterType]);

  // Pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const handleUserClick = (user: AdminUserDetails) => {
    onUserSelect(user);
    setShowUserModal(true);
  };

  const handleCloseModal = () => {
    setShowUserModal(false);
  };

  const handleUpgrade = async (userId: string, plan: 'monthly' | 'yearly') => {
    try {
      await upgradeUserToPremium(userId, plan);
      await refreshUsers();

      // Update the selected user if it's the one being upgraded
      if (selectedUser && selectedUser.id === userId) {
        const updatedUser = users.find((u: AdminUserDetails) => u.id === userId);
        if (updatedUser) {
          onUserUpdate(updatedUser);
        }
      }
    } catch (error) {
      console.error('Failed to upgrade user:', error);
      // TODO: Show error notification
    }
  };

  const formatDate = (date: Date | undefined | null) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getSubscriptionBadge = (subscription: any) => {
    const plan = subscription?.subscription?.plan;

    switch (plan) {
      case 'monthly':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Monthly Premium
          </span>
        );
      case 'yearly':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
            Yearly Premium
          </span>
        );
      case 'free':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            Free
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex space-x-4">
              <div className="h-10 bg-muted rounded w-1/3"></div>
              <div className="h-10 bg-muted rounded w-1/4"></div>
              <div className="h-10 bg-muted rounded w-1/4"></div>
              <div className="h-10 bg-muted rounded w-1/6"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="text-center py-8">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            Failed to Load Users
          </h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={refreshUsers}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card border border-border rounded-lg">
        {/* Table header */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-foreground">
              Users ({filteredUsers.length})
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={refreshUsers}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title="Refresh users"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Table content */}
        {currentUsers.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">👤</div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              No Users Found
            </h3>
            <p className="text-muted-foreground">
              {searchQuery || filterType !== 'all'
                ? 'Try adjusting your search or filters'
                : 'No users have been registered yet'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Subscription
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Registered
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Last Active
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {currentUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleUserClick(user)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                            {user.displayName?.[0] || user.email?.[0]?.toUpperCase() || '?'}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">
                            {user.displayName || 'Anonymous User'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getSubscriptionBadge(user.subscription)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {formatDate(user.lastLoginAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div onClick={(e) => e.stopPropagation()}>
                        <PremiumUpgradeButton
                          user={user}
                          onUpgrade={handleUpgrade}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {indexOfFirstUser + 1}-{Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length} users
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User details modal */}
      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          isOpen={showUserModal}
          onClose={handleCloseModal}
          onUpgrade={handleUpgrade}
        />
      )}
    </>
  );
}
