'use client';

import { useState, useEffect } from 'react';
import { useStrings } from '@/contexts/LanguageContext';
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { getTimeBasedStats } from '@/utils/timeBasedStats';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import Confetti from 'react-confetti';
import { motion } from 'framer-motion';

// List of available avatars from flat-icons
const AVATAR_OPTIONS = [
  // Animals
  '/flat-icons/4193242-animals/svg/026-squirrel.svg',
  '/flat-icons/4193242-animals/svg/020-goat.svg',
  '/flat-icons/4193242-animals/svg/019-llama.svg',
  '/flat-icons/4193242-animals/svg/015-alpaca.svg',
  '/flat-icons/4193242-animals/svg/010-rabbit.svg',
  '/flat-icons/4193242-animals/svg/008-hedgehog.svg',
  '/flat-icons/4193242-animals/svg/007-pig.svg',
  '/flat-icons/4193242-animals/svg/006-cow.svg',
  '/flat-icons/4193242-animals/svg/005-horse.svg',
  '/flat-icons/4193242-animals/svg/004-sheep.svg',
  '/flat-icons/4193242-animals/svg/003-flamingo.svg',
  '/flat-icons/4193242-animals/svg/002-buffalo.svg',
  // Summer Watermelon
  '/flat-icons/17517790-summer-watermelon/svg/020-ok.svg',
  '/flat-icons/17517790-summer-watermelon/svg/018-valentin-day.svg',
  '/flat-icons/17517790-summer-watermelon/svg/014-angel.svg',
  '/flat-icons/17517790-summer-watermelon/svg/013-wow.svg',
  '/flat-icons/17517790-summer-watermelon/svg/011-laugh-emoji.svg',
  '/flat-icons/17517790-summer-watermelon/svg/002-love.svg',
  '/flat-icons/17517790-summer-watermelon/svg/001-happy.svg',
  // Wild Animals
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/001-raccoon.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/002-zebra.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/003-bear.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/004-cheetah.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/005-fox.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/006-leopard.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/007-giraffe.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/008-koala.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/009-panda-bear.svg',
  '/flat-icons/8376275-wild-animals-flat-1-of-1/svg/010-tiger.svg',
  // Education icons
  '/flat-icons/4341021-education/svg/011-book.svg',
  '/flat-icons/4341021-education/svg/017-dictionary.svg',
  '/flat-icons/4341021-education/svg/025-medal.svg',
  '/flat-icons/4341021-education/svg/037-trophy.svg',
];

// Function to get a consistent avatar for a user based on their ID
const getUserAvatar = (userId: string): string => {
  // Use user ID to deterministically select an avatar
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  const index = Math.abs(hash) % AVATAR_OPTIONS.length;
  return AVATAR_OPTIONS[index];
};

interface LeaderboardEntry {
  id: string;
  displayName: string;
  photoURL?: string;
  totalScore: number;
  rank: number;
  isCurrentUser?: boolean;
}

type TimePeriod = 'all-time' | 'this-month' | 'this-week' | 'today';

export function LeaderboardPage() {
  const strings = useStrings();
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all-time');
  const [userRank, setUserRank] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    loadLeaderboard();
  }, [timePeriod, user]);

  // Handle window resize for confetti
  useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    updateWindowSize();
    window.addEventListener('resize', updateWindowSize);
    return () => window.removeEventListener('resize', updateWindowSize);
  }, []);

  // Trigger confetti when user rank is determined and they're in top 3
  useEffect(() => {
    if (userRank && userRank <= 3 && !loading) {
      setShowConfetti(true);
      // Stop confetti after 5 seconds
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [userRank, loading]);

  const loadLeaderboard = async () => {
    setLoading(true);
    setError(null);

    try {
      // Query all users from Firebase
      const usersRef = collection(db, 'users');
      const q = query(usersRef, limit(200)); // Get more users to ensure we have enough data
      
      const snapshot = await getDocs(q);
      const entries: LeaderboardEntry[] = [];
      
      // For each user, we need to get their stats from the userStats collection
      for (const userDoc of snapshot.docs) {
        const userData = userDoc.data();
        const isCurrentUser = user?.uid === userDoc.id;
        
        let totalScore = 0;
        
        try {
          if (timePeriod === 'all-time') {
            // Get all-time stats from userStats/{userId}/current/summary
            const statsRef = doc(db, 'userStats', userDoc.id, 'current', 'summary');
            const statsDoc = await getDoc(statsRef);
            
            if (statsDoc.exists()) {
              const statsData = statsDoc.data();
              // The total score is totalActivities
              totalScore = statsData.totalActivities || 0;
            }
          } else {
            // Get time-based stats
            let period: 'today' | 'this-week' | 'this-month';
            switch (timePeriod) {
              case 'today':
                period = 'today';
                break;
              case 'this-week':
                period = 'this-week';
                break;
              case 'this-month':
                period = 'this-month';
                break;
              default:
                period = 'today';
            }
            
            try {
              const timeStats = await getTimeBasedStats(userDoc.id, period);
              if (timeStats) {
                totalScore = timeStats.totalActivities || 0;
              }
            } catch (timeError) {
              console.log(`No time-based stats for user ${userDoc.id} for period ${period}`);
              totalScore = 0;
            }
          }
          
          if (isCurrentUser && totalScore > 0) {
            console.log('Current user stats:', {
              id: userDoc.id,
              email: userData.email,
              timePeriod,
              totalActivities: totalScore
            });
          }
        } catch (error) {
          console.error(`Error loading stats for user ${userDoc.id}:`, error);
        }
        
        // Only include users with scores for time-based views
        if (timePeriod !== 'all-time' && totalScore === 0) {
          continue;
        }
        
        entries.push({
          id: userDoc.id,
          displayName: userData.displayName || userData.email?.split('@')[0] || 'Anonymous',
          photoURL: userData.photoURL,
          totalScore: totalScore,
          rank: 0, // Will be set after sorting
          isCurrentUser
        });
      }

      // Sort by total score (descending)
      entries.sort((a, b) => b.totalScore - a.totalScore);
      
      // Assign ranks and find current user
      let currentUserFound = false;
      entries.forEach((entry, index) => {
        entry.rank = index + 1;
        if (entry.isCurrentUser) {
          currentUserFound = true;
          setUserRank(entry.rank);
        }
      });

      // If current user not found in top entries, they have no score yet
      if (user && !currentUserFound) {
        setUserRank(null);
      }

      // Take top 100 for display
      setLeaderboard(entries.slice(0, 100));
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setError(strings.leaderboard.error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Confetti for top 3 players */}
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={300}
          gravity={0.15}
          colors={['#FFD700', '#FFA500', '#FF6347', '#9370DB', '#00CED1']}
        />
      )}
      
      <div className="mobile-nav-padding">
        {/* Header */}
        <SmartPageHeader 
          title={`🏆 ${strings.leaderboard.title}`}
          description={strings.leaderboard.description}
        />

        {/* Time Period Selector */}
        <div className="px-4 pb-4">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setTimePeriod('all-time')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                timePeriod === 'all-time'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {strings.leaderboard.timePeriods.allTime}
            </button>
            <button
              onClick={() => setTimePeriod('this-month')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                timePeriod === 'this-month'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {strings.leaderboard.timePeriods.thisMonth}
            </button>
            <button
              onClick={() => setTimePeriod('this-week')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                timePeriod === 'this-week'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {strings.leaderboard.timePeriods.thisWeek}
            </button>
            <button
              onClick={() => setTimePeriod('today')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                timePeriod === 'today'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {strings.leaderboard.timePeriods.today}
            </button>
          </div>
        </div>

        {/* User's Rank Card (if logged in) */}
        {user && userRank && (
          <motion.div 
            className="px-4 pb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-gradient-to-r from-primary to-accent rounded-lg p-4 text-primary-foreground shadow-lg">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm opacity-90">{strings.leaderboard.yourRank}</p>
                  <p className="text-xl sm:text-2xl font-bold">{getRankDisplay(userRank)}</p>
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-xs sm:text-sm opacity-90">{strings.leaderboard.totalXP}</p>
                  <p className="text-xl sm:text-2xl font-bold truncate">
                    {formatNumber(leaderboard.find(e => e.isCurrentUser)?.totalScore || 0)}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Leaderboard List */}
        <div className="px-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-muted-foreground">{strings.leaderboard.loading}</p>
            </div>
          ) : error ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
              {error}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="bg-card rounded-lg p-8 text-center">
              <p className="text-muted-foreground">
                {timePeriod === 'all-time' 
                  ? strings.leaderboard.noData 
                  : `No activity recorded ${timePeriod === 'today' ? 'today' : timePeriod === 'this-week' ? 'this week' : 'this month'} yet. Be the first!`}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className={`bg-card rounded-lg p-3 sm:p-4 flex items-center gap-2 sm:gap-3 border shadow-sm hover:shadow-md transition-shadow ${
                    entry.isCurrentUser ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                  } ${entry.rank <= 3 ? 'bg-gradient-to-r from-card to-accent/5' : ''}`}
                >
                  {/* Rank */}
                  <div className={`w-10 sm:w-12 text-center font-bold ${
                    entry.rank <= 3 ? 'text-lg sm:text-xl' : 'text-base sm:text-lg'
                  }`}>
                    {getRankDisplay(entry.rank)}
                  </div>

                  {/* Avatar */}
                  <div className={`rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 ${
                    entry.rank <= 3 ? 'w-10 h-10 sm:w-12 sm:h-12' : 'w-8 h-8 sm:w-10 sm:h-10'
                  }`}>
                    {entry.photoURL ? (
                      <img 
                        src={entry.photoURL} 
                        alt={`${entry.displayName}'s avatar`} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <img 
                        src={getUserAvatar(entry.id)} 
                        alt={`${entry.displayName}'s avatar`} 
                        className="w-full h-full object-contain p-1"
                      />
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate text-sm sm:text-base ${
                      entry.isCurrentUser ? 'text-primary' : 'text-foreground'
                    }`}>
                      {entry.displayName}
                      {entry.isCurrentUser && ` (${strings.leaderboard.you})`}
                    </p>
                  </div>

                  {/* Score */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-foreground text-sm sm:text-base">{formatNumber(entry.totalScore)}</p>
                    <p className="text-xs text-muted-foreground">{strings.leaderboard.xp}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Note about scoring */}
        <div className="px-4 py-6">
          <motion.div 
            className="bg-muted/50 rounded-lg p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-xs sm:text-sm text-muted-foreground">
              <strong>{strings.leaderboard.howScoringWorks}:</strong> {strings.leaderboard.scoringExplanation}
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}