'use client';

import { useState } from 'react';
import { Feature } from '@/lib/features/types';
import { UserType } from '@/lib/entitlements/types';
import { EditableLimitCell } from './EditableLimitCell';
import { dynamicRules } from '@/lib/entitlements/dynamic-rules';
import { useNotification } from '@/contexts/NotificationContext';
import { useStrings } from '@/contexts/LanguageContext';

interface FeatureAccess {
  allowed: boolean;
  limit: number;
}

interface FeatureMatrixRow {
  feature: Feature;
  access: Record<UserType, FeatureAccess>;
}

interface EditableFeatureMatrixProps {
  matrix: FeatureMatrixRow[];
  userTypes: UserType[];
  onUpdate: () => void;
  isEditMode: boolean;
}

export function EditableFeatureMatrix({
  matrix,
  userTypes,
  onUpdate,
  isEditMode
}: EditableFeatureMatrixProps) {
  const { showNotification } = useNotification();
  const strings = useStrings();
  const [editingCell, setEditingCell] = useState<{
    featureId: string;
    userType: UserType;
  } | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'planned'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter features
  const filteredMatrix = matrix.filter(row => {
    if (filter !== 'all' && row.feature.status !== filter) {
      return false;
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        row.feature.name.toLowerCase().includes(search) ||
        row.feature.description.toLowerCase().includes(search) ||
        row.feature.id.toLowerCase().includes(search)
      );
    }

    return true;
  });

  const activeFeatures = filteredMatrix.filter(row => row.feature.status === 'active');
  const plannedFeatures = filteredMatrix.filter(row => row.feature.status === 'planned');

  const handleLimitChange = async (
    featureId: string,
    userType: UserType,
    newValue: number,
    limitType: 'daily' | 'total'
  ) => {
    try {
      await dynamicRules.updateLimit(userType, featureId, limitType, newValue);
      showNotification({
        title: strings.admin.features.success,
        message: strings.admin.features.featureUpdated,
        type: 'success'
      });
      onUpdate();
    } catch (error) {
      showNotification({
        title: 'Error',
        message: strings.admin.features.failedToUpdate,
        type: 'error'
      });
      console.error('Error updating limit:', error);
    }
  };

  const getAccessDisplay = (access: FeatureAccess) => {
    if (!access.allowed) return { text: '❌', className: 'text-red-500' };
    if (access.limit === -1) return { text: '∞', className: 'text-green-500 font-bold text-lg' };
    if (access.limit === 0) return { text: '✅', className: 'text-green-500' };

    const limitText = access.limit > 0 ? `${access.limit}` : '✅';
    return { text: limitText, className: 'text-blue-600 font-medium' };
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      learning: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      games: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      storage: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
      system: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const renderFeatureRows = (features: FeatureMatrixRow[]) => {
    return features.map(row => (
      <tr key={row.feature.id} className="border-t hover:bg-muted/50 transition-colors">
        <td className="p-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">{row.feature.icon}</span>
            <div>
              <div className="font-medium">{row.feature.name}</div>
              <div className="text-sm text-muted-foreground">{row.feature.description}</div>
            </div>
          </div>
        </td>
        <td className="p-4">
          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getCategoryColor(row.feature.category)}`}>
            {row.feature.category}
          </span>
        </td>
        {userTypes.map(userType => {
          const access = row.access[userType];
          const display = getAccessDisplay(access);
          const isEditing = editingCell?.featureId === row.feature.id &&
                           editingCell?.userType === userType;
          const canEdit = isEditMode && access.allowed && row.feature.limitType !== 'none';

          return (
            <td
              key={userType}
              className={`p-4 text-center relative ${canEdit ? 'cursor-pointer hover:bg-muted/30' : ''}`}
              onClick={() => {
                if (canEdit && !isEditing) {
                  setEditingCell({ featureId: row.feature.id, userType });
                }
              }}
            >
              {isEditing ? (
                <EditableLimitCell
                  value={access.limit}
                  isEditing={true}
                  onChange={(newValue) => {
                    handleLimitChange(
                      row.feature.id,
                      userType,
                      newValue,
                      row.feature.limitType as 'daily' | 'total'
                    );
                  }}
                  onSave={() => setEditingCell(null)}
                  onCancel={() => setEditingCell(null)}
                  featureName={row.feature.name}
                  userType={userType}
                  limitType={row.feature.limitType as 'daily' | 'total'}
                />
              ) : (
                <>
                  <span className={display.className}>
                    {display.text}
                    {access.limit > 0 && row.feature.limitType === 'daily' && '/day'}
                    {access.limit > 0 && row.feature.limitType === 'total' && ' max'}
                  </span>
                  {canEdit && (
                    <span className="ml-1 text-xs text-muted-foreground">✏️</span>
                  )}
                </>
              )}
            </td>
          );
        })}
      </tr>
    ));
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {strings.admin.features.allFeatures}
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              filter === 'active'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {strings.admin.features.active}
          </button>
          <button
            onClick={() => setFilter('planned')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              filter === 'planned'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {strings.admin.features.planned}
          </button>
        </div>

        <div className="flex-1">
          <input
            type="text"
            placeholder={strings.forms.placeholders.searchFeatures}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1 border border-border rounded-lg bg-background text-foreground"
          />
        </div>

        {isEditMode && (
          <div className="text-sm text-muted-foreground">
            💡 {strings.admin.features.clickToEdit}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg overflow-hidden border">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-4 font-semibold">Feature</th>
              <th className="text-left p-4 font-semibold">Category</th>
              {userTypes.map(type => (
                <th key={type} className="text-center p-4 font-semibold capitalize">
                  {type}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeFeatures.length > 0 && (
              <>
                <tr>
                  <td colSpan={2 + userTypes.length} className="bg-muted/50 px-4 py-2 font-medium">
                    {strings.admin.features.activeFeatures} ({activeFeatures.length})
                  </td>
                </tr>
                {renderFeatureRows(activeFeatures)}
              </>
            )}

            {plannedFeatures.length > 0 && (
              <>
                <tr>
                  <td colSpan={2 + userTypes.length} className="bg-muted/50 px-4 py-2 font-medium">
                    🚧 {strings.admin.features.plannedFeatures} ({plannedFeatures.length})
                  </td>
                </tr>
                {renderFeatureRows(plannedFeatures)}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex gap-6 text-sm text-muted-foreground">
        <span>{strings.admin.features.notAvailable}</span>
        <span>{strings.admin.features.available}</span>
        <span>{strings.admin.features.unlimited} (-1)</span>
        <span>{strings.admin.features.numbers} = {strings.admin.features.dailyOrTotalLimits}</span>
        {isEditMode && <span>{strings.admin.features.clickToEdit}</span>}
      </div>
    </div>
  );
}
