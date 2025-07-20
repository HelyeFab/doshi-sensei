'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { UserSearch } from '@/components/admin/UserSearch';
import { UserTable } from '@/components/admin/UserTable';
import { useState } from 'react';
import { AdminUserDetails } from '@/types/admin';
import { useStrings } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';

export default function UsersPage() {
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
    <AdminLayout title={strings.admin.userManagement} hideHeader={true}>
      {/* Virtual Companion Section - 1/6th of screen height */}
      <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />

        {/* Gradient to White Fade */}
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Back Button */}
      <div className="px-4 sm:px-6 pt-4 mb-6">
        <button
          onClick={() => router.push('/admin')}
          className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors inline-flex items-center justify-center"
          aria-label="Back to admin dashboard"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

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
