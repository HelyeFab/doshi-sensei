'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link'
import { SmartNavigationLink } from '@/components/navigation/SmartNavigationLink';
import Image from 'next/image';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { useSettings } from '@/contexts/SettingsContext';
import { useStrings } from '@/contexts/LanguageContext';
import { pokemonManager } from '@/utils/pokemonManager';
import { colorPalettes } from '@/utils/themes';
import { ToriiGate } from '@/components/ToriiGate';
import { StatsBar } from '@/components/stats/StatsBar';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/components/UserAvatar';
import UserAchievements from '@/components/achievements/UserAchievements';
import { useRouter } from 'next/navigation';

// Import debug utility in development
if (process.env.NODE_ENV === 'development') {
  import('@/utils/debugStats');
}

interface FeatureCard {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  requiresAuth?: boolean;
  isPremium?: boolean;
  isNew?: boolean;
}

export default function HomeClient() {
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const { subscription, subscriptionLoading, isPremium } = useSubscription2();
  const { theme } = useSettings();
  const strings = useStrings();
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>('');
  const [pokemonData, setPokemonData] = useState<{ name: string; sprite: string | null }>({ name: '', sprite: null });
  const [showToriiGate, setShowToriiGate] = useState(false);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [easterEggClicks, setEasterEggClicks] = useState(0);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || userProfile.email || '');
    } else {
      setDisplayName('');
    }
  }, [userProfile]);

  useEffect(() => {
    async function loadPokemon() {
      if (user?.uid) {
        const data = await pokemonManager.getUserPokemon(user.uid);
        setPokemonData(data);
      }
    }
    loadPokemon();
  }, [user]);

  const themeColors = colorPalettes[theme] || colorPalettes['dark-purple'];

  const featureCards: FeatureCard[] = [
    {
      id: 'practice',
      title: strings.home?.practice || 'Practice',
      description: strings.home?.practiceDesc || 'Conjugation drills and exercises',
      href: '/practice',
      icon: '📝',
    },
    {
      id: 'stories',
      title: strings.home?.stories || 'Stories',
      description: strings.home?.storiesDesc || 'Read Japanese stories',
      href: '/stories',
      icon: '📚',
    },
    {
      id: 'games',
      title: strings.home?.games || 'Games',
      description: strings.home?.gamesDesc || 'Learn through play',
      href: '/games',
      icon: '🎮',
    },
    {
      id: 'vocabulary',
      title: strings.home?.vocabulary || 'Vocabulary',
      description: strings.home?.vocabularyDesc || 'Build your word bank',
      href: '/vocabulary',
      icon: '📖',
    },
    {
      id: 'kanji-browser',
      title: strings.home?.kanjiBrowser || 'Kanji Browser',
      description: strings.home?.kanjiBrowserDesc || 'Browse kanji by JLPT level',
      href: '/kanji-browser',
      icon: '🈸',
    },
    {
      id: 'kanji-moods',
      title: strings.home?.kanjiMoods || 'Kanji Moods',
      description: strings.home?.kanjiMoodsDesc || 'Thematic kanji learning',
      href: '/kanji-moods',
      icon: '🎨',
    },
    {
      id: 'news',
      title: strings.home?.news || 'News',
      description: strings.home?.newsDesc || 'Read real Japanese news',
      href: '/news',
      icon: '📰',
    },
    {
      id: 'youtube-shadowing',
      title: strings.home?.youtubeShadowing || 'YouTube Shadowing',
      description: strings.home?.youtubeShadowingDesc || 'Practice with videos',
      href: '/tools/youtube-shadowing',
      icon: '🎬',
    },
    {
      id: 'textbook-vocabulary',
      title: strings.home?.textbookVocabulary || 'Textbook Vocabulary',
      description: strings.home?.textbookVocabularyDesc || 'Study Genki & Minna vocab',
      href: '/tools/textbook-vocabulary',
      icon: '📚',
      isNew: true,
    },
    {
      id: 'achievements',
      title: strings.home?.achievements || 'Achievements',
      description: strings.home?.achievementsDesc || 'Track your progress',
      href: '/achievements',
      icon: '🏆',
      requiresAuth: true,
    },
  ];

  const handleEasterEggClick = () => {
    const newClicks = easterEggClicks + 1;
    setEasterEggClicks(newClicks);
    
    if (newClicks === 7) {
      setShowEasterEgg(true);
      setTimeout(() => {
        router.push('/test-three-pillar-integration');
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mobile-nav-padding">
        {/* Header with User Info */}
        <header className="px-4 pt-6 pb-4" role="banner">
          <div className="flex items-center gap-3">
            <div 
              className="relative w-12 h-12 flex-shrink-0 cursor-pointer"
              onClick={handleEasterEggClick}
            >
              <UserAvatar size="medium" showPokemon={false} />
              {pokemonData.sprite && (
                <Image
                  src={pokemonData.sprite}
                  alt={pokemonData.name}
                  width={20}
                  height={20}
                  className="absolute -bottom-1 -right-1 pixelated"
                />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-gray-900">
                {displayName ? `${strings.home.greeting} ${displayName}-san! 👋` : strings.home.welcome}
              </h1>
              <p className="text-sm text-gray-600">{strings.home.readyToPractice}</p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-4">
            <StatsBar />
          </div>

          {/* Date and Progress */}
          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="text-gray-600">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            {user && (
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${isPremium ? 'bg-purple-500' : 'bg-green-500'}`} />
                <span className="text-gray-600">
                  {isPremium ? strings.home.premiumActive : strings.home.freeAccount}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="px-4 pb-8">
          {/* User Achievements */}
          {user && (
            <div className="mb-6">
              <UserAchievements />
            </div>
          )}

          {/* Feature Cards */}
          <div className="space-y-3">
            {featureCards.map((card) => {
              if (card.requiresAuth && !user) return null;
              
              return (
                <SmartNavigationLink key={card.id} href={card.href}>
                  <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center text-2xl">
                        {card.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">{card.title}</h3>
                          {card.isNew && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                              NEW
                            </span>
                          )}
                          {card.isPremium && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-purple-100 text-purple-800 rounded-full">
                              PREMIUM
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{card.description}</p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </SmartNavigationLink>
              );
            })}
          </div>

          {/* Account Section */}
          <div className="mt-8 space-y-3">
            {!user ? (
              <>
                <Link href="/login">
                  <div className="bg-purple-600 text-white rounded-lg p-4 text-center font-medium hover:bg-purple-700 transition-colors">
                    {strings.home.loginToContinue}
                  </div>
                </Link>
                <Link href="/drill/conjugation">
                  <div className="bg-white border-2 border-purple-600 text-purple-600 rounded-lg p-4 text-center font-medium hover:bg-purple-50 transition-colors">
                    {strings.home.tryFreeMode}
                  </div>
                </Link>
              </>
            ) : (
              <>
                {!isPremium && (
                  <Link href="/account">
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg p-4 text-center">
                      <p className="font-medium">{strings.home.upgradeToPremium}</p>
                      <p className="text-sm opacity-90 mt-1">{strings.home.unlimitedAccess}</p>
                    </div>
                  </Link>
                )}
                <Link href="/settings">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                        ⚙️
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{strings.home.settings}</h3>
                        <p className="text-sm text-gray-500">{strings.home.settingsDesc}</p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Torii Gate Animation */}
      {showToriiGate && <ToriiGate onComplete={() => setShowToriiGate(false)} />}

      {/* Easter Egg Message */}
      {showEasterEgg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 text-center animate-bounce">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-lg font-semibold">Secret Developer Mode!</p>
            <p className="text-sm text-gray-600 mt-2">Redirecting to Three-Pillar Test...</p>
          </div>
        </div>
      )}
    </div>
  );
}