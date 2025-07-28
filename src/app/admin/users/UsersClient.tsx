'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { UserSearch } from '@/components/admin/UserSearch';
import { UserTable } from '@/components/admin/UserTable';
import { useState } from 'react';
import { AdminUserDetails } from '@/types/admin';
import { useStrings } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';

export default function UsersClient() {
  const strings = useStrings();
  const router = useRouter();
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
    <AdminLayout title={strings.admin.userManagement}>

      <div className="space-y-6">
        {/* Page header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 sm:p-6 border border-blue-200 dark:border-blue-800">
          <h2 className="text-xl font-bold text-foreground mb-2">
            {strings.admin.userManagement}
          </h2>
          <p className="text-muted-foreground">
            {strings.admin.userManagementDescription}
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
