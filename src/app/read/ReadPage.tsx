'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useStrings } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import SmartHeader from '@/components/SmartHeader';
import { useStats } from '@/hooks/useStats';

const readingStructuredData = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Japanese Reading Hub - Doshi Sensei",
  "description": "Central hub for Japanese reading practice including news articles, stories, and graded readers",
  "url": "https://doshisensei.com/read"
};

interface ReadingSection {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  color: string;
  stats?: string;
  badge?: string;
}

export default function ReadPage() {
  const strings = useStrings();
  const { user, userType } = useAuth();
  const { stats, activities, loading: statsLoading, refreshStats } = useStats();
  
  // Refresh stats when page gains focus (after reading an article)
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        refreshStats();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    // Also refresh when navigating back to this page
    handleFocus();
    
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, refreshStats]);
  
  // Calculate reading stats
  const readingStreak = stats?.currentStreak || 0;
  const articlesRead = stats?.articlesRead || 0;
  const storiesRead = stats?.storiesRead || 0;
  const totalReads = articlesRead + storiesRead;
  const wordsLearned = stats?.totalWordsLearned || 0;
  
  // Calculate this week's progress
  const weeklyReads = activities?.week?.reduce((sum, day) => 
    sum + (day.summary.articlesRead + day.summary.storiesRead), 0
  ) || 0;
  const weeklyGoal = 7; // Default weekly goal
  const goalProgress = Math.min(100, (weeklyReads / weeklyGoal) * 100);
  
  // Get achievement level
  const getAchievementBadge = (total: number) => {
    if (total >= 100) return { emoji: '🎓', label: 'Scholar' };
    if (total >= 50) return { emoji: '🚀', label: 'Speed Reader' };
    if (total >= 25) return { emoji: '📚', label: 'Bookworm' };
    if (total >= 10) return { emoji: '🌟', label: 'Rising Star' };
    if (total >= 5) return { emoji: '🎯', label: 'Getting Started' };
    if (total >= 1) return { emoji: '📰', label: 'First Steps' };
    return { emoji: '🌱', label: 'Beginner' };
  };
  
  const achievement = getAchievementBadge(totalReads);
  
  const readingSections: ReadingSection[] = [
    {
      id: 'news',
      title: 'Japanese News',
      description: 'Read real NHK news articles with furigana and vocabulary support',
      href: '/news',
      icon: '🗞️',
      color: 'from-blue-500/80 to-blue-600/80 dark:from-blue-600 dark:to-blue-700',
      stats: 'Updated daily',
      badge: 'Popular'
    },
    {
      id: 'stories',
      title: 'Stories & Tales',
      description: 'Graded readers, AI-generated stories, and classic Japanese tales',
      href: '/stories',
      icon: '📚',
      color: 'from-purple-500/80 to-purple-600/80 dark:from-purple-600 dark:to-purple-700',
      stats: '50+ stories'
    },
    {
      id: 'youtube',
      title: 'YouTube Transcripts',
      description: 'Practice with Japanese YouTube video transcripts and shadowing',
      href: '/tools/youtube-shadowing',
      icon: '📺',
      color: 'from-red-500/80 to-red-600/80 dark:from-red-600 dark:to-red-700',
      stats: 'Interactive'
    },
    {
      id: 'popular-videos',
      title: 'Popular Videos',
      description: 'Community-curated collection of popular Japanese videos',
      href: '/popular-videos',
      icon: '🔥',
      color: 'from-orange-500/80 to-orange-600/80 dark:from-orange-600 dark:to-orange-700',
      stats: 'Trending'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(readingStructuredData),
        }}
      />
      
      {/* Smart Header */}
      <SmartHeader title="Read Japanese" />
      
      {/* Page Description */}
      <div className="px-4 pb-4">
        <p className="text-sm text-muted-foreground">
          Choose your reading material and improve your Japanese comprehension
        </p>
      </div>

      {/* Main Content */}
      <main className="mobile-nav-padding px-4">
        {/* Reading Stats Card (if user logged in) */}
        {user && (
          <div className="bg-card rounded-lg shadow-sm border border-border p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Your Reading Streak</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-foreground">
                    {statsLoading ? '...' : readingStreak}
                  </p>
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
                {/* Refresh button */}
                <button
                  onClick={() => refreshStats()}
                  className="ml-2 p-1 rounded hover:bg-muted transition-colors"
                  title="Refresh stats"
                >
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              <div className="text-4xl">
                {readingStreak > 0 ? '🔥' : '📖'}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total reads</span>
                <span className="font-medium text-foreground">
                  {statsLoading ? '...' : totalReads}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Articles</span>
                <span className="font-medium text-foreground">
                  {statsLoading ? '...' : articlesRead}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Stories</span>
                <span className="font-medium text-foreground">
                  {statsLoading ? '...' : storiesRead}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Words learned</span>
                <span className="font-medium text-foreground">
                  {statsLoading ? '...' : wordsLearned}
                </span>
              </div>
            </div>
            
            {/* Weekly Goal Progress */}
            <div className="mt-4 pt-3 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Weekly Goal</span>
                <span className="text-sm font-medium text-foreground">
                  {weeklyReads}/{weeklyGoal} reads
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${goalProgress}%` }}
                />
              </div>
              {goalProgress >= 100 && (
                <p className="text-xs text-primary mt-1 text-center">🎉 Goal achieved!</p>
              )}
            </div>
            
            {/* Achievement Badge */}
            <div className="mt-4 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Achievement Level</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">{achievement.label}</p>
                </div>
                <div className="text-3xl">{achievement.emoji}</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Reading Sections Grid */}
        <div className="grid gap-4 mb-6">
          {readingSections.map((section) => (
            <Link
              key={section.id}
              href={section.href}
              className="block group"
            >
              <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden hover:shadow-md transition-all">
                {/* Gradient Header */}
                <div className={`h-2 bg-gradient-to-r ${section.color}`} />
                
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 text-3xl">{section.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {section.title}
                        </h2>
                        {section.badge && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                            {section.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {section.description}
                      </p>
                      {section.stats && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {section.stats}
                        </p>
                      )}
                    </div>
                    <svg 
                      className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Reading Activity Chart (Last 7 Days) */}
        {user && activities?.week && activities.week.length > 0 && (
          <div className="bg-card rounded-lg shadow-sm border border-border p-4 mb-6">
            <h3 className="font-medium text-foreground mb-3">Last 7 Days Activity</h3>
            <div className="flex items-end justify-between gap-1 h-20">
              {Array.from({ length: 7 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (6 - i));
                const dateStr = date.toISOString().split('T')[0];
                const dayData = activities.week.find(d => d.date === dateStr);
                const dayReads = dayData ? 
                  (dayData.summary.articlesRead + dayData.summary.storiesRead) : 0;
                const maxReads = Math.max(...activities.week.map(d => 
                  d.summary.articlesRead + d.summary.storiesRead), 1);
                const height = dayReads > 0 ? (dayReads / maxReads) * 100 : 5;
                const dayName = date.toLocaleDateString('en', { weekday: 'narrow' });
                
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="relative w-full flex items-end justify-center" style={{ height: '60px' }}>
                      <div 
                        className={`w-full max-w-[20px] rounded-t transition-all duration-300 ${
                          dayReads > 0 ? 'bg-primary' : 'bg-muted'
                        }`}
                        style={{ height: `${height}%`, minHeight: '4px' }}
                      />
                      {dayReads > 0 && (
                        <span className="absolute -top-5 text-xs font-medium text-foreground">
                          {dayReads}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{dayName}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Quick Tips Section */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-foreground mb-2 flex items-center gap-2">
            <span className="text-lg">💡</span>
            Reading Tips
          </h3>
          <ul className="space-y-2 text-sm text-foreground/90">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Start with news articles for current, practical vocabulary</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Use furigana toggle to gradually build kanji recognition</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Try shadowing with YouTube videos for listening practice</span>
            </li>
          </ul>
        </div>

        {/* Recommended Reading Level */}
        {!user && (
          <div className="bg-card rounded-lg shadow-sm border border-border p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Want personalized reading recommendations?
            </p>
            <Link 
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              Sign in to track progress
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}