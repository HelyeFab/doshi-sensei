'use client';

import React, { useState, useMemo } from 'react';
import { Feature } from '@/lib/features/types';
import { UserType } from '@/lib/entitlements/types';
import { ChevronDown, ChevronRight, Package, Gamepad2, Database, Settings, Search } from 'lucide-react';

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

interface CategoryGroup {
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  features: FeatureMatrixRow[];
  stats: {
    total: number;
    active: number;
    planned: number;
    unlimited: Record<UserType, number>;
    limited: Record<UserType, number>;
    blocked: Record<UserType, number>;
  };
}

export function CategorizedFeatureMatrixTable({ matrix, userTypes }: FeatureMatrixTableProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'planned'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['learning', 'games', 'storage', 'system']));
  const [hoveredCell, setHoveredCell] = useState<{ feature: string; userType: UserType } | null>(null);
  
  // Category configuration
  const categoryConfig = {
    learning: {
      name: 'Learning Features',
      icon: <Package className="w-4 h-4" />,
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      bgColor: 'bg-purple-50 dark:bg-purple-900/10',
      borderColor: 'border-purple-200 dark:border-purple-800'
    },
    games: {
      name: 'Games & Activities',
      icon: <Gamepad2 className="w-4 h-4" />,
      color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/10',
      borderColor: 'border-indigo-200 dark:border-indigo-800'
    },
    storage: {
      name: 'Storage & Lists',
      icon: <Database className="w-4 h-4" />,
      color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
      bgColor: 'bg-cyan-50 dark:bg-cyan-900/10',
      borderColor: 'border-cyan-200 dark:border-cyan-800'
    },
    system: {
      name: 'System Features',
      icon: <Settings className="w-4 h-4" />,
      color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      bgColor: 'bg-amber-50 dark:bg-amber-900/10',
      borderColor: 'border-amber-200 dark:border-amber-800'
    }
  };
  
  // Filter features
  const filteredMatrix = useMemo(() => {
    return matrix.filter(row => {
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
  }, [matrix, filter, searchTerm]);
  
  // Group features by category and calculate stats
  const categorizedFeatures = useMemo(() => {
    const groups: Record<string, CategoryGroup> = {};
    
    // Initialize groups
    Object.keys(categoryConfig).forEach(category => {
      const config = categoryConfig[category as keyof typeof categoryConfig];
      groups[category] = {
        name: config.name,
        icon: config.icon,
        color: config.color,
        bgColor: config.bgColor,
        borderColor: config.borderColor,
        features: [],
        stats: {
          total: 0,
          active: 0,
          planned: 0,
          unlimited: Object.fromEntries(userTypes.map(t => [t, 0])) as Record<UserType, number>,
          limited: Object.fromEntries(userTypes.map(t => [t, 0])) as Record<UserType, number>,
          blocked: Object.fromEntries(userTypes.map(t => [t, 0])) as Record<UserType, number>
        }
      };
    });
    
    // Group features and calculate stats
    filteredMatrix.forEach(row => {
      const category = row.feature.category || 'system';
      if (!groups[category]) {
        groups[category] = {
          name: category,
          icon: <Package className="w-4 h-4" />,
          color: 'bg-gray-100 text-gray-800',
          bgColor: 'bg-gray-50 dark:bg-gray-900/10',
          borderColor: 'border-gray-200 dark:border-gray-800',
          features: [],
          stats: {
            total: 0,
            active: 0,
            planned: 0,
            unlimited: Object.fromEntries(userTypes.map(t => [t, 0])) as Record<UserType, number>,
            limited: Object.fromEntries(userTypes.map(t => [t, 0])) as Record<UserType, number>,
            blocked: Object.fromEntries(userTypes.map(t => [t, 0])) as Record<UserType, number>
          }
        };
      }
      
      groups[category].features.push(row);
      groups[category].stats.total++;
      
      if (row.feature.status === 'active') {
        groups[category].stats.active++;
      } else if (row.feature.status === 'planned') {
        groups[category].stats.planned++;
      }
      
      // Calculate access stats
      userTypes.forEach(userType => {
        const access = row.access[userType];
        if (!access.allowed) {
          groups[category].stats.blocked[userType]++;
        } else if (access.limit === -1) {
          groups[category].stats.unlimited[userType]++;
        } else {
          groups[category].stats.limited[userType]++;
        }
      });
    });
    
    return groups;
  }, [filteredMatrix, userTypes]);
  
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };
  
  const toggleAllCategories = () => {
    if (expandedCategories.size === Object.keys(categoryConfig).length) {
      setExpandedCategories(new Set());
    } else {
      setExpandedCategories(new Set(Object.keys(categoryConfig)));
    }
  };
  
  const getAccessDisplay = (access: FeatureAccess) => {
    if (!access.allowed) return { text: '❌', className: 'text-red-500' };
    if (access.limit === -1) return { text: '∞', className: 'text-green-500 font-bold sm:text-lg' };
    if (access.limit === 0) return { text: '✅', className: 'text-green-500' };
    
    const limitText = access.limit > 0 ? `${access.limit}` : '✅';
    return { text: limitText, className: 'text-blue-600 font-medium' };
  };
  
  const renderFeatureRow = (row: FeatureMatrixRow) => (
    <tr key={row.feature.id} className="border-t hover:bg-muted/50 transition-colors">
      <td className="p-2 sm:p-4 pl-12">
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="text-base sm:text-xl">{row.feature.icon}</span>
          <div>
            <div className="font-medium text-xs sm:text-sm flex items-center gap-2">
              {row.feature.name}
              {row.feature.status === 'planned' && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                  Planned
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground hidden sm:block">{row.feature.description}</div>
          </div>
        </div>
      </td>
      {userTypes.map(userType => {
        const access = row.access[userType];
        const display = getAccessDisplay(access);
        const isHovered = hoveredCell?.feature === row.feature.id && hoveredCell?.userType === userType;
        
        return (
          <td 
            key={userType} 
            className="p-2 sm:p-4 text-center relative"
            onMouseEnter={() => setHoveredCell({ feature: row.feature.id, userType })}
            onMouseLeave={() => setHoveredCell(null)}
          >
            <span className={`${display.className} text-xs sm:text-sm`}>
              {display.text}
              <span className="hidden sm:inline">
                {access.limit > 0 && row.feature.limitType === 'daily' && '/day'}
                {access.limit > 0 && row.feature.limitType === 'total' && ' max'}
              </span>
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
  );
  
  return (
    <div className="space-y-4">
      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 sm:px-3 py-1 rounded-lg transition-colors text-sm sm:text-base ${
              filter === 'all' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-2 sm:px-3 py-1 rounded-lg transition-colors text-sm sm:text-base ${
              filter === 'active' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('planned')}
            className={`px-2 sm:px-3 py-1 rounded-lg transition-colors text-sm sm:text-base ${
              filter === 'planned' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            Planned
          </button>
        </div>
        
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search features..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1 rounded-lg border bg-background text-sm sm:text-base"
            />
          </div>
          
          <button
            onClick={toggleAllCategories}
            className="px-3 py-1 rounded-lg border bg-background hover:bg-muted transition-colors text-sm"
            title={expandedCategories.size === Object.keys(categoryConfig).length ? "Collapse All" : "Expand All"}
          >
            {expandedCategories.size === Object.keys(categoryConfig).length ? "Collapse All" : "Expand All"}
          </button>
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(categorizedFeatures).map(([category, group]) => {
          if (group.features.length === 0) return null;
          
          // Use group properties directly (they're already set from config or defaults)
          return (
            <div key={category} className={`p-3 rounded-lg border ${group.borderColor} ${group.bgColor}`}>
              <div className="flex items-center gap-2 mb-1">
                {group.icon}
                <span className="font-medium text-sm">{group.name}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {group.stats.active} active, {group.stats.planned} planned
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Categorized Table */}
      <div className="bg-card rounded-lg border overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-muted sticky top-0 z-10">
            <tr>
              <th className="text-left p-2 sm:p-4 font-semibold text-xs sm:text-sm">Feature</th>
              {userTypes.map(type => (
                <th key={type} className="text-center p-2 sm:p-4 font-semibold capitalize text-xs sm:text-sm min-w-[80px]">
                  {type}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(categorizedFeatures).map(([category, group]) => {
              if (group.features.length === 0) return null;
              
              const isExpanded = expandedCategories.has(category);
              
              return (
                <React.Fragment key={category}>
                  {/* Category Header */}
                  <tr 
                    className={`${group.bgColor} border-t-2 ${group.borderColor} cursor-pointer hover:opacity-90 transition-opacity`}
                    onClick={() => toggleCategory(category)}
                  >
                    <td colSpan={1 + userTypes.length} className="px-2 sm:px-4 py-2 sm:py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          {group.icon}
                          <span className="font-semibold text-sm sm:text-base">{group.name}</span>
                          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${group.color}`}>
                            {group.features.length} features
                          </span>
                        </div>
                        
                        {/* Quick stats for each user type */}
                        <div className="hidden md:flex gap-4 text-xs">
                          {userTypes.map(userType => (
                            <div key={userType} className="flex items-center gap-1">
                              <span className="font-medium capitalize">{userType}:</span>
                              <span className="text-green-600">∞{group.stats.unlimited[userType]}</span>
                              <span className="text-blue-600">#{group.stats.limited[userType]}</span>
                              <span className="text-red-600">✗{group.stats.blocked[userType]}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Category Features */}
                  {isExpanded && group.features.map(row => renderFeatureRow(row))}
                </React.Fragment>
              );
            })}
            
            {/* No results message */}
            {Object.values(categorizedFeatures).every(group => group.features.length === 0) && (
              <tr>
                <td colSpan={1 + userTypes.length} className="text-center py-8 text-muted-foreground">
                  No features found matching your criteria
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
        <span>❌ Not Available</span>
        <span>✅ Available</span>
        <span>∞ Unlimited</span>
        <span className="hidden sm:inline">Numbers = Daily/Total Limits</span>
        <span className="sm:hidden">## = Limits</span>
      </div>
    </div>
  );
}