'use client';

import { useState } from 'react';
import { DailyGoalSlider } from '@/components/DailyGoalSlider';

interface DrillSettingsDropdownProps {
  dailyGoal: number;
  onDailyGoalChange: (value: number) => void;
  wordTypeFilter: 'all' | 'verbs' | 'adjectives';
  onWordTypeFilterChange: (filter: 'all' | 'verbs' | 'adjectives') => void;
  drillMode: 'random' | 'lists';
  onDrillModeChange: (mode: 'random' | 'lists') => void;
  autoAdvance: boolean;
  onAutoAdvanceChange: (checked: boolean) => void;
  conjugableLists: any[];
  selectedLists: string[];
  onListToggle: (listId: string) => void;
}

export default function DrillSettingsDropdown({
  dailyGoal,
  onDailyGoalChange,
  wordTypeFilter,
  onWordTypeFilterChange,
  drillMode,
  onDrillModeChange,
  autoAdvance,
  onAutoAdvanceChange,
  conjugableLists,
  selectedLists,
  onListToggle,
}: DrillSettingsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden mb-6">
      {/* Settings Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-card border border-border rounded-lg p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚙️</span>
          <div className="text-left">
            <div className="font-medium text-foreground">Drill Settings</div>
            <div className="text-sm text-muted-foreground">
              {dailyGoal} questions • {wordTypeFilter === 'all' ? 'All types' : wordTypeFilter === 'verbs' ? 'Verbs' : 'Adjectives'} • {drillMode === 'random' ? 'Random' : 'My Lists'}
            </div>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="mt-2 bg-card border border-border rounded-lg p-4 space-y-6">
          {/* Daily Goal */}
          <div>
            <div className="text-sm font-medium text-foreground mb-3">Daily Goal</div>
            <DailyGoalSlider 
              value={dailyGoal} 
              onChange={onDailyGoalChange}
            />
          </div>

          {/* Practice Type */}
          <div>
            <div className="text-sm font-medium text-foreground mb-3">Practice Type</div>
            <div className="grid grid-cols-3 gap-2">
              {(['all', 'verbs', 'adjectives'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => onWordTypeFilterChange(filter)}
                  className={`py-2 px-3 rounded-lg border text-sm transition-colors ${
                    wordTypeFilter === filter
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-input hover:bg-muted'
                  }`}
                >
                  {filter === 'all' ? 'All' : filter === 'verbs' ? 'Verbs' : 'Adjectives'}
                </button>
              ))}
            </div>
          </div>

          {/* Drill Mode */}
          <div>
            <div className="text-sm font-medium text-foreground mb-3">Drill Mode</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onDrillModeChange('random')}
                className={`py-2 px-3 rounded-lg border text-sm transition-colors ${
                  drillMode === 'random'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-input hover:bg-muted'
                }`}
              >
                Random
              </button>
              <button
                onClick={() => onDrillModeChange('lists')}
                className={`py-2 px-3 rounded-lg border text-sm transition-colors ${
                  drillMode === 'lists'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-input hover:bg-muted'
                }`}
              >
                My Lists ({conjugableLists.length})
              </button>
            </div>
          </div>

          {/* List Selection (when lists mode is selected) */}
          {drillMode === 'lists' && (
            <div>
              <div className="text-sm font-medium text-foreground mb-3">Select Lists</div>
              {conjugableLists.length > 0 ? (
                <div className="max-h-48 overflow-y-auto space-y-2 bg-muted/30 rounded-lg p-2">
                  {conjugableLists.map((list) => (
                    <label key={list.id} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-muted/50">
                      <input
                        type="checkbox"
                        checked={selectedLists.includes(list.id)}
                        onChange={() => onListToggle(list.id)}
                        className="rounded border-border"
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: list.color }}
                        />
                        <span className="text-sm text-foreground">{list.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({list.wordIds.length})
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                  No conjugable lists found
                </div>
              )}
            </div>
          )}

          {/* Auto-Advance */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoAdvance}
                onChange={(e) => onAutoAdvanceChange(e.target.checked)}
                className="rounded border-border"
              />
              <div>
                <span className="text-sm font-medium text-foreground">Auto-advance</span>
                <span className="text-xs text-muted-foreground block">
                  Automatically move to next question
                </span>
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}