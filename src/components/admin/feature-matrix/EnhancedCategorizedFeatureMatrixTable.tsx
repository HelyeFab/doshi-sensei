'use client';

import React, { useState, useMemo } from 'react';
import { Feature } from '@/lib/features/types';
import { UserType } from '@/lib/entitlements/types';
import { 
  ChevronDown, 
  ChevronRight, 
  BookOpen,
  Brush,
  Brain,
  Gamepad2, 
  Database, 
  Settings, 
  Search,
  Volume2,
  Languages,
  FileText,
  Users
} from 'lucide-react';

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

// Enhanced categorization function
function getCategoryForFeature(feature: Feature): string {
  const id = feature.id.toLowerCase();
  const name = feature.name.toLowerCase();
  const desc = feature.description.toLowerCase();
  
  // Kanji-specific features
  if (id.includes('kanji') || name.includes('kanji') || desc.includes('kanji')) {
    return 'kanji';
  }
  
  // Kana-specific features
  if (id.includes('kana') || id.includes('hiragana') || id.includes('katakana')) {
    return 'kana';
  }
  
  // Vocabulary features
  if (id.includes('vocabulary') || id.includes('word') || id.includes('flashcard')) {
    return 'vocabulary';
  }
  
  // Reading features
  if (id.includes('reading') || id.includes('article') || id.includes('story') || id.includes('news')) {
    return 'reading';
  }
  
  // Audio/Speaking features
  if (id.includes('listening') || id.includes('speaking') || id.includes('shadowing') || id.includes('audio')) {
    return 'audio';
  }
  
  // Grammar features
  if (id.includes('grammar') || id.includes('conjugation') || id.includes('drill')) {
    return 'grammar';
  }
  
  // Games (if not caught by other categories)
  if (feature.category === 'games') {
    return 'games';
  }
  
  // Storage features
  if (feature.category === 'storage') {
    return 'storage';
  }
  
  // System features
  if (feature.category === 'system') {
    return 'system';
  }
  
  // Default to general learning
  return 'general';
}

export function EnhancedCategorizedFeatureMatrixTable({ matrix, userTypes }: FeatureMatrixTableProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'planned'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['kanji', 'kana', 'vocabulary', 'grammar', 'reading', 'audio', 'games', 'general', 'storage', 'system'])
  );
  const [hoveredCell, setHoveredCell] = useState<{ feature: string; userType: UserType } | null>(null);
  
  // Enhanced category configuration
  const categoryConfig = {
    kanji: {
      name: 'Kanji Learning',
      icon: <Brush className="w-4 h-4" />,
      color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      bgColor: 'bg-red-50 dark:bg-red-900/10',
      borderColor: 'border-red-200 dark:border-red-800',
      order: 1
    },
    kana: {
      name: 'Kana (Hiragana/Katakana)',
      icon: <Languages className="w-4 h-4" />,
      color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
      bgColor: 'bg-pink-50 dark:bg-pink-900/10',
      borderColor: 'border-pink-200 dark:border-pink-800',
      order: 2
    },
    vocabulary: {
      name: 'Vocabulary & Words',
      icon: <BookOpen className="w-4 h-4" />,
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      bgColor: 'bg-purple-50 dark:bg-purple-900/10',
      borderColor: 'border-purple-200 dark:border-purple-800',
      order: 3
    },
    grammar: {
      name: 'Grammar & Conjugation',
      icon: <FileText className="w-4 h-4" />,
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      bgColor: 'bg-blue-50 dark:bg-blue-900/10',
      borderColor: 'border-blue-200 dark:border-blue-800',
      order: 4
    },
    reading: {
      name: 'Reading Practice',
      icon: <FileText className="w-4 h-4" />,
      color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      bgColor: 'bg-green-50 dark:bg-green-900/10',
      borderColor: 'border-green-200 dark:border-green-800',
      order: 5
    },
    audio: {
      name: 'Listening & Speaking',
      icon: <Volume2 className="w-4 h-4" />,
      color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
      bgColor: 'bg-teal-50 dark:bg-teal-900/10',
      borderColor: 'border-teal-200 dark:border-teal-800',
      order: 6
    },
    games: {
      name: 'Games & Activities',
      icon: <Gamepad2 className="w-4 h-4" />,
      color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/10',
      borderColor: 'border-indigo-200 dark:border-indigo-800',
      order: 7
    },
    general: {
      name: 'General Learning',
      icon: <Brain className="w-4 h-4" />,
      color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      bgColor: 'bg-orange-50 dark:bg-orange-900/10',
      borderColor: 'border-orange-200 dark:border-orange-800',
      order: 8
    },
    storage: {
      name: 'Storage & Lists',
      icon: <Database className="w-4 h-4" />,
      color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
      bgColor: 'bg-cyan-50 dark:bg-cyan-900/10',
      borderColor: 'border-cyan-200 dark:border-cyan-800',
      order: 9
    },
    system: {
      name: 'System Features',
      icon: <Settings className="w-4 h-4" />,
      color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      bgColor: 'bg-amber-50 dark:bg-amber-900/10',
      borderColor: 'border-amber-200 dark:border-amber-800',
      order: 10
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
  
  // Group features by enhanced categories
  const categorizedFeatures = useMemo(() => {
    const groups: Record<string, CategoryGroup> = {};
    
    // Initialize all groups
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
    
    // Categorize and group features
    filteredMatrix.forEach(row => {
      const category = getCategoryForFeature(row.feature);
      
      if (!groups[category]) {
        // Fallback to general if category not found
        groups.general.features.push(row);
        groups.general.stats.total++;
        if (row.feature.status === 'active') groups.general.stats.active++;
        if (row.feature.status === 'planned') groups.general.stats.planned++;
      } else {
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
      }
    });
    
    // Sort groups by order
    const sortedGroups: Record<string, CategoryGroup> = {};
    Object.entries(groups)
      .sort((a, b) => {
        const orderA = categoryConfig[a[0] as keyof typeof categoryConfig]?.order || 999;
        const orderB = categoryConfig[b[0] as keyof typeof categoryConfig]?.order || 999;
        return orderA - orderB;
      })
      .forEach(([key, value]) => {
        if (value.features.length > 0) {
          sortedGroups[key] = value;
        }
      });
    
    return sortedGroups;
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
    if (expandedCategories.size === Object.keys(categorizedFeatures).length) {
      setExpandedCategories(new Set());
    } else {
      setExpandedCategories(new Set(Object.keys(categorizedFeatures)));
    }
  };
  
  const getAccessDisplay = (access: FeatureAccess, feature: Feature, userType: UserType) => {
    // ALWAYS prioritize showing the actual limit if one exists
    // This ensures consistency across all features
    
    // First, check if there's a limit defined
    if (access.limit !== undefined && access.limit !== null) {
      // For guests with auth-required features, show lock with limit
      if (feature.requiresAuth && userType === 'guest') {
        if (access.limit === -1) {
          return { text: '🔒∞', className: 'text-gray-500', tooltip: 'Unlimited (requires login)' };
        } else if (access.limit === 0) {
          return { text: '🔒', className: 'text-gray-500', tooltip: 'Requires login' };
        } else if (access.limit > 0) {
          return { 
            text: `🔒${access.limit}`, 
            className: 'text-gray-500', 
            tooltip: `${access.limit} per day (requires login)` 
          };
        }
      }
      
      // For all other users (including free with auth features), show the actual limit
      if (access.limit === -1) {
        return { text: '∞', className: 'text-green-500 font-bold sm:text-lg', tooltip: 'Unlimited access' };
      } else if (access.limit === 0) {
        // Zero could mean "no limit" or "no access" - check access.allowed
        if (access.allowed || feature.requiresAuth) {
          return { text: '✅', className: 'text-green-500', tooltip: 'Full access' };
        } else {
          return { text: '❌', className: 'text-red-500', tooltip: 'Not available' };
        }
      } else if (access.limit > 0) {
        // Positive limit - always show the number
        return { 
          text: `${access.limit}`, 
          className: 'text-blue-600 font-medium',
          tooltip: `${access.limit} per ${feature.limitType === 'daily' ? 'day' : 'total'}`
        };
      }
    }
    
    // Fallback: No limit defined, use access.allowed
    if (access.allowed) {
      return { text: '✅', className: 'text-green-500', tooltip: 'Available' };
    } else {
      // Check why it's not allowed
      if (feature.requiresAuth && userType === 'guest') {
        return { text: '🔒', className: 'text-gray-500', tooltip: 'Requires login' };
      } else if (feature.requiresSubscription) {
        return { text: '💎', className: 'text-purple-500', tooltip: 'Premium only' };
      } else {
        return { text: '❌', className: 'text-red-500', tooltip: 'Not available' };
      }
    }
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
              {row.feature.requiresAuth && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400">
                  Auth
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground hidden sm:block">{row.feature.description}</div>
          </div>
        </div>
      </td>
      {userTypes.map(userType => {
        const access = row.access[userType];
        const display = getAccessDisplay(access, row.feature, userType);
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
                  {display.tooltip || (
                    (() => {
                      // For auth-required features with limits set
                      if (row.feature.requiresAuth && access.limit !== undefined && access.limit !== null) {
                        if (userType === 'guest') {
                          return `${access.limit === -1 ? 'Unlimited' : access.limit + ' per day'} (requires login)`;
                        }
                        // For logged-in users, show the actual limit
                        if (access.limit === -1) return 'Unlimited access';
                        if (access.limit > 0) return row.feature.limitType === 'daily' ? `${access.limit} per day` : `${access.limit} maximum`;
                        if (access.limit === 0) return 'Full access';
                      }
                      
                      // Standard tooltip logic
                      if (access.allowed) {
                        if (access.limit === -1) return 'Unlimited access';
                        if (access.limit > 0) return row.feature.limitType === 'daily' ? `${access.limit} per day` : `${access.limit} maximum`;
                        if (access.limit === 0) return 'Full access';
                      } else {
                        if (row.feature.requiresAuth && userType === 'guest') return 'Requires login';
                        if (row.feature.requiresSubscription) return 'Premium only';
                        return 'Not available';
                      }
                    })()
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
  
  // Calculate summary stats
  const totalFeatures = Object.values(categorizedFeatures).reduce((sum, cat) => sum + cat.features.length, 0);
  const activeFeatures = Object.values(categorizedFeatures).reduce((sum, cat) => sum + cat.stats.active, 0);
  
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
            All ({totalFeatures})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-2 sm:px-3 py-1 rounded-lg transition-colors text-sm sm:text-base ${
              filter === 'active' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            Active ({activeFeatures})
          </button>
          <button
            onClick={() => setFilter('planned')}
            className={`px-2 sm:px-3 py-1 rounded-lg transition-colors text-sm sm:text-base ${
              filter === 'planned' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            Planned ({totalFeatures - activeFeatures})
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
            title={expandedCategories.size === Object.keys(categorizedFeatures).length ? "Collapse All" : "Expand All"}
          >
            {expandedCategories.size === Object.keys(categorizedFeatures).length ? "Collapse All" : "Expand All"}
          </button>
        </div>
      </div>
      
      {/* Summary Stats Grid - Interactive Category Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {Object.entries(categorizedFeatures).map(([category, group]) => {
          if (group.features.length === 0) return null;
          
          // Calculate aggregate limits for this category
          const categoryLimits = userTypes.map(userType => {
            const unlimited = group.stats.unlimited[userType];
            const limited = group.stats.limited[userType];
            const blocked = group.stats.blocked[userType];
            
            // Find the most common limit value for limited features
            const limitValues: Record<number, number> = {};
            group.features.forEach(feature => {
              const limit = feature.access[userType].limit;
              if (limit > 0) {
                limitValues[limit] = (limitValues[limit] || 0) + 1;
              }
            });
            
            const mostCommonLimit = Object.entries(limitValues).sort((a, b) => b[1] - a[1])[0]?.[0];
            
            return {
              userType,
              unlimited,
              limited,
              blocked,
              commonLimit: mostCommonLimit ? parseInt(mostCommonLimit) : null,
              hasAccess: unlimited > 0 || limited > 0
            };
          });
          
          return (
            <button
              key={category}
              onClick={() => {
                // Scroll to the category section
                const categoryRow = document.getElementById(`category-${category}`);
                if (categoryRow) {
                  categoryRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  // Flash the category to highlight it
                  categoryRow.classList.add('animate-pulse');
                  setTimeout(() => categoryRow.classList.remove('animate-pulse'), 2000);
                }
                // Also expand the category if it's collapsed
                if (!expandedCategories.has(category)) {
                  toggleCategory(category);
                }
              }}
              className={`p-2 rounded-lg border ${group.borderColor} ${group.bgColor} hover:shadow-md transition-all cursor-pointer text-left`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {group.icon}
                <span className="font-medium text-xs truncate">{group.name}</span>
              </div>
              <div className="text-xs text-muted-foreground mb-1">
                {group.features.length} features
              </div>
              
              {/* Show limit summary per user type */}
              <div className="grid grid-cols-2 gap-1">
                {userTypes.map(userType => {
                  const unlimited = group.stats.unlimited[userType];
                  const limited = group.stats.limited[userType];
                  const blocked = group.stats.blocked[userType];
                  
                  // Collect all limit values for this user type
                  const limits: number[] = [];
                  group.features.forEach(feature => {
                    const limit = feature.access[userType].limit;
                    if (limit > 0) limits.push(limit);
                  });
                  
                  // Determine display based on the data
                  let displayText = '';
                  let colorClass = '';
                  let tooltip = '';
                  
                  if (blocked === group.features.length) {
                    // All features blocked
                    displayText = '✗';
                    colorClass = 'text-red-600';
                    tooltip = `All ${group.features.length} features blocked`;
                  } else if (unlimited === group.features.length) {
                    // All features unlimited
                    displayText = '∞';
                    colorClass = 'text-green-600';
                    tooltip = `All ${group.features.length} features unlimited`;
                  } else if (unlimited > 0 && limited === 0 && blocked === 0) {
                    // Only unlimited features
                    displayText = '∞';
                    colorClass = 'text-green-600';
                    tooltip = `${unlimited} features unlimited`;
                  } else if (limits.length > 0) {
                    // Mix of limited features - show range or common value
                    const minLimit = Math.min(...limits);
                    const maxLimit = Math.max(...limits);
                    
                    if (minLimit === maxLimit) {
                      displayText = String(minLimit);
                      colorClass = 'text-blue-600';
                      tooltip = `${limited} features with ${minLimit}/day limit`;
                    } else {
                      displayText = `${minLimit}-${maxLimit}`;
                      colorClass = 'text-blue-600';
                      tooltip = `Limits range from ${minLimit} to ${maxLimit}/day`;
                    }
                    
                    // Add unlimited count if any
                    if (unlimited > 0) {
                      displayText = `∞+${displayText}`;
                      tooltip += `, ${unlimited} unlimited`;
                    }
                  } else if (unlimited > 0) {
                    // Some unlimited, no specific limits
                    displayText = `∞(${unlimited})`;
                    colorClass = 'text-green-600';
                    tooltip = `${unlimited} of ${group.features.length} features unlimited`;
                  } else {
                    // Mixed or no access
                    displayText = '—';
                    colorClass = 'text-gray-500';
                    tooltip = 'No access or mixed permissions';
                  }
                  
                  // Shortened user type labels
                  const userTypeLabel = userType === 'monthly' ? 'M' : 
                                       userType === 'yearly' ? 'Y' : 
                                       userType === 'guest' ? 'G' : 
                                       userType === 'free' ? 'F' : userType[0].toUpperCase();
                  
                  return (
                    <div
                      key={userType}
                      className="flex items-center gap-1 text-xs"
                      title={`${userType}: ${tooltip}`}
                    >
                      <span className="font-medium text-muted-foreground">{userTypeLabel}:</span>
                      <span className={`font-semibold ${colorClass}`}>{displayText}</span>
                    </div>
                  );
                })}
              </div>
            </button>
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
              const isExpanded = expandedCategories.has(category);
              
              return (
                <React.Fragment key={category}>
                  {/* Category Header */}
                  <tr 
                    id={`category-${category}`}
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
                            {group.features.length}
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
            {Object.values(categorizedFeatures).length === 0 && (
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
        <span>🔒 Requires Login</span>
        <span>✅ Available</span>
        <span>∞ Unlimited</span>
        <span className="hidden sm:inline">Numbers = Daily/Total Limits</span>
        <span className="sm:hidden">## = Limits</span>
      </div>
    </div>
  );
}