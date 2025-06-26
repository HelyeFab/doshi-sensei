'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { UserSearch } from '@/components/admin/UserSearch';
import { UserTable } from '@/components/admin/UserTable';
import { useState } from 'react';
import { AdminUserDetails } from '@/types/admin';

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUserDetails | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'free' | 'premium' | 'active'>('all');

  const handleUserSelect = (user: AdminUserDetails) => {
    setSelectedUser(user);
  };

  const handleUserUpdate = (updatedUser: AdminUserDetails) => {
    // Handle user updates after premium upgrade, etc.
  };

  return (
    <AdminLayout title="User Management">
      <div className="space-y-6">
        {/* Page header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 sm:p-6 border border-blue-200 dark:border-blue-800">
          <h2 className="text-xl font-bold text-foreground mb-2">
            User Management
          </h2>
          <p className="text-muted-foreground">
            Search users, view details, and manage premium accounts from this interface.
          </p>
        </div>

        {/* Search and filters */}
        <UserSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterType={filterType}
          onFilterChange={setFilterType}
        />

        {/* User table */}
        <UserTable
          searchQuery={searchQuery}
          filterType={filterType}
          onUserSelect={handleUserSelect}
          onUserUpdate={handleUserUpdate}
          selectedUser={selectedUser}
        />
      </div>
    </AdminLayout>
  );
}
