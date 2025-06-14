'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { strings } from '@/config/strings';
import MobileHome from '@/components/MobileHome';

export default function Home() {
  const router = useRouter();
  // Use a ref to track if the component is mounted
  const isMounted = useRef(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Mark as mounted
    isMounted.current = true;
    setIsClient(true);

    // Cleanup
    return () => {
      isMounted.current = false;
    };
  }, []);

  return (
    <>
      {/* Mobile Layout */}
      <div className="md:hidden">
        <MobileHome />
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block container mx-auto px-4 py-8 min-h-screen">
        {/* Header */}
        <header className="text-center mb-12 fade-in">
          <div className="flex items-center justify-center mb-2">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mr-4">
              <span className="text-2xl font-bold text-primary-foreground japanese-text">動</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground app-name">
              {strings.appName}
            </h1>
          </div>
          <p className="text-lg text-muted-foreground japanese-text mb-6">
            動詞 先生
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {strings.home.subtitle}
          </p>
        </header>

        {/* Main Navigation Cards */}
        <main className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Practice Card */}
            <NavigationCard
              title={strings.home.practiceButton}
              description="Practice conjugations with detailed explanations"
              icon="📚"
              href="/practice"
              gradient="from-blue-600 to-blue-800"
            />

            {/* Drill Card */}
            <NavigationCard
              title={strings.home.drillButton}
              description="Test your knowledge with multiple choice questions"
              icon="⚡"
              href="/drill"
              gradient="from-purple-600 to-purple-800"
            />

            {/* Vocabulary Card */}
            <NavigationCard
              title={strings.home.vocabButton}
              description="Browse and search Japanese vocabulary by JLPT level"
              icon="📖"
              href="/vocabulary"
              gradient="from-green-600 to-green-800"
            />

            {/* Settings Card */}
            <NavigationCard
              title={strings.home.settingsButton}
              description="Customize your learning experience"
              icon="⚙️"
              href="/settings"
              gradient="from-gray-600 to-gray-800"
            />
          </div>

          {/* Quick Stats */}
          <div className="bg-card rounded-lg p-6 border border-border slide-up">
            <h2 className="text-xl font-semibold mb-4 text-card-foreground">
              {strings.common.loading}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Words Learned" value="0" />
              <StatCard label="Drills Completed" value="0" />
              <StatCard label="Accuracy" value="0%" />
              <StatCard label="Streak" value="0 days" />
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="text-center mt-12 pt-8 border-t border-border">
          <p className="text-muted-foreground text-sm">
            Master Japanese conjugations one verb at a time
          </p>
        </footer>
      </div>
    </>
  );
}

interface NavigationCardProps {
  title: string;
  description: string;
  icon: string;
  href: string;
  gradient: string;
}

function NavigationCard({ title, description, icon, href, gradient }: NavigationCardProps) {
  return (
    <Link href={href} className="block">
      <div
        className="group relative overflow-hidden rounded-lg border border-border bg-card hover:bg-card/80 transition-all duration-300 cursor-pointer slide-up hover:scale-105"
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
        <div className="relative p-6">
          <div className="flex items-center mb-4">
            <span className="text-3xl mr-3">{icon}</span>
            <h3 className="text-xl font-semibold text-card-foreground">{title}</h3>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>
          <div className="mt-4 flex items-center text-primary text-sm font-medium">
            <span>Get Started</span>
            <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}

interface StatCardProps {
  label: string;
  value: string;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-primary mb-1">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
