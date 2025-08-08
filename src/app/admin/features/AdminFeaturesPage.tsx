'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/contexts/AdminContext';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { FeatureMatrixTable } from '@/components/admin/feature-matrix/FeatureMatrixTable';
import { EnhancedCategorizedFeatureMatrixTable } from '@/components/admin/feature-matrix/EnhancedCategorizedFeatureMatrixTable';
import { EditableFeatureMatrix } from '@/components/admin/feature-matrix/EditableFeatureMatrix';
import { FeatureMatrixStats } from '@/components/admin/feature-matrix/FeatureMatrixStats';
import { useFeatureMatrix } from '@/hooks/useFeatureMatrix';
import { useNotification } from '@/contexts/NotificationContext';
import { useStrings } from '@/contexts/LanguageContext';
import { LoadingHourglassPage } from '@/components/ui/LoadingHourglass';

export default function AdminFeaturesPage() {
  const strings = useStrings();
  const router = useRouter();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { data, isLoading, error, refresh } = useFeatureMatrix();
  const { showNotification } = useNotification();
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, adminLoading, router]);

  if (adminLoading || isLoading) {
    return (
      <AdminLayout title={strings.admin.featuresManagement}>
        <div className="h-64">
          <LoadingHourglassPage text="Loading features..." />
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  if (error) {
    return (
      <AdminLayout title={strings.admin.featuresManagement}>
        <div className="p-6">
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
            <p className="font-semibold">Error loading feature matrix</p>
            <p className="text-sm mt-1">{error.message}</p>
            <button
              onClick={refresh}
              className="mt-3 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90"
            >
              Try Again
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!data) {
    return null;
  }

  const handleExportCSV = () => {
    const headers = ['Feature', 'Category', 'Status', ...data.userTypes];
    const rows = data.matrix.map(row => {
      const cells = [
        row.feature.name,
        row.feature.category,
        row.feature.status,
        ...data.userTypes.map(userType => {
          const access = row.access[userType];
          if (!access.allowed) return 'No';
          if (access.limit === -1) return 'Unlimited';
          if (access.limit === 0) return 'Yes';
          return `${access.limit}${row.feature.limitType === 'daily' ? '/day' : ' max'}`;
        })
      ];
      return cells.join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feature-matrix-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feature-matrix-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    if (!isEditMode) {
      showNotification({
        title: strings.admin.features.editModeEnabled,
        message: strings.admin.features.clickToChange,
        type: 'info'
      });
    }
  };

  return (
    <AdminLayout title={strings.admin.features.title}>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 sm:mb-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">{strings.admin.features.title}</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                {strings.admin.features.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={toggleEditMode}
                className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base ${
                  isEditMode
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                }`}
              >
                <span className="text-base sm:text-lg">{isEditMode ? '💾' : '✏️'}</span>
                <span className="hidden sm:inline">{isEditMode ? strings.admin.features.saveMode : strings.admin.features.editLimits}</span>
                <span className="sm:hidden">{isEditMode ? 'Save' : 'Edit'}</span>
              </button>

              <button
                onClick={refresh}
                className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 text-sm sm:text-base"
                title={strings.forms.buttons.refresh}
              >
                <span className="text-base sm:text-lg">🔄</span>
                <span className="hidden sm:inline">{strings.forms.buttons.refresh}</span>
              </button>

              <div className="relative group">
                <button className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm sm:text-base">
                  <span className="text-base sm:text-lg">📥</span>
                  <span className="hidden sm:inline">{strings.forms.buttons.export}</span>
                  <span className="sm:hidden">Export</span>
                </button>

                <div className="absolute right-0 mt-2 w-40 bg-popover border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={handleExportCSV}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-muted rounded-t-lg"
                  >
                    {strings.admin.features.exportCsv}
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-muted rounded-b-lg"
                  >
                    {strings.admin.features.exportJson}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Last updated */}
          <p className="text-xs sm:text-sm text-muted-foreground">
            {strings.admin.features.lastUpdated}: {new Date(data.lastUpdated).toLocaleString()}
          </p>
        </div>

        {/* Stats */}
        <FeatureMatrixStats stats={data.stats} />

        {/* Feature Matrix Table */}
        {isEditMode ? (
          <EditableFeatureMatrix
            matrix={data.matrix}
            userTypes={data.userTypes}
            onUpdate={refresh}
            isEditMode={isEditMode}
          />
        ) : (
          <EnhancedCategorizedFeatureMatrixTable
            matrix={data.matrix}
            userTypes={data.userTypes}
          />
        )}

        {/* Info Box */}
        <div className="mt-6 p-3 sm:p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2 text-sm sm:text-base">
            {isEditMode ? strings.admin.features.editingLimits : strings.admin.features.understandingMatrix}
          </h3>
          {isEditMode ? (
            <ul className="text-xs sm:text-sm space-y-1 text-muted-foreground">
              <li>• Click on any number to edit the limit</li>
              <li>• Use -1 for unlimited access</li>
              <li>• Changes are saved immediately to the database</li>
              <li>• Users will see updated limits on their next action</li>
              <li>• Consider user behavior patterns when adjusting limits</li>
            </ul>
          ) : (
            <ul className="text-xs sm:text-sm space-y-1 text-muted-foreground">
              <li>• This matrix shows all features available in Doshi Sensei and their access levels</li>
              <li>• Limits are enforced automatically by the new access control system</li>
              <li>• Each feature has independent limits and usage tracking</li>
              <li>• Planned features are shown for future development reference</li>
              <li>• Click "Edit Limits" to dynamically adjust user limits</li>
            </ul>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
