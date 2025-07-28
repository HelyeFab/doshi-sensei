'use client';

import { useState, useEffect } from 'react';
import { SmartNavigationLink } from '@/components/navigation/SmartNavigationLink';
import Image from 'next/image';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useStrings } from '@/contexts/LanguageContext';
import { StatsBar } from '@/components/stats/StatsBar';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/components/UserAvatar';
import UserAchievements from '@/components/achievements/UserAchievements';
import { useRouter } from 'next/navigation';

export default function HomeClient() {
  const { profile } = useUserProfile();
  const strings = useStrings();
  const { user } = useAuth();
  const router = useRouter();
  const [dayProgress, setDayProgress] = useState(0);
  const [todayDate, setTodayDate] = useState<string>('');
  const [isClient, setIsClient] = useState(false);

  // Mark when we're on the client and load debug stats
  useEffect(() => {
    setIsClient(true);
    
    // Load debug stats after client is ready
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      // Delay import to ensure all dependencies are loaded
      setTimeout(() => {
        import('@/utils/debugStats').catch(() => {
          // Silently ignore debug stats loading errors
        });
      }, 1000);
    }
  }, []);

  // Calculate day progress
  useEffect(() => {
    if (!isClient) return;

    const calculateDayProgress = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const totalMinutes = hours * 60 + minutes;
      const dayMinutes = 24 * 60;
      const progress = (totalMinutes / dayMinutes) * 100;
      setDayProgress(progress);
      
      // Format today's date - only on client to avoid hydration issues
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric'
      };
      setTodayDate(now.toLocaleDateString('en-US', options));
    };

    calculateDayProgress();

    // Update every minute
    const interval = setInterval(calculateDayProgress, 60000);

    return () => clearInterval(interval);
  }, [isClient]);

  // Ensure strings are loaded
  if (!strings || !strings.home || !strings.home.featureCards) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  const fullDisplayName = profile?.displayName || profile?.email || user?.email || strings.home.welcomeUser;
  
  // Extract first name from display name
  const displayName = (() => {
    if (!fullDisplayName) return strings.home.welcomeUser;
    
    // If it's an email, take the part before @
    if (fullDisplayName.includes('@')) {
      return fullDisplayName.split('@')[0].split('.')[0];
    }
    
    // Otherwise, take the first word (first name)
    return fullDisplayName.split(' ')[0];
  })();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop margin wrapper */}
      <div className="md:mx-16 lg:mx-32 xl:mx-48 2xl:mx-64">
        {/* Welcome Section */}
        <header className="px-4 pt-8 pb-6" role="banner">
        <div className="flex items-center gap-3">
          {/* User Avatar */}
          <UserAvatar size="md" />
          
          {/* Greeting Text */}
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-foreground">
              {strings.home.greeting} {displayName}-san! <span className="inline-block animate-wave">👋</span>
            </h1>
            {user ? (
              <p className="text-sm text-muted-foreground">{strings.home.readyToPractice}</p>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push('/login')}
                  className="text-sm text-primary hover:underline"
                >
                  Login
                </button>
                <span className="text-sm text-muted-foreground">/</span>
                <button
                  onClick={() => router.push('/login')}
                  className="text-sm text-primary hover:underline"
                >
                  Sign up
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Today's Date Section */}
      {isClient && (
        <section className="px-4 pb-6">
          <h2 className="text-lg font-medium text-foreground mb-2">
            {todayDate ? `Today, ${todayDate}` : 'Today'}
          </h2>
          
          {/* Day Progress Bar */}
          <div 
            className="relative h-0.5 w-full bg-muted overflow-hidden"
            role="progressbar"
            aria-label={strings.home.dayProgressTooltip}
            aria-valuenow={Math.round(dayProgress)}
            aria-valuemin={0}
            aria-valuemax={100}
            title={strings.home.dayProgressTooltip}
          >
            <div 
              className="absolute left-0 top-0 h-full transition-all duration-300 ease-out"
              style={{
                width: `${dayProgress}%`,
                backgroundColor: 'var(--primary)'
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{strings.home.dayProgressTooltip}</p>
        </section>
      )}
      
      {/* User Achievements */}
      <UserAchievements />
      
      {/* Stats Bar */}
      <div className="px-4 pb-4">
        <StatsBar />
      </div>

      {/* Feature Cards - Scrollable Container */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-6">
          {/* Foundation Section */}
          <section>
            <h3 className="text-lg font-bold text-foreground mb-3">Foundation</h3>
            <div className="space-y-3">
              {[
                { title: strings.home.featureCards.hiragana.title, icon: strings.home.featureCards.hiragana.icon, href: '/practice/hiragana', description: strings.home.featureCards.hiragana.description },
                { title: strings.home.featureCards.katakana.title, icon: strings.home.featureCards.katakana.icon, href: '/practice/katakana', description: strings.home.featureCards.katakana.description }
              ].map((card) => (
                <SmartNavigationLink key={card.href} href={card.href} className="block" title={card.title}>
                  <div className="bg-card rounded-lg shadow-sm border border-border p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-primary/10">
                        <span className="text-2xl">{card.icon}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{card.title}</h3>
                        <p className="text-sm text-muted-foreground">{card.description}</p>
                      </div>
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </SmartNavigationLink>
              ))}
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-border"></div>

          {/* Core Learning Section */}
          <section>
            <h3 className="text-lg font-bold text-foreground mb-3">Core Learning</h3>
            <div className="space-y-3">
              {[
                { title: strings.home.featureCards.kanji.title, icon: strings.home.featureCards.kanji.icon, href: '/kanji-browser', description: strings.home.featureCards.kanji.description },
                { title: strings.home.featureCards.moodBoards.title, icon: strings.home.featureCards.moodBoards.icon, href: '/kanji-moods', description: strings.home.featureCards.moodBoards.description },
                { title: strings.home.featureCards.vocabulary.title, icon: strings.home.featureCards.vocabulary.icon, href: '/vocabulary', description: strings.home.featureCards.vocabulary.description },
                { title: strings.home.featureCards.textbookVocabulary.title, icon: strings.home.featureCards.textbookVocabulary.icon, href: '/tools/textbook-vocabulary', description: strings.home.featureCards.textbookVocabulary.description },
                { title: strings.home.featureCards.conjugation.title, icon: strings.home.featureCards.conjugation.icon, href: '/practice/conjugation', description: strings.home.featureCards.conjugation.description }
              ].map((card) => (
                <SmartNavigationLink key={card.href} href={card.href} className="block" title={card.title}>
                  <div className="bg-card rounded-lg shadow-sm border border-border p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-primary/10">
                        <span className="text-2xl">{card.icon}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{card.title}</h3>
                        <p className="text-sm text-muted-foreground">{card.description}</p>
                      </div>
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </SmartNavigationLink>
              ))}
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-border"></div>

          {/* Practice & Review Section */}
          <section>
            <h3 className="text-lg font-bold text-foreground mb-3">Practice & Review</h3>
            <div className="space-y-3">
              {[
                { title: strings.home.featureCards.practice.title, icon: strings.home.featureCards.practice.icon, href: '/practice', description: strings.home.featureCards.practice.description },
                { title: strings.home.featureCards.drill.title, icon: strings.home.featureCards.drill.icon, href: '/drill', description: strings.home.featureCards.drill.description },
                { title: strings.home.featureCards.games.title, icon: strings.home.featureCards.games.icon, href: '/games', description: strings.home.featureCards.games.description }
              ].map((card) => (
                <SmartNavigationLink key={card.href} href={card.href} className="block" title={card.title}>
                  <div className="bg-card rounded-lg shadow-sm border border-border p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-primary/10">
                        <span className="text-2xl">{card.icon}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{card.title}</h3>
                        <p className="text-sm text-muted-foreground">{card.description}</p>
                      </div>
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </SmartNavigationLink>
              ))}
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-border"></div>

          {/* Immersion Section */}
          <section>
            <h3 className="text-lg font-bold text-foreground mb-3">Immersion</h3>
            <div className="space-y-3">
              {[
                { title: strings.home.featureCards.news.title, icon: strings.home.featureCards.news.icon, href: '/news', description: strings.home.featureCards.news.description },
                { title: strings.home.featureCards.stories.title, icon: '/flat-icons/root-icons/story.svg', href: '/stories', description: strings.home.featureCards.stories.description },
                { title: strings.home.featureCards.youtubeShadowing.title, icon: strings.home.featureCards.youtubeShadowing.icon, href: '/tools/youtube-shadowing', description: strings.home.featureCards.youtubeShadowing.description },
                ...(user ? [{ title: 'My Videos', icon: '📚', href: '/tools/my-videos', description: 'Quick access to your practice history' }] : [])
              ].map((card) => (
                <SmartNavigationLink key={card.href} href={card.href} className="block" title={card.title}>
                  <div className="bg-card rounded-lg shadow-sm border border-border p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-primary/10">
                        {card.icon.startsWith('/') ? (
                          <Image src={card.icon} alt="" width={32} height={32} />
                        ) : (
                          <span className="text-2xl">{card.icon}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{card.title}</h3>
                        <p className="text-sm text-muted-foreground">{card.description}</p>
                      </div>
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </SmartNavigationLink>
              ))}
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-border"></div>

          {/* Tools & Resources Section */}
          <section>
            <h3 className="text-lg font-bold text-foreground mb-3">Tools & Resources</h3>
            <div className="space-y-3">
              {[
                { title: strings.home.featureCards.resources.title, icon: strings.home.featureCards.resources.icon, href: '/resources', description: strings.home.featureCards.resources.description },
                { title: strings.home.featureCards.savedItems.title, icon: strings.home.featureCards.savedItems.icon, href: '/favourites', description: strings.home.featureCards.savedItems.description }
              ].map((card) => (
                <SmartNavigationLink key={card.href} href={card.href} className="block" title={card.title}>
                  <div className="bg-card rounded-lg shadow-sm border border-border p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-primary/10">
                        <span className="text-2xl">{card.icon}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{card.title}</h3>
                        <p className="text-sm text-muted-foreground">{card.description}</p>
                      </div>
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </SmartNavigationLink>
              ))}
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-border"></div>

          {/* App Settings Section */}
          <section>
            <h3 className="text-lg font-bold text-foreground mb-3">App Settings</h3>
            <div className="space-y-3">
              {[
                { title: strings.home.featureCards.account.title, icon: strings.home.featureCards.account.icon, href: '/account', description: strings.home.featureCards.account.description },
                { title: strings.home.featureCards.settings.title, icon: strings.home.featureCards.settings.icon, href: '/settings', description: strings.home.featureCards.settings.description }
              ].map((card) => (
                <SmartNavigationLink key={card.href} href={card.href} className="block" title={card.title}>
                  <div className="bg-card rounded-lg shadow-sm border border-border p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-primary/10">
                        <span className="text-2xl">{card.icon}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{card.title}</h3>
                        <p className="text-sm text-muted-foreground">{card.description}</p>
                      </div>
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </SmartNavigationLink>
              ))}
            </div>
          </section>

        </div>
      </div>
      </div>
    </div>
  );
}