'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useStrings } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

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
  
  const readingSections: ReadingSection[] = [
    {
      id: 'news',
      title: 'Japanese News',
      description: 'Read real NHK news articles with furigana and vocabulary support',
      href: '/news',
      icon: '🗞️',
      color: 'from-blue-500 to-blue-600',
      stats: 'Updated daily',
      badge: 'Popular'
    },
    {
      id: 'stories',
      title: 'Stories & Tales',
      description: 'Graded readers, AI-generated stories, and classic Japanese tales',
      href: '/stories',
      icon: '📚',
      color: 'from-purple-500 to-purple-600',
      stats: '50+ stories'
    },
    {
      id: 'youtube',
      title: 'YouTube Transcripts',
      description: 'Practice with Japanese YouTube video transcripts and shadowing',
      href: '/tools/youtube-shadowing',
      icon: '📺',
      color: 'from-red-500 to-red-600',
      stats: 'Interactive'
    },
    {
      id: 'popular-videos',
      title: 'Popular Videos',
      description: 'Community-curated collection of popular Japanese videos',
      href: '/popular-videos',
      icon: '🔥',
      color: 'from-orange-500 to-orange-600',
      stats: 'Trending'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(readingStructuredData),
        }}
      />
      
      {/* Header with Back Button */}
      <header className="px-4 pt-6 pb-4" role="banner">
        <div className="flex items-center gap-3 mb-4">
          <Link 
            href="/" 
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            aria-label="Go back to home"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          
          <h1 className="text-xl font-bold text-gray-900">
            Read Japanese
          </h1>
        </div>
        
        <p className="text-sm text-gray-600 px-2">
          Choose your reading material and improve your Japanese comprehension
        </p>
      </header>

      {/* Main Content */}
      <main className="mobile-nav-padding px-4">
        {/* Reading Stats Card (if user logged in) */}
        {user && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Your Reading Streak</p>
                <p className="text-2xl font-bold text-gray-900">0 days</p>
              </div>
              <div className="text-4xl">📖</div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Articles read</span>
                <span className="font-medium text-gray-900">0</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-500">Words learned</span>
                <span className="font-medium text-gray-900">0</span>
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                {/* Gradient Header */}
                <div className={`h-2 bg-gradient-to-r ${section.color}`} />
                
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 text-3xl">{section.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                          {section.title}
                        </h2>
                        {section.badge && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                            {section.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {section.description}
                      </p>
                      {section.stats && (
                        <p className="text-xs text-gray-500 mt-2">
                          {section.stats}
                        </p>
                      )}
                    </div>
                    <svg 
                      className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" 
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

        {/* Quick Tips Section */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
            <span className="text-lg">💡</span>
            Reading Tips
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 text-center">
            <p className="text-sm text-gray-600 mb-2">
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