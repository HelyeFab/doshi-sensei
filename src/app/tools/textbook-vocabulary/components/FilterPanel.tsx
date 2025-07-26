'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { FilterOptions } from '../types';
import { TEXTBOOK_CONFIG } from '@/config/textbooks';

interface FilterPanelProps {
  filters: FilterOptions;
  onFilterChange: (key: keyof FilterOptions, value: any) => void;
  textbook: string;
  totalLessons: number;
  onLessonSelect: (lesson: number | null) => void;
  selectedLesson: number | null;
  isPremium: boolean;
  onRequestUpgrade: () => void;
}

// Reusable component for filter button groups
interface FilterButtonGroupProps {
  label: string;
  value: string | null;
  options: readonly string[] | string[];
  onSelect: (value: string | null) => void;
  capitalize?: boolean;
}

export function FilterPanel({
  filters,
  onFilterChange,
  textbook,
  totalLessons,
  onLessonSelect,
  selectedLesson,
  isPremium,
  onRequestUpgrade
}: FilterPanelProps) {
  const [showFilters, setShowFilters] = useState(false);

  // Use configuration from centralized config
  const jlptLevels = [...TEXTBOOK_CONFIG.jlptLevels];
  const themes = TEXTBOOK_CONFIG.themes.filter(t => t !== 'all');

  return (
    <div className="mb-4 space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search vocabulary..."
          value={filters.searchQuery}
          onChange={(e) => onFilterChange('searchQuery', e.target.value)}
          className="w-full px-4 py-2 pl-10 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <svg
          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Lesson Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => onLessonSelect(null)}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
            selectedLesson === null
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Lessons
        </button>
        {Array.from({ length: totalLessons }, (_, i) => i + 1).map((lesson) => {
          const locked = !isPremium && lesson > TEXTBOOK_CONFIG.premiumLimits.freeUserMaxLesson;
          return (
            <button
              key={lesson}
              onClick={() => (locked ? onRequestUpgrade() : onLessonSelect(lesson))}
              disabled={locked}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                locked
                  ? 'bg-muted text-muted-foreground cursor-not-allowed relative'
                  : selectedLesson === lesson
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {locked && <span className="mr-1">🔒</span>}
              Lesson {lesson}
            </button>
          );
        })}
      </div>

      {/* Advanced Filters Toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <svg
          className={`w-4 h-4 transform transition-transform ${showFilters ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        Advanced Filters
      </button>

      {/* Advanced Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4"
        >
          {/* JLPT Level */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">JLPT Level</label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => onFilterChange('jlptLevel', null)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  filters.jlptLevel === null
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {jlptLevels.map((level) => (
                <button
                  key={level}
                  onClick={() => onFilterChange('jlptLevel', level)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    filters.jlptLevel === level
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Theme</label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => onFilterChange('theme', null)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  filters.theme === null
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {themes.map((theme) => (
                <button
                  key={theme}
                  onClick={() => onFilterChange('theme', theme)}
                  className={`px-3 py-1 rounded-md text-sm font-medium capitalize transition-colors ${
                    filters.theme === theme
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}