'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { StatsBar } from '@/components/stats/StatsBar';
import { ProfileTitle } from '@/components/achievements/ProfileTitle';

interface ToriiGateProps {
  profile?: any;
  displayName?: string;
  greeting?: string;
  readyText?: string;
  featureCards?: any[];
  cardColors?: string[];
}

export function ToriiGate({ 
  profile, 
  displayName = 'Friend', 
  greeting = 'Hello', 
  readyText = 'Ready to practice some Japanese?',
  featureCards = [],
  cardColors = []
}: ToriiGateProps) {

  return (
    <div className="min-h-screen">
      {/* Welcome Header */}
      <div className="text-center pt-12 pb-8">
        <div className="flex items-center justify-center gap-3 mb-2">
          {typeof window !== 'undefined' && profile?.avatar ? (
            <img
              src={profile.avatar}
              alt={`${profile.displayName || profile.email}'s profile`}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white shadow-lg"
              style={{
                boxShadow: '0 0 0 2px white, 0 0 0 3px var(--primary), 0 2px 8px rgba(0,0,0,0.1)'
              }}
            />
          ) : typeof window !== 'undefined' && profile?.photoURL ? (
            <img
              src={profile.photoURL}
              alt={`${profile.displayName || profile.email}'s profile`}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white shadow-lg"
              style={{
                boxShadow: '0 0 0 2px white, 0 0 0 3px var(--primary), 0 2px 8px rgba(0,0,0,0.1)'
              }}
            />
          ) : null}
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2" suppressHydrationWarning
            style={{
              textShadow: '1px 1px 0px rgba(128, 128, 128, 0.8)'
            }}>
            {greeting} {displayName}-san!
            <span
              className="inline-block animate-pulse"
              style={{
                animation: 'wave 2s ease-in-out infinite',
                transformOrigin: '70% 70%'
              }}
            >
              👋
            </span>
          </h1>
        </div>
        
        {/* Profile Title */}
        <div className="mb-2">
          <ProfileTitle className="justify-center" size="md" />
        </div>
        
        <p className="text-base md:text-lg text-white">
          {readyText}
        </p>
      </div>

      {/* Main Content Area - No complex nesting */}
      <div className="mt-8">
        {/* Torii Gate Section - Centered without flex on parent */}
        <div className="text-center">
          <Link href="/practice" className="inline-block group">
            <div className="mb-6">
              <img 
                src="/flat-icons/tori/tori.svg"
                alt="Torii Gate"
                className="w-48 h-48 md:w-64 md:h-64 lg:w-72 lg:h-72 mx-auto drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-500"
                style={{ filter: 'drop-shadow(0 20px 40px rgba(0, 0, 0, 0.1))' }}
              />
            </div>
            
            <div className="max-w-xs mx-auto">
              <h3 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-rose-600 via-orange-600 to-rose-600 bg-clip-text text-transparent">
                  Enter the Gateway
                </span>
              </h3>
              <p className="text-2xl md:text-3xl text-white font-semibold leading-relaxed" 
                 style={{ 
                   textShadow: '1px 1px 0px rgba(128, 128, 128, 0.8)',
                   letterSpacing: '0.02em'
                 }}>
                Begin your Japanese adventure through the sacred torii
              </p>
            </div>
          </Link>
        </div>

        {/* Feature Cards - Simple grid without complex containers */}
        <div className="mt-12 mx-auto" style={{ maxWidth: 'min(100%, 1200px)' }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mx-4">
            {featureCards.map((card, index) => (
              <FeatureCard
                key={card.href}
                title={card.title}
                icon={card.icon}
                href={card.href}
                color={cardColors[index]}
                description={card.description}
              />
            ))}
          </div>
        </div>

        {/* Stats Bar - Simple wrapper */}
        <div className="mt-6 mx-auto pb-8" style={{ maxWidth: 'min(100%, 1200px)' }}>
          <div className="mx-4">
            <StatsBar />
          </div>
        </div>
      </div>
    </div>
  );
}

// FeatureCard component
interface FeatureCardProps {
  title: string;
  icon: string;
  href: string;
  color: string;
  description: string;
}

const CARD_COLORS = {
  blue: {
    bg: 'bg-blue-100/60 dark:bg-blue-900/30',
    border: 'border-blue-300/60 dark:border-blue-600/60',
    text: 'text-blue-900 dark:text-blue-100',
    shadow: '',
    inset: 'rgb(59, 130, 246)'
  },
  green: {
    bg: 'bg-emerald-100/60 dark:bg-emerald-900/30',
    border: 'border-emerald-300/60 dark:border-emerald-600/60',
    text: 'text-emerald-900 dark:text-emerald-100',
    shadow: '',
    inset: 'rgb(16, 185, 129)'
  },
  purple: {
    bg: 'bg-violet-100/60 dark:bg-violet-900/30',
    border: 'border-violet-300/60 dark:border-violet-600/60',
    text: 'text-violet-900 dark:text-violet-100',
    shadow: '',
    inset: 'rgb(139, 92, 246)'
  },
  orange: {
    bg: 'bg-orange-100/60 dark:bg-orange-900/30',
    border: 'border-orange-300/60 dark:border-orange-600/60',
    text: 'text-orange-900 dark:text-orange-100',
    shadow: '',
    inset: 'rgb(249, 115, 22)'
  },
  teal: {
    bg: 'bg-teal-100/60 dark:bg-teal-900/30',
    border: 'border-teal-300/60 dark:border-teal-600/60',
    text: 'text-teal-900 dark:text-teal-100',
    shadow: '',
    inset: 'rgb(20, 184, 166)'
  }
} as const;

type CardColor = keyof typeof CARD_COLORS;

function FeatureCard({ title, icon, href, color, description }: FeatureCardProps) {
  const colors = CARD_COLORS[color as CardColor] || CARD_COLORS.blue;

  return (
    <Link href={href} className="block">
      <div
        className={`group relative rounded-2xl p-4 md:p-6 transition-all duration-300 hover:scale-[1.02] cursor-pointer ${colors.bg} ${colors.text}`}
        style={{
          border: '2px solid white',
          boxShadow: `inset 0 0 0 1px ${colors.inset}, 0 4px 12px rgba(0,0,0,0.1)`
        }}
      >
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

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110 pointer-events-none">
          <svg className="w-4 h-4 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}