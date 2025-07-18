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
    <div className="relative min-h-screen overflow-hidden" style={{ background: 'transparent' }}>

      {/* Welcome Header - Above torii gate */}
      <div className="relative pt-12 pb-8 text-center z-20">
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
        className="relative mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Cherry Blossom Animation - Full screen width */}
        <div className="absolute -left-10 -right-10 inset-y-0 overflow-hidden pointer-events-none">
          {blossoms.map((blossom) => (
            <div
              key={blossom.id}
              className="absolute animate-fall"
              style={{
                left: `${blossom.left}%`,
                animationDelay: `${blossom.delay}s`,
                animationDuration: `${blossom.duration}s`,
              }}
            >
              <div 
                className="animate-sway"
                style={{
                  width: `${blossom.size}px`,
                  height: `${blossom.size}px`,
                  animationDuration: `${blossom.swayDuration}s`,
                  transform: `rotate(${blossom.rotation}deg)`
                }}
              >
                {blossom.type === 4 ? (
                  <span 
                    className="text-2xl block w-full h-full flex items-center justify-center"
                    style={{
                      fontSize: `${blossom.size}px`,
                      opacity: 0.8,
                      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
                    }}
                  >
                    🌸
                  </span>
                ) : (
                  <img 
                    src={blossom.type === 1 
                      ? "/flat-icons/sakura/sakura.svg" 
                      : blossom.type === 2 
                      ? "/flat-icons/sakura/sakura (1).svg"
                      : "/flat-icons/sakura/sakura (2).svg"
                    }
                    alt="Cherry blossom"
                    className="w-full h-full"
                    style={{
                      opacity: 0.7 + (blossom.size - 20) / 100, // Larger blossoms more opaque
                      filter: `brightness(${0.9 + Math.random() * 0.2})` // Slight brightness variation
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>


        {/* Content Container */}
        <div className="relative h-full flex flex-col items-center justify-center p-8" style={{ background: 'transparent' }}>
          {/* Torii Gate SVG - Wrapped in Link */}
          <Link href="/practice" className="block group cursor-pointer">
            <motion.div 
              className="relative mb-6"
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="relative">
                {/* Torii Gate using the original SVG */}
                <img 
                  src="/flat-icons/tori/tori.svg"
                  alt="Torii Gate"
                  className="w-48 h-48 md:w-64 md:h-64 lg:w-72 lg:h-72 relative z-10 drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-500"
                  style={{ filter: 'drop-shadow(0 20px 40px rgba(0, 0, 0, 0.1))' }}
                />
              </div>

          </motion.div>

          {/* Invitation Text */}
          <motion.div 
            className="text-center max-w-xs"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h3 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-rose-600 via-orange-600 to-rose-600 bg-clip-text text-transparent">
                Enter the Gateway
              </span>
            </h3>
            <p className="text-2xl md:text-3xl lg:text-4xl text-white font-semibold leading-relaxed max-w-2xl mx-auto" 
               style={{ 
                 textShadow: '1px 1px 0px rgba(128, 128, 128, 0.8)',
                 letterSpacing: '0.02em'
               }}>
              Begin your Japanese adventure through the sacred torii
            </p>
            <motion.div 
              className="mt-8 inline-flex items-center gap-3 text-2xl md:text-3xl lg:text-4xl font-semibold text-orange-600 dark:text-orange-400"
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <span style={{ 
                textShadow: '1px 1px 0px white',
                letterSpacing: '0.1em'
              }}>Start Learning</span>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" 
                style={{ 
                  filter: 'drop-shadow(1px 1px 0px white)'
                }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.div>
          </motion.div>
          </Link>

          {/* Subtle pattern overlay */}
          <div 
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />

          {/* Feature Cards Grid - Inside content container but outside Link */}
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mt-12 px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
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
          </motion.div>

          {/* Stats Bar - Inside content container but outside Link */}
          <motion.div
            className="mt-6 px-4 pb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
          >
            <StatsBar />
          </motion.div>
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