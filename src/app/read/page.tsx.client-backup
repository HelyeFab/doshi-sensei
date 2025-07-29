'use client';

import { useState } from 'react';
import { useStrings } from '@/contexts/LanguageContext';
import Link from 'next/link'
import { SmartNavigationLink } from '@/components/navigation/SmartNavigationLink';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import Image from 'next/image';

const pageStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Reading Hub - Doshi Sensei",
  "description": "Choose between Japanese news articles and AI-generated stories for reading practice",
  "url": "https://doshisensei.com/read"
};

export default function ReadPage() {
  const strings = useStrings();
  const [selectedTab, setSelectedTab] = useState<'news' | 'stories'>('news');

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(pageStructuredData),
        }}
      />

      <SmartPageHeader title="Read" />

      <div className="mobile-nav-padding">
        {/* Toggle Switch Container */}
        <div className="px-4 pt-4 pb-6">
          <div className="relative bg-card border border-border rounded-full p-1 shadow-sm">
            {/* Sliding Background */}
            <div
              className={`absolute inset-y-1 w-1/2 bg-primary rounded-full transition-transform duration-200 ease-out ${
                selectedTab === 'stories' ? 'translate-x-full' : 'translate-x-0'
              }`}
            />
            
            {/* Toggle Buttons */}
            <div className="relative grid grid-cols-2 gap-1">
              <button
                onClick={() => setSelectedTab('news')}
                className={`py-3 px-6 rounded-full text-sm font-medium transition-colors duration-200 ${
                  selectedTab === 'news'
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                News 📰
              </button>
              <button
                onClick={() => setSelectedTab('stories')}
                className={`py-3 px-6 rounded-full text-sm font-medium transition-colors duration-200 ${
                  selectedTab === 'stories'
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                AI Stories 📚
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="px-4 pb-4">
          {selectedTab === 'news' ? (
            <div className="space-y-4">
              {/* News Description Card */}
              <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">📰</span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-card-foreground mb-2">
                      Japanese News Articles
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      Read real Japanese news articles with furigana support, translations, and difficulty levels tailored to your learning journey.
                    </p>
                    <SmartNavigationLink href="/news"
                      className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
                     title="Japanese News Articles">
                      Browse News Articles
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </SmartNavigationLink>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="grid gap-3">
                <FeatureCard
                  icon="🎯"
                  title="Difficulty Levels"
                  description="Articles sorted by JLPT level from N5 to N1"
                />
                <FeatureCard
                  icon="🔤"
                  title="Furigana Support"
                  description="Toggle reading aids on and off as needed"
                />
                <FeatureCard
                  icon="🌐"
                  title="Instant Translation"
                  description="Tap any sentence for English translation"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* AI Stories Description Card */}
              <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">📚</span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-card-foreground mb-2">
                      AI-Generated Stories
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      Immerse yourself in interactive stories created by AI, tailored to your level with built-in comprehension support.
                    </p>
                    <SmartNavigationLink href="/stories"
                      className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
                     title="AI-Generated Stories">
                      Explore Stories
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </SmartNavigationLink>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="grid gap-3">
                <FeatureCard
                  icon="✨"
                  title="Interactive Experience"
                  description="Stories adapt based on your choices"
                />
                <FeatureCard
                  icon="📊"
                  title="Progress Tracking"
                  description="Monitor your reading comprehension growth"
                />
                <FeatureCard
                  icon="🎭"
                  title="Various Genres"
                  description="From slice-of-life to fantasy adventures"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-card border border-border rounded-lg shadow-sm p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <span className="text-xl">{icon}</span>
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-card-foreground text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}