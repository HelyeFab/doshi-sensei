'use client';

import { useState } from 'react';

interface UserSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterType: 'all' | 'free' | 'premium' | 'active';
  onFilterChange: (filter: 'all' | 'free' | 'premium' | 'active') => void;
}

export function UserSearch({
  searchQuery,
  onSearchChange,
  filterType,
  onFilterChange,
}: UserSearchProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const filterOptions = [
    { value: 'all', label: 'All Users', icon: '👥' },
    { value: 'free', label: 'Free Users', icon: '🆓' },
    { value: 'premium', label: 'Premium Users', icon: '⭐' },
    { value: 'active', label: 'Active Today', icon: '⚡' },
  ] as const;

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
      <div className="space-y-4">
        {/* Main search bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="user-search" className="sr-only">
              Search users
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                id="user-search"
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="px-4 py-2 border border-border rounded-lg bg-background text-foreground hover:bg-muted transition-colors flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z"
              />
            </svg>
            Filters
            <svg
              className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onFilterChange(option.value)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                ${filterType === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }
              `}
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>

        {/* Advanced filters (collapsible) */}
        {showAdvancedFilters && (
          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-medium text-foreground mb-3">Advanced Filters</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Registration Date
                </label>
                <select className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground">
                  <option value="">Any time</option>
                  <option value="today">Today</option>
                  <option value="week">This week</option>
                  <option value="month">This month</option>
                  <option value="year">This year</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Last Activity
                </label>
                <select className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground">
                  <option value="">Any time</option>
                  <option value="today">Today</option>
                  <option value="week">This week</option>
                  <option value="month">This month</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Subscription Type
                </label>
                <select className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground">
                  <option value="">All subscriptions</option>
                  <option value="free">Free</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Sort By
                </label>
                <select className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground">
                  <option value="created_desc">Newest first</option>
                  <option value="created_asc">Oldest first</option>
                  <option value="activity_desc">Most active</option>
                  <option value="email_asc">Email A-Z</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Search results summary */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            {searchQuery && (
              <span>
                Searching for: <strong className="text-foreground">"{searchQuery}"</strong>
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span>Filter: <strong className="text-foreground">{filterOptions.find(f => f.value === filterType)?.label}</strong></span>
            {(searchQuery || filterType !== 'all') && (
              <button
                onClick={() => {
                  onSearchChange('');
                  onFilterChange('all');
                }}
                className="text-primary hover:text-primary/80 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
