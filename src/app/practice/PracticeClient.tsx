'use client';

import Link from 'next/link';
import SmartHeader from '@/components/SmartHeader';

export default function PracticeClient() {
  return (
    <div className="min-h-screen bg-background">
      {/* Smart Header */}
      <SmartHeader 
        title="Practice" 
        backHref="/"
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 pb-24">
        <div className="max-w-4xl mx-auto">
          
          {/* Foundation Section */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4">Foundation</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              
              {/* Hiragana Card */}
              <Link 
                href="/practice/hiragana"
                className="bg-card rounded-lg shadow-sm border border-border p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">あ</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">Hiragana</h3>
                    <p className="text-sm text-muted-foreground">Master the basic Japanese syllabary</p>
                  </div>
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>

              {/* Katakana Card */}
              <Link 
                href="/practice/katakana"
                className="bg-card rounded-lg shadow-sm border border-border p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">ア</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">Katakana</h3>
                    <p className="text-sm text-muted-foreground">Learn foreign word syllabary</p>
                  </div>
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            </div>
          </section>

          {/* Core Learning Section (Placeholder) */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4">Core Learning</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Placeholder cards for future features */}
              <div className="bg-card/50 rounded-lg border border-border/50 p-4 opacity-50">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-muted-foreground">Verb Conjugation</h3>
                    <p className="text-sm text-muted-foreground">Coming soon</p>
                  </div>
                </div>
              </div>

              <div className="bg-card/50 rounded-lg border border-border/50 p-4 opacity-50">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                    <span className="text-2xl">📚</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-muted-foreground">Vocabulary</h3>
                    <p className="text-sm text-muted-foreground">Coming soon</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}