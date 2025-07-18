'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { StatsBar } from '@/components/stats/StatsBar';

interface CherryBlossom {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  type: number;
  swayDuration: number;
  rotation: number;
}

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
    const generateBlossoms = () => {
      const newBlossoms: CherryBlossom[] = [];
      for (let i = 0; i < 25; i++) {
        const isEmoji = Math.random() < 0.3;
        newBlossoms.push({
          id: i,
          left: Math.random() * 100,
          delay: Math.random() * 15,
          duration: 15 + Math.random() * 20,
          size: isEmoji ? 15 + Math.random() * 20 : 20 + Math.random() * 30,
          type: isEmoji ? 4 : Math.floor(Math.random() * 3) + 1,
          swayDuration: 3 + Math.random() * 4,
          rotation: Math.random() * 360
        });
      }
      setBlossoms(newBlossoms);
    };

    generateBlossoms();
    const interval = setInterval(generateBlossoms, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full overflow-x-hidden">
      {/* Fixed width container that prevents overflow */}
      <div className="relative mx-auto" style={{ maxWidth: '100vw' }}>
        
        {/* Cherry Blossom Animation - Contained */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {blossoms.map(blossom => (
            <motion.div
              key={blossom.id}
              className="absolute opacity-80"
              style={{
                left: `${blossom.left}%`,
                fontSize: blossom.type === 4 ? `${blossom.size}px` : undefined,
                width: blossom.type !== 4 ? `${blossom.size}px` : undefined,
                height: blossom.type !== 4 ? `${blossom.size}px` : undefined,
              }}
              initial={{ top: '-10%', rotate: 0 }}
              animate={{
                top: '110%',
                rotate: blossom.rotation,
                x: [0, 30, -30, 20, -20, 0],
              }}
              transition={{
                duration: blossom.duration,
                delay: blossom.delay,
                repeat: Infinity,
                x: {
                  duration: blossom.swayDuration,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
            >
              {blossom.type === 4 ? (
                '🌸'
              ) : (
                <img 
                  src={`/flat-icons/sakura/sakura${blossom.type}.svg`} 
                  alt="Cherry blossom"
                  className="w-full h-full"
                />
              )}
            </motion.div>
          ))}
        </div>

        {/* Main Content Container */}
        <div className="relative z-10 px-4">
          
          {/* Welcome Header */}
          <div className="pt-12 pb-8 text-center">
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
            <p className="text-base md:text-lg text-white">
              {readyText}
            </p>
          </div>

          {/* Torii Gate Section */}
          <motion.div 
            className="flex flex-col items-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link href="/practice" className="group">
              <motion.div 
                className="relative mb-6"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              >
                <img 
                  src="/flat-icons/tori/tori.svg"
                  alt="Torii Gate"
                  className="w-48 h-48 md:w-64 md:h-64 lg:w-72 lg:h-72 drop-shadow-2xl"
                  style={{ filter: 'drop-shadow(0 20px 40px rgba(0, 0, 0, 0.1))' }}
                />
              </motion.div>

              <div className="text-center">
                <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                  <span className="bg-gradient-to-r from-rose-600 via-orange-600 to-rose-600 bg-clip-text text-transparent">
                    Enter the Gateway
                  </span>
                </h3>
                <p className="text-xl md:text-2xl lg:text-3xl text-white font-semibold leading-relaxed mx-auto max-w-xl" 
                   style={{ 
                     textShadow: '1px 1px 0px rgba(128, 128, 128, 0.8)',
                     letterSpacing: '0.02em'
                   }}>
                  Begin your Japanese adventure through the sacred torii
                </p>
                <motion.div 
                  className="mt-8 inline-flex items-center gap-3 text-xl md:text-2xl lg:text-3xl font-semibold text-orange-600 dark:text-orange-400"
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
              </div>
            </Link>
          </motion.div>

          {/* Feature Cards Grid - Contained properly */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8 mx-auto" style={{ maxWidth: '1200px' }}>
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

          {/* Stats Bar - Contained properly */}
          <div className="pb-8 mx-auto" style={{ maxWidth: '1200px' }}>
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
    bg: 'bg-blue-100/60 hover:bg-blue-200/70 dark:bg-blue-900/30 dark:hover:bg-blue-800/40',
    border: 'border-blue-300/60 dark:border-blue-600/60',
    text: 'text-blue-900 dark:text-blue-100',
    shadow: 'hover:shadow-blue-200/25 dark:hover:shadow-blue-900/25',
    inset: 'rgb(59, 130, 246)'
  },
  green: {
    bg: 'bg-emerald-100/60 hover:bg-emerald-200/70 dark:bg-emerald-900/30 dark:hover:bg-emerald-800/40',
    border: 'border-emerald-300/60 dark:border-emerald-600/60',
    text: 'text-emerald-900 dark:text-emerald-100',
    shadow: 'hover:shadow-emerald-200/25 dark:hover:shadow-emerald-900/25',
    inset: 'rgb(16, 185, 129)'
  },
  purple: {
    bg: 'bg-violet-100/60 hover:bg-violet-200/70 dark:bg-violet-900/30 dark:hover:bg-violet-800/40',
    border: 'border-violet-300/60 dark:border-violet-600/60',
    text: 'text-violet-900 dark:text-violet-100',
    shadow: 'hover:shadow-violet-200/25 dark:hover:shadow-violet-900/25',
    inset: 'rgb(139, 92, 246)'
  },
  orange: {
    bg: 'bg-orange-100/60 hover:bg-orange-200/70 dark:bg-orange-900/30 dark:hover:bg-orange-800/40',
    border: 'border-orange-300/60 dark:border-orange-600/60',
    text: 'text-orange-900 dark:text-orange-100',
    shadow: 'hover:shadow-orange-200/25 dark:hover:shadow-orange-900/25',
    inset: 'rgb(249, 115, 22)'
  },
  teal: {
    bg: 'bg-teal-100/60 hover:bg-teal-200/70 dark:bg-teal-900/30 dark:hover:bg-teal-800/40',
    border: 'border-teal-300/60 dark:border-teal-600/60',
    text: 'text-teal-900 dark:text-teal-100',
    shadow: 'hover:shadow-teal-200/25 dark:hover:shadow-teal-900/25',
    inset: 'rgb(20, 184, 166)'
  }
} as const;

type CardColor = keyof typeof CARD_COLORS;

function FeatureCard({ title, icon, href, color, description }: FeatureCardProps) {
  const colors = CARD_COLORS[color as CardColor] || CARD_COLORS.blue;

  return (
    <Link href={href} className="block">
      <motion.div
        className={`group relative rounded-2xl p-4 md:p-6 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:shadow-xl cursor-pointer ${colors.bg} ${colors.text} ${colors.shadow}`}
        style={{
          border: '2px solid white',
          boxShadow: `inset 0 0 0 1px ${colors.inset}, 0 4px 12px rgba(0,0,0,0.1)`
        }}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
        <div className="absolute inset-0 rounded-2xl bg-white/15 dark:bg-white/8 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

        <div className="relative flex flex-col items-center text-center space-y-2 md:space-y-3">
          <div className="text-2xl md:text-3xl drop-shadow-sm">
            {icon.startsWith('/') ? (
              <img
                src={icon}
                alt={title}
                width={40}
                height={40}
                className="w-8 h-8 md:w-10 md:h-10 object-contain"
              />
            ) : (
              icon
            )}
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
      </motion.div>
    </Link>
  );
}