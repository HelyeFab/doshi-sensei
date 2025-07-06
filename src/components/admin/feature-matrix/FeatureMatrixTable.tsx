'use client';

import { useState } from 'react';
import { Feature } from '@/lib/features/types';
import { UserType } from '@/lib/entitlements/types';

interface FeatureAccess {
  allowed: boolean;
  limit: number;
}

interface FeatureMatrixRow {
  feature: Feature;
  access: Record<UserType, FeatureAccess>;
}

interface FeatureMatrixTableProps {
  matrix: FeatureMatrixRow[];
  userTypes: UserType[];
}

export function FeatureMatrixTable({ matrix, userTypes }: FeatureMatrixTableProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'planned'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredCell, setHoveredCell] = useState<{ feature: string; userType: UserType } | null>(null);
  
  // Filter features
  const filteredMatrix = matrix.filter(row => {
    // Status filter
    if (filter !== 'all' && row.feature.status !== filter) {
      return false;
    }
    
    // Search filter
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
  
  // Group by status
  const activeFeatures = filteredMatrix.filter(row => row.feature.status === 'active');
  const plannedFeatures = filteredMatrix.filter(row => row.feature.status === 'planned');
  
  const getAccessDisplay = (access: FeatureAccess) => {
    if (!access.allowed) return { text: '❌', className: 'text-red-500' };
    if (access.limit === -1) return { text: '∞', className: 'text-green-500 font-bold text-lg' };
    if (access.limit === 0) return { text: '✅', className: 'text-green-500' };
    
    // Format limit display
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
          const isHovered = hoveredCell?.feature === row.feature.id && hoveredCell?.userType === userType;
          
          return (
            <td 
              key={userType} 
              className="p-4 text-center relative"
              onMouseEnter={() => setHoveredCell({ feature: row.feature.id, userType })}
              onMouseLeave={() => setHoveredCell(null)}
            >
              <span className={display.className}>
                {display.text}
                {access.limit > 0 && row.feature.limitType === 'daily' && '/day'}
                {access.limit > 0 && row.feature.limitType === 'total' && ' max'}
              </span>
              
              {/* Hover tooltip */}
              {isHovered && (
                <div className="absolute z-10 bg-popover text-popover-foreground border rounded-lg p-3 shadow-lg -top-2 left-1/2 transform -translate-x-1/2 -translate-y-full whitespace-nowrap">
                  <div className="font-medium mb-1">{row.feature.name} - {userType}</div>
                  <div className="text-sm">
                    {access.allowed ? (
                      <>
                        {access.limit === -1 && 'Unlimited access'}
                        {access.limit > 0 && row.feature.limitType === 'daily' && `${access.limit} per day`}
                        {access.limit > 0 && row.feature.limitType === 'total' && `${access.limit} maximum`}
                        {access.limit === 0 && 'Full access'}
                      </>
                    ) : (
                      <>
                        {row.feature.requiresAuth && userType === 'guest' && 'Requires login'}
                        {row.feature.requiresSubscription && 'Premium only'}
                        {!row.feature.requiresAuth && !row.feature.requiresSubscription && 'Not available'}
                      </>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                    <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-popover"></div>
                  </div>
                </div>
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
            All Features
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              filter === 'active' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('planned')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              filter === 'planned' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            Planned
          </button>
        </div>
        
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search features..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-xs px-3 py-1 rounded-lg border bg-background"
          />
        </div>
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
                    Active Features ({activeFeatures.length})
                  </td>
                </tr>
                {renderFeatureRows(activeFeatures)}
              </>
            )}
            
            {plannedFeatures.length > 0 && (
              <>
                <tr>
                  <td colSpan={2 + userTypes.length} className="bg-muted/50 px-4 py-2 font-medium">
                    🚧 Planned Features ({plannedFeatures.length})
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
        <span>❌ Not Available</span>
        <span>✅ Available</span>
        <span>∞ Unlimited</span>
        <span>Numbers = Daily/Total Limits</span>
      </div>
    </div>
  );
}