'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StatsManager from '@/utils/stats';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import CompanionTrigger from '@/components/CompanionTrigger';

// Structured Data for SEO
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Doshi Sensei",
  "description": "Learn Japanese verb and adjective conjugations with interactive practice, drills, and vocabulary. Master ichidan, godan, and irregular verbs.",
  "url": "https://doshisensei.com",
  "applicationCategory": "EducationalApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "creator": {
    "@type": "Organization",
    "name": "Doshi Sensei Team"
  },
  "applicationSubCategory": "Language Learning",
  "featureList": [
    "Japanese verb conjugation practice",
    "Interactive drills and quizzes",
    "JLPT vocabulary support",
    "Grammar explanations",
    "Progress tracking",
    "Offline support"
  ],
  "screenshot": "https://doshisensei.com/doshi.png",
  "softwareVersion": "1.0"
};

interface UserStats {
  drillsCompleted: number;
  accuracy: number;
  streak: number;
  totalDaysUsed: number;
}

export default function Home() {
  const { user } = useAuth();
  const { userSubscription } = useSubscription();
  const [stats, setStats] = useState<UserStats>({
    drillsCompleted: 0,
    accuracy: 0,
    streak: 0,
    totalDaysUsed: 0
  });
  const [loading, setLoading] = useState(true);

  // Initialize StatsManager with user context AND load stats
  useEffect(() => {
    if (user) {
      const canSync = userSubscription?.subscription?.status === 'active';
      console.log('🏠 Homepage - setting up StatsManager:', {
        userEmail: user.email,
        canSync: canSync,
        subscriptionStatus: userSubscription?.subscription?.status
      });
      StatsManager.setUser(user, canSync);
    } else {
      StatsManager.setUser(null, false);
    }

    // Load stats after setting up user context
    loadStats();
  }, [user, userSubscription]);

  useEffect(() => {
    // Reload stats when page becomes visible/focused
    const handleFocus = () => {
      loadStats();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadStats();
      }
    };

    // Listen for when user returns to this tab/page
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const loadStats = async () => {
    try {
      const userStats = await StatsManager.getUserStats();
      setStats({
        drillsCompleted: userStats.drillsCompleted,
        accuracy: Math.round(userStats.accuracy),
        streak: userStats.currentStreak,
        totalDaysUsed: userStats.totalDaysUsed
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get user's first name only
  const getUserDisplayName = () => {
    if (user?.displayName) {
      // Extract first name from display name (split by space and take first part)
      return user.displayName.split(' ')[0];
    }
    if (user?.email) {
      // For email-based names, take the part before @ and split by common separators
      const emailName = user.email.split('@')[0];
      // Handle cases like "john.doe" or "john_doe" or "john-doe"
      return emailName.split(/[._-]/)[0];
    }
    return 'Friend';
  };

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />

      {/* Virtual Companion Section - 1/6th of screen height */}
      <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
        {/* Gradient Background */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20"
        />

        {/* Gradient to White Fade */}
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />

        {/* Virtual Companion Button positioned within this section */}
        <CompanionTrigger />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 md:py-8 min-h-screen pb-24 md:pb-8">
        {/* Welcome Header */}
        <header className="mb-8 md:mb-12 text-center">
          {/* Welcome Text with Inline Avatar */}
          <div className="flex items-center justify-center gap-3 mb-2">
            {user?.photoURL && (
              <img
                src={user.photoURL}
                alt={`${getUserDisplayName()}'s profile`}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white shadow-lg"
                style={{
                  boxShadow: '0 0 0 2px white, 0 0 0 3px var(--primary), 0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
            )}
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              Hello {getUserDisplayName()}!
              <span
                className="inline-block animate-pulse origin-[70%_70%]"
                style={{
                  animation: 'wave 2s ease-in-out infinite',
                  transformOrigin: '70% 70%'
                }}
              >
                👋
              </span>
            </h1>
          </div>
          <p className="text-base md:text-lg text-muted-foreground">
            Ready to practice some Japanese?
          </p>
        </header>

        {/* Main Navigation Cards */}
        <main className="max-w-6xl mx-auto">
          {/* Vertically Scrollable Cards in 2x2 Grid */}
          <div className="mb-6 md:mb-8">
            {/* Mobile: 2x2 Grid with Vertical Scroll */}
            <div className="md:hidden max-h-80 overflow-y-auto scrollbar-hide">
              <div className="grid grid-cols-2 gap-3 pb-4">
                {/* Practice Card */}
                <FeatureCard
                  title="Practice"
                  icon="📚"
                  href="/practice"
                  color="blue"
                  description="Learn conjugations"
                />

                {/* Drill Card */}
                <FeatureCard
                  title="Drill"
                  icon="⚡"
                  href="/drill"
                  color="orange"
                  description="Quick practice"
                />

                {/* Vocabulary Card */}
                <FeatureCard
                  title="Vocabulary"
                  icon="📖"
                  href="/vocabulary"
                  color="green"
                  description="Browse words"
                />

                {/* Kanji Card */}
                <FeatureCard
                  title="Kanji"
                  icon="漢"
                  href="/kanji-browser"
                  color="purple"
                  description="Study kanji"
                />

                {/* Saved Items Card */}
                <FeatureCard
                  title="Saved Items"
                  icon="⭐"
                  href="/favourites"
                  color="blue"
                  description="Your collection"
                />

                {/* Account Card */}
                <FeatureCard
                  title="Account"
                  icon="👤"
                  href="/account"
                  color="gray"
                  description="Profile & stats"
                />

                {/* Settings Card */}
                <FeatureCard
                  title="Settings"
                  icon="⚙️"
                  href="/settings"
                  color="gray"
                  description="Customize app"
                />

                {/* Reading Card */}
                <FeatureCard
                  title="Reading"
                  icon="📰"
                  href="/reading"
                  color="orange"
                  description="Practice reading"
                />
              </div>
            </div>

            {/* Desktop: Grid Layout (no scroll needed) */}
            <div className="hidden md:grid md:grid-cols-4 md:gap-6">
              {/* First Row */}
              {/* Practice Card */}
              <FeatureCard
                title="Practice"
                icon="📚"
                href="/practice"
                color="blue"
                description="Learn conjugations"
              />

              {/* Drill Card */}
              <FeatureCard
                title="Drill"
                icon="⚡"
                href="/drill"
                color="orange"
                description="Quick practice"
              />

              {/* Vocabulary Card */}
              <FeatureCard
                title="Vocabulary"
                icon="📖"
                href="/vocabulary"
                color="green"
                description="Browse words"
              />

              {/* Kanji Card */}
              <FeatureCard
                title="Kanji"
                icon="漢"
                href="/kanji-browser"
                color="purple"
                description="Study kanji"
              />

              {/* Second Row */}
              {/* Saved Items Card */}
              <FeatureCard
                title="Saved Items"
                icon="⭐"
                href="/favourites"
                color="blue"
                description="Your collection"
              />

              {/* Account Card */}
              <FeatureCard
                title="Account"
                icon="👤"
                href="/account"
                color="gray"
                description="Profile & stats"
              />

              {/* Settings Card */}
              <FeatureCard
                title="Settings"
                icon="⚙️"
                href="/settings"
                color="gray"
                description="Customize app"
              />

              {/* Reading Card (existing future feature) */}
              <FeatureCard
                title="Reading"
                icon="📰"
                href="/reading"
                color="orange"
                description="Practice reading"
              />
            </div>
          </div>

          {/* Circular Progress Stats */}
          <div
            className="bg-card rounded-xl p-4 md:p-6 shadow-sm"
            style={{
              border: '2px solid white',
              boxShadow: 'inset 0 0 0 1px var(--primary), 0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            <h2 className="text-lg md:text-xl font-semibold mb-6 text-card-foreground">
              Your Progress
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              <StatCircle
                label="Days Used"
                value={loading ? 0 : stats.totalDaysUsed}
                maxValue={365}
                color="blue"
                loading={loading}
              />
              <StatCircle
                label="Drills"
                value={loading ? 0 : stats.drillsCompleted}
                maxValue={100}
                color="purple"
                loading={loading}
              />
              <StatCircle
                label="Accuracy"
                value={loading ? 0 : stats.accuracy}
                maxValue={100}
                color="green"
                loading={loading}
                isPercentage={true}
              />
              <StatCircle
                label="Streak"
                value={loading ? 0 : stats.streak}
                maxValue={30}
                color="orange"
                loading={loading}
                suffix="days"
              />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

interface FeatureCardProps {
  title: string;
  icon: string;
  href: string;
  color: 'blue' | 'green' | 'purple' | 'gray' | 'orange';
  description: string;
}

function FeatureCard({ title, icon, href, color, description }: FeatureCardProps) {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-100/60 hover:bg-blue-200/70 dark:bg-blue-900/30 dark:hover:bg-blue-800/40',
      border: 'border-blue-300/60 dark:border-blue-600/60',
      text: 'text-blue-900 dark:text-blue-100',
      shadow: 'hover:shadow-blue-200/25 dark:hover:shadow-blue-900/25'
    },
    green: {
      bg: 'bg-emerald-100/60 hover:bg-emerald-200/70 dark:bg-emerald-900/30 dark:hover:bg-emerald-800/40',
      border: 'border-emerald-300/60 dark:border-emerald-600/60',
      text: 'text-emerald-900 dark:text-emerald-100',
      shadow: 'hover:shadow-emerald-200/25 dark:hover:shadow-emerald-900/25'
    },
    purple: {
      bg: 'bg-violet-100/60 hover:bg-violet-200/70 dark:bg-violet-900/30 dark:hover:bg-violet-800/40',
      border: 'border-violet-300/60 dark:border-violet-600/60',
      text: 'text-violet-900 dark:text-violet-100',
      shadow: 'hover:shadow-violet-200/25 dark:hover:shadow-violet-900/25'
    },
    gray: {
      bg: 'bg-slate-100/60 hover:bg-slate-200/70 dark:bg-slate-800/30 dark:hover:bg-slate-700/40',
      border: 'border-slate-300/60 dark:border-slate-600/60',
      text: 'text-slate-900 dark:text-slate-100',
      shadow: 'hover:shadow-slate-200/25 dark:hover:shadow-slate-800/25'
    },
    orange: {
      bg: 'bg-orange-100/60 hover:bg-orange-200/70 dark:bg-orange-900/30 dark:hover:bg-orange-800/40',
      border: 'border-orange-300/60 dark:border-orange-600/60',
      text: 'text-orange-900 dark:text-orange-100',
      shadow: 'hover:shadow-orange-200/25 dark:hover:shadow-orange-900/25'
    }
  };

  const colors = colorClasses[color];

  return (
    <Link href={href}>
      <div
        className={`group relative rounded-2xl p-4 md:p-6 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${colors.bg} ${colors.text} ${colors.shadow}`}
        style={{
          border: '2px solid white',
          boxShadow: `inset 0 0 0 1px ${color === 'blue' ? 'rgb(59, 130, 246)' :
                                         color === 'green' ? 'rgb(16, 185, 129)' :
                                         color === 'purple' ? 'rgb(139, 92, 246)' :
                                         color === 'gray' ? 'rgb(100, 116, 139)' :
                                         'rgb(249, 115, 22)'}, 0 4px 12px rgba(0,0,0,0.1)`
        }}
      >
        {/* Frosted glass overlay effect */}
        <div className="absolute inset-0 rounded-2xl bg-white/15 dark:bg-white/8 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        <div className="relative flex flex-col items-center text-center space-y-2 md:space-y-3">
          <div className="text-2xl md:text-3xl drop-shadow-sm">
            {icon}
          </div>
          <div>
            <h3 className="text-sm md:text-base font-bold">
              {title}
            </h3>
            <p className="text-xs md:text-sm opacity-90 mt-1 font-medium">
              {description}
            </p>
          </div>
        </div>

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110">
          <svg className="w-4 h-4 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

interface CompactStatProps {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'purple' | 'orange';
  loading: boolean;
  isPercentage?: boolean;
  suffix?: string;
}

function CompactStat({ label, value, color, loading, isPercentage = false, suffix = '' }: CompactStatProps) {
  const colorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-orange-600 dark:text-orange-400'
  };

  const displayValue = isPercentage ? `${value}%` : value.toString();

  return (
    <div className="text-center">
      <div className={`text-xl md:text-2xl font-bold mb-1 ${colorClasses[color]}`}>
        {loading ? '...' : displayValue}
      </div>
      <div className="text-xs md:text-sm text-muted-foreground font-medium">
        {label}
      </div>
      {suffix && !isPercentage && (
        <div className="text-xs text-muted-foreground opacity-75">
          {suffix}
        </div>
      )}
    </div>
  );
}

interface StatCircleProps {
  label: string;
  value: number;
  maxValue: number;
  color: 'blue' | 'green' | 'purple' | 'orange';
  loading: boolean;
  isPercentage?: boolean;
  suffix?: string;
}

function StatCircle({ label, value, maxValue, color, loading, isPercentage = false, suffix = '' }: StatCircleProps) {
  const colorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-orange-600 dark:text-orange-400'
  };

  const strokeClasses = {
    blue: 'stroke-blue-600 dark:stroke-blue-400',
    green: 'stroke-green-600 dark:stroke-green-400',
    purple: 'stroke-purple-600 dark:stroke-purple-400',
    orange: 'stroke-orange-600 dark:stroke-orange-400'
  };

  const percentage = Math.min((value / maxValue) * 100, 100);
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = `${(circumference * percentage) / 100} ${circumference}`;

  const displayValue = isPercentage ? `${value}%` : value.toString();
  const displaySuffix = suffix && !isPercentage ? ` ${suffix}` : '';

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24 md:w-32 md:h-32">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="var(--muted)"
            strokeWidth="6"
            fill="none"
            className="opacity-20"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            strokeDasharray={loading ? '0 283' : strokeDasharray}
            strokeLinecap="round"
            className={`transition-all duration-1000 ease-out ${strokeClasses[color]}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-lg md:text-xl font-bold ${colorClasses[color]}`}>
            {loading ? '...' : displayValue}
          </span>
          {suffix && !isPercentage && (
            <span className="text-xs text-muted-foreground">
              {suffix}
            </span>
          )}
        </div>
      </div>
      <span className="text-sm md:text-base font-medium text-muted-foreground mt-2 text-center">
        {label}
      </span>
    </div>
  );
}
