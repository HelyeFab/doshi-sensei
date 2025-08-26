'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FilterButtonGroup } from './FilterButtonGroup';
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

  return (
    <div className="mb-4 space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search vocabulary..."
          value={filters.searchQuery}
          onChange={(e) => onFilterChange('searchQuery', e.target.value)}
          className="w-full px-4 py-2 pl-10 bg-background text-foreground border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent placeholder:text-muted-foreground"
        />
        <svg
          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Lesson Selector */}
      <div className="relative">
        <div className="overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 md:-mx-2 md:px-2">
          <div className="flex gap-2 min-w-max">
            <button
              onClick={() => onLessonSelect(null)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedLesson === null
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              All
            </button>
            {Array.from({ length: totalLessons }, (_, i) => i + 1).map((lesson) => {
              const locked = !isPremium && lesson > TEXTBOOK_CONFIG.premiumLimits.freeUserMaxLesson;
              return (
                <button
                  key={lesson}
                  onClick={() => (locked ? onRequestUpgrade() : onLessonSelect(lesson))}
                  className={`flex-shrink-0 px-3 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    locked
                      ? 'bg-muted text-muted-foreground/60 cursor-pointer relative opacity-60 hover:bg-muted/80'
                      : selectedLesson === lesson
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {locked && <span className="mr-1">🔒</span>}
                  Lesson {lesson}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
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
          <FilterButtonGroup
            label="JLPT Level"
            value={filters.jlptLevel}
            options={TEXTBOOK_CONFIG.jlptLevels}
            onSelect={(value) => onFilterChange('jlptLevel', value)}
          />

          {/* Theme */}
          <FilterButtonGroup
            label="Theme"
            value={filters.theme}
            options={TEXTBOOK_CONFIG.themes.filter(t => t !== 'all')}
            onSelect={(value) => onFilterChange('theme', value)}
            capitalize
          />
        </motion.div>
      )}
    </div>
  );
}