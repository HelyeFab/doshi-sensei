'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface CherryBlossom {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  type: number; // 1, 2, 3 for SVGs, 4 for emoji
  swayDuration: number;
  rotation: number;
}

import { StatsBar } from '@/components/stats/StatsBar';

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
  const [blossoms, setBlossoms] = useState<CherryBlossom[]>([]);

  useEffect(() => {
    // Generate random cherry blossoms
    const generateBlossoms = () => {
      const newBlossoms: CherryBlossom[] = [];
      for (let i = 0; i < 25; i++) {
        const isEmoji = Math.random() < 0.3; // 30% chance for emoji
        newBlossoms.push({
          id: i,
          left: Math.random() * 100,
          delay: Math.random() * 15,
          duration: 15 + Math.random() * 20,
          size: isEmoji ? 15 + Math.random() * 20 : 20 + Math.random() * 30, // Emojis are smaller
          type: isEmoji ? 4 : Math.floor(Math.random() * 3) + 1, // Type 4 for emoji
          swayDuration: 3 + Math.random() * 4,
          rotation: Math.random() * 360
        });
      }
      setBlossoms(newBlossoms);
    };

    generateBlossoms();
    // Regenerate blossoms occasionally for variety
    const interval = setInterval(generateBlossoms, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen" style={{ background: 'transparent' }}>
      <style jsx>{`
        @keyframes glowPulse {
          0%, 100% {
            opacity: 0.8;
            transform: scale(1.5);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.3);
          }
        }
      `}</style>

      {/* Welcome Header - Above torii gate */}
      <div className="relative pt-32 md:pt-16 pb-8 text-center z-20">
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
        <p className="text-base md:text-lg text-white">
          {readyText}
        </p>
      </div>

      {/* Torii Gate Section */}
      <motion.div
        className="relative -mt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >


        {/* Content Container - Constrained width */}
        <div className="relative mx-auto" style={{ background: 'transparent', width: '100%', maxWidth: '1200px' }}>
          {/* Torii Gate SVG - Wrapped in Link */}
          <div className="flex flex-col items-center w-full">
            <Link href="/practice" className="block group cursor-pointer mx-auto">
            <motion.div
              className="relative mb-6"
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="relative">
                                                                                {/* Glowing circular gradient background */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, rgba(249, 115, 22, 0.6) 20%, rgba(249, 115, 22, 0.4) 40%, rgba(249, 115, 22, 0.2) 60%, transparent 80%)',
                    filter: 'blur(30px)',
                    animation: 'glowPulse 3s ease-in-out infinite',
                    transform: 'scale(1.5)',
                    zIndex: 5,
                    width: '120%',
                    height: '120%',
                    top: '-10%',
                    left: '-10%'
                  }}
                />
                {/* Torii Gate using torii.svg */}
                <img
                  src="/flat-icons/tori/torii.svg"
                  alt="Torii Gate"
                  className="w-40 h-40 sm:w-48 sm:h-48 md:w-80 md:h-80 lg:w-96 lg:h-96 relative z-10 drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-500"
                                                      style={{
                    filter: 'drop-shadow(0 20px 40px rgba(0, 0, 0, 0.1)) drop-shadow(8px 8px 16px rgba(0, 0, 0, 0.4))',
                    transform: 'translate(4px, 4px)'
                  }}
                />
              </div>
          </motion.div>
          </Link>

          {/* Invitation Text */}
          <Link href="/practice" className="block">
          <motion.div
            className="text-center w-full cursor-pointer group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h3 className="text-4xl md:text-5xl font-bold mb-6 whitespace-nowrap">
              <span className="bg-gradient-to-r from-rose-600 via-orange-600 to-rose-600 bg-clip-text text-transparent">
                Enter the Gateway
              </span>
            </h3>
            <p className="text-2xl md:text-3xl text-white font-semibold leading-relaxed mx-auto"
               style={{
                 textShadow: '1px 1px 0px rgba(128, 128, 128, 0.8)',
                 letterSpacing: '0.02em'
               }}>
              Begin your Japanese adventure through the sacred torii
            </p>
            <div
              className="mt-8 inline-flex items-center gap-3 text-2xl md:text-3xl font-semibold text-orange-600 dark:text-orange-400 group-hover:text-orange-500 px-8 py-4 rounded-full backdrop-blur-md transition-all duration-300 group-hover:scale-105 animate-pulse"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }}
            >
              <span style={{
                textShadow: '1px 1px 0px rgba(0, 0, 0, 0.3)',
                letterSpacing: '0.1em'
              }}>Start Learning</span>
              <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                style={{
                  filter: 'drop-shadow(1px 1px 0px rgba(0, 0, 0, 0.3))'
                }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </motion.div>
          </Link>
          </div>

          {/* Subtle pattern overlay */}
          <div
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />

          {/* Feature Cards Grid - with overflow control */}
          <div className="w-full max-w-3xl mx-auto overflow-hidden mt-8 md:mt-12 px-4">
            <div className="grid grid-cols-3 gap-3 sm:gap-4 md:gap-6 justify-items-center">
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

          {/* Stats Bar */}
          <div className="w-full mx-auto px-6 sm:px-4 mb-8" style={{ maxWidth: '380px' }}>
            <StatsBar className="mt-6 md:mt-8 scale-90 sm:scale-100 md:hidden" />
          </div>
          <div className="hidden md:block w-full mx-auto px-6 mb-8" style={{ maxWidth: '900px' }}>
            <StatsBar className="mt-8" />
          </div>


        </div>
      </motion.div>
    </div>
  );
}

// FeatureCard component (moved from page.tsx)
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
    <Link href={href} className="block w-full sm:max-w-[150px] md:max-w-[200px]">
      <div
        className={`group relative rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 transition-all duration-300 hover:scale-[1.02] cursor-pointer ${colors.bg} ${colors.text}`}
        style={{
          border: '2px solid white',
          boxShadow: `inset 0 0 0 1px ${colors.inset}, 0 4px 12px rgba(0,0,0,0.1)`
        }}
      >

        <div className="relative flex flex-col items-center text-center space-y-2 sm:space-y-2 md:space-y-3">
          <div className="text-xl sm:text-2xl md:text-3xl drop-shadow-sm">
            {icon}
          </div>
          <div>
            <h3 className="text-xs sm:text-sm md:text-base font-bold leading-tight">
              {title}
            </h3>
            <p className="text-[10px] sm:text-xs md:text-sm opacity-90 mt-1 font-medium hidden sm:block">
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
