/**
 * Activity Tracker Service
 * Fetches and aggregates user activity data from Firebase
 */

import { db } from '@/lib/firebase';
import { collection, doc, getDoc, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';

export interface WeeklyActivity {
  articlesRead: number;
  moodboardsViewed: number;
  storiesCompleted: number;
  kanjiStudied: number;
  vocabularyReviewed: number;
  drillsCompleted: number;
  achievementsUnlocked: number;
  studyStreakDays: number;
  totalStudyMinutes: number;
  searchesPerformed: number;
  flashcardsReviewed: number;
  videosWatched: number;
  gamesPlayed: number;
}

export interface ActivityDetail {
  id: string;
  title: string;
  subtitle?: string;
  timestamp?: Date;
  metadata?: any;
}

export interface ActivityItem {
  type: string;
  count: number;
  label: string;
  icon: string;
  color: string;
  trend?: 'up' | 'down' | 'stable';
  percentChange?: number;
  details?: ActivityDetail[]; // New: detailed information
}

/**
 * Get weekly activity data for a user
 */
export async function getWeeklyActivity(userId: string): Promise<WeeklyActivity> {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const activity: WeeklyActivity = {
    articlesRead: 0,
    moodboardsViewed: 0,
    storiesCompleted: 0,
    kanjiStudied: 0,
    vocabularyReviewed: 0,
    drillsCompleted: 0,
    achievementsUnlocked: 0,
    studyStreakDays: 0,
    totalStudyMinutes: 0,
    searchesPerformed: 0,
    flashcardsReviewed: 0,
    videosWatched: 0,
    gamesPlayed: 0
  };

  try {
    // 1. Get usage data from the current usage document
    const usageDocRef = doc(db, 'users', userId, 'usage', 'current');
    const usageSnapshot = await getDoc(usageDocRef);
    
    if (usageSnapshot.exists()) {
      const latestUsage = usageSnapshot.data();
      if (latestUsage?.daily) {
        activity.articlesRead = latestUsage.daily.article_reading || 0;
        activity.moodboardsViewed = latestUsage.daily.mood_board_viewing || 0;
        activity.drillsCompleted = latestUsage.daily.drill_practice || 0;
        activity.vocabularyReviewed = latestUsage.daily.vocabulary_lookup || 0;
        activity.videosWatched = latestUsage.daily.youtube_shadowing || 0;
      }
    }

    // 2. Get stories completed this week
    const storiesRef = collection(db, 'reading_progress');
    const storiesQuery = query(
      storiesRef,
      where('userId', '==', userId),
      where('completedAt', '>=', Timestamp.fromDate(oneWeekAgo))
    );
    const storiesSnapshot = await getDocs(storiesQuery);
    activity.storiesCompleted = storiesSnapshot.size;

    // 3. Get kanji study sessions from this week
    const kanjiSessionsRef = collection(db, 'users', userId, 'kanjiStudySessions');
    const kanjiQuery = query(
      kanjiSessionsRef,
      orderBy('date', 'desc'),
      limit(7)
    );
    const kanjiSnapshot = await getDocs(kanjiQuery);
    
    let totalKanji = 0;
    let totalMinutes = 0;
    kanjiSnapshot.forEach(doc => {
      const data = doc.data();
      totalKanji += data.kanjiReviewed || 0;
      totalMinutes += Math.round((data.timeSpent || 0) / 60000); // Convert ms to minutes
    });
    activity.kanjiStudied = totalKanji;
    activity.totalStudyMinutes = totalMinutes;

    // 4. Get achievements unlocked this week
    const achievementsRef = collection(db, 'users', userId, 'unlockedAchievements');
    const achievementsSnapshot = await getDocs(achievementsRef);
    
    let weeklyAchievements = 0;
    achievementsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.unlockedAt) {
        const unlockedDate = data.unlockedAt.toDate ? data.unlockedAt.toDate() : new Date(data.unlockedAt);
        if (unlockedDate >= oneWeekAgo) {
          weeklyAchievements++;
        }
      }
    });
    activity.achievementsUnlocked = weeklyAchievements;

    // 5. Get study streak
    const achievementStatsRef = collection(db, 'users', userId, 'achievementStats');
    const statsSnapshot = await getDocs(achievementStatsRef);
    if (!statsSnapshot.empty) {
      const stats = statsSnapshot.docs[0]?.data();
      activity.studyStreakDays = stats?.currentStreak || 0;
    }

    // 6. Get search history count
    const searchRef = collection(db, 'users', userId, 'searchHistory');
    const searchSnapshot = await getDocs(searchRef);
    if (!searchSnapshot.empty) {
      const searchData = searchSnapshot.docs[0]?.data();
      if (searchData?.history && Array.isArray(searchData.history)) {
        const recentSearches = searchData.history.filter((search: any) => {
          const searchDate = search.timestamp?.toDate ? search.timestamp.toDate() : new Date(search.timestamp);
          return searchDate >= oneWeekAgo;
        });
        activity.searchesPerformed = recentSearches.length;
      }
    }

    // 7. Get flashcards reviewed (from review_hub collection)
    const reviewHubRef = collection(db, 'review_hub');
    const reviewQuery = query(
      reviewHubRef,
      where('userId', '==', userId),
      where('metadata.lastReviewedAt', '>=', Timestamp.fromDate(oneWeekAgo))
    );
    const reviewSnapshot = await getDocs(reviewQuery);
    activity.flashcardsReviewed = reviewSnapshot.size;

    // 8. Get games played
    const gameProgressRef = collection(db, 'gameProgress');
    const gameQuery = query(
      gameProgressRef,
      where('userId', '==', userId),
      where('lastPlayed', '>=', Timestamp.fromDate(oneWeekAgo))
    );
    const gameSnapshot = await getDocs(gameQuery);
    activity.gamesPlayed = gameSnapshot.size;

  } catch (error) {
    console.error('Error fetching weekly activity:', error);
  }

  return activity;
}

/**
 * Get monthly activity data for a user
 */
export async function getMonthlyActivity(userId: string): Promise<WeeklyActivity> {
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
  
  const activity: WeeklyActivity = {
    articlesRead: 0,
    moodboardsViewed: 0,
    storiesCompleted: 0,
    kanjiStudied: 0,
    vocabularyReviewed: 0,
    drillsCompleted: 0,
    achievementsUnlocked: 0,
    studyStreakDays: 0,
    totalStudyMinutes: 0,
    searchesPerformed: 0,
    flashcardsReviewed: 0,
    videosWatched: 0,
    gamesPlayed: 0
  };

  try {
    // 1. Get usage data from the current usage document
    const usageDocRef = doc(db, 'users', userId, 'usage', 'current');
    const usageSnapshot = await getDoc(usageDocRef);
    
    if (usageSnapshot.exists()) {
      const latestUsage = usageSnapshot.data();
      // For monthly, we use totals instead of daily
      if (latestUsage?.totals) {
        activity.articlesRead = latestUsage.totals.article_reading || 0;
        activity.moodboardsViewed = latestUsage.totals.mood_board_viewing || 0;
        activity.drillsCompleted = latestUsage.totals.drill_practice || 0;
        activity.vocabularyReviewed = latestUsage.totals.vocabulary_lookup || 0;
        activity.videosWatched = latestUsage.totals.youtube_shadowing || 0;
      } else if (latestUsage?.daily) {
        // Fallback to daily * 4 if totals not available
        activity.articlesRead = (latestUsage.daily.article_reading || 0) * 4;
        activity.moodboardsViewed = (latestUsage.daily.mood_board_viewing || 0) * 4;
        activity.drillsCompleted = (latestUsage.daily.drill_practice || 0) * 4;
        activity.vocabularyReviewed = (latestUsage.daily.vocabulary_lookup || 0) * 4;
        activity.videosWatched = (latestUsage.daily.youtube_shadowing || 0) * 4;
      }
    }

    // 2. Get stories completed this month
    const storiesRef = collection(db, 'reading_progress');
    const storiesQuery = query(
      storiesRef,
      where('userId', '==', userId),
      where('completedAt', '>=', Timestamp.fromDate(oneMonthAgo))
    );
    const storiesSnapshot = await getDocs(storiesQuery);
    activity.storiesCompleted = storiesSnapshot.size;

    // 3. Get kanji study sessions from this month
    const kanjiSessionsRef = collection(db, 'users', userId, 'kanjiStudySessions');
    const kanjiQuery = query(
      kanjiSessionsRef,
      orderBy('date', 'desc'),
      limit(30)
    );
    const kanjiSnapshot = await getDocs(kanjiQuery);
    
    let totalKanji = 0;
    let totalMinutes = 0;
    kanjiSnapshot.forEach(doc => {
      const data = doc.data();
      const sessionDate = data.date?.toDate ? data.date.toDate() : new Date(data.date);
      if (sessionDate >= oneMonthAgo) {
        totalKanji += data.kanjiReviewed || 0;
        totalMinutes += Math.round((data.timeSpent || 0) / 60000); // Convert ms to minutes
      }
    });
    activity.kanjiStudied = totalKanji;
    activity.totalStudyMinutes = totalMinutes;

    // 4. Get achievements unlocked this month
    const achievementsRef = collection(db, 'users', userId, 'unlockedAchievements');
    const achievementsSnapshot = await getDocs(achievementsRef);
    
    let monthlyAchievements = 0;
    achievementsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.unlockedAt) {
        const unlockedDate = data.unlockedAt.toDate ? data.unlockedAt.toDate() : new Date(data.unlockedAt);
        if (unlockedDate >= oneMonthAgo) {
          monthlyAchievements++;
        }
      }
    });
    activity.achievementsUnlocked = monthlyAchievements;

    // 5. Get study streak
    const achievementStatsRef = collection(db, 'users', userId, 'achievementStats');
    const statsSnapshot = await getDocs(achievementStatsRef);
    if (!statsSnapshot.empty) {
      const stats = statsSnapshot.docs[0]?.data();
      activity.studyStreakDays = stats?.currentStreak || 0;
    }

    // 6. Get search history count
    const searchRef = collection(db, 'users', userId, 'searchHistory');
    const searchSnapshot = await getDocs(searchRef);
    if (!searchSnapshot.empty) {
      const searchData = searchSnapshot.docs[0]?.data();
      if (searchData?.history && Array.isArray(searchData.history)) {
        const recentSearches = searchData.history.filter((search: any) => {
          const searchDate = search.timestamp?.toDate ? search.timestamp.toDate() : new Date(search.timestamp);
          return searchDate >= oneMonthAgo;
        });
        activity.searchesPerformed = recentSearches.length;
      }
    }

    // 7. Get flashcards reviewed (from review_hub collection)
    const reviewHubRef = collection(db, 'review_hub');
    const reviewQuery = query(
      reviewHubRef,
      where('userId', '==', userId),
      where('metadata.lastReviewedAt', '>=', Timestamp.fromDate(oneMonthAgo))
    );
    const reviewSnapshot = await getDocs(reviewQuery);
    activity.flashcardsReviewed = reviewSnapshot.size;

    // 8. Get games played
    const gameProgressRef = collection(db, 'gameProgress');
    const gameQuery = query(
      gameProgressRef,
      where('userId', '==', userId),
      where('lastPlayed', '>=', Timestamp.fromDate(oneMonthAgo))
    );
    const gameSnapshot = await getDocs(gameQuery);
    activity.gamesPlayed = gameSnapshot.size;

  } catch (error) {
    console.error('Error fetching monthly activity:', error);
  }

  return activity;
}

/**
 * Get detailed activity data with rich information
 */
export async function getDetailedWeeklyActivity(userId: string): Promise<ActivityItem[]> {
  return getDetailedActivity(userId, 7);
}

/**
 * Get detailed monthly activity data with rich information
 */
export async function getDetailedMonthlyActivity(userId: string): Promise<ActivityItem[]> {
  return getDetailedActivity(userId, 30);
}

/**
 * Get detailed activity data for a specific time range
 */
async function getDetailedActivity(userId: string, daysAgo: number): Promise<ActivityItem[]> {
  console.log(`getDetailedActivity called for user: ${userId}, days: ${daysAgo}`);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysAgo);
  
  const activities: ActivityItem[] = [];

  // 1. YouTube Videos Watched with titles
  try {
    console.log('Fetching YouTube videos...');
    // Check root level userPracticeHistory collection
    const userPracticeHistoryRef = collection(db, 'userPracticeHistory');
    const videosQuery = query(
      userPracticeHistoryRef,
      where('userId', '==', userId)
    );
    const videosSnapshot = await getDocs(videosQuery);
    const videoDetails: ActivityDetail[] = [];
    
    videosSnapshot.forEach(doc => {
      const data = doc.data();
      console.log('Video data found:', data);
      // Handle Firestore Timestamp objects
      let lastPracticed = null;
      if (data.lastPracticed) {
        if (typeof data.lastPracticed.toDate === 'function') {
          lastPracticed = data.lastPracticed.toDate();
        } else if (data.lastPracticed.seconds) {
          // Handle raw timestamp with seconds
          lastPracticed = new Date(data.lastPracticed.seconds * 1000);
        } else {
          lastPracticed = new Date(data.lastPracticed);
        }
      }
      console.log('Converted lastPracticed:', lastPracticed, 'startDate:', startDate);
      
      // Add videos practiced within the time range
      if ((data.videoTitle || data.videoId) && lastPracticed && lastPracticed >= startDate) {
        // Clean up the video title
        let videoTitle = data.videoTitle || 'Untitled Video';
        // Remove common YouTube suffixes
        videoTitle = videoTitle.replace(/ - YouTube$/, '').replace(/ \| YouTube$/, '');
        
        // Format practice count text
        const practiceCount = data.practiceCount || 1;
        const practiceText = practiceCount === 1 ? '1 practice' : `${practiceCount} practices`;
        
        videoDetails.push({
          id: doc.id,
          title: videoTitle,
          subtitle: practiceText + (data.videoUrl ? ' • View on YouTube' : ''),
          timestamp: lastPracticed,
          metadata: { 
            practiceCount: practiceCount,
            videoUrl: data.videoUrl,
            videoId: data.videoId,
            duration: data.duration
          }
        });
      }
    });

    // Sort by most recent first
    videoDetails.sort((a, b) => {
      const aTime = a.timestamp?.getTime() || 0;
      const bTime = b.timestamp?.getTime() || 0;
      return bTime - aTime;
    });
    
    console.log('Found video details:', videoDetails.length);
    if (videoDetails.length > 0) {
      activities.push({
        type: 'videos',
        count: videoDetails.length,
        label: 'Videos Practiced',
        icon: '/flat-icons/ui/youtube.svg',
        color: 'bg-red-500',
        details: videoDetails
      });
    }
  } catch (error) {
    console.error('Error fetching video history:', error);
  }

  // 2. Games Played with names and play counts
  try {
    console.log('Fetching games for userId:', userId);
    
    // First try the root gameProgress collection
    const gameProgressRef = collection(db, 'gameProgress');
    let gameSnapshot = await getDocs(gameProgressRef);
    console.log('Total game documents found in root collection:', gameSnapshot.size);
    
    // If no games found, also try user-specific subcollection
    if (gameSnapshot.size === 0) {
      console.log('Trying user-specific gameProgress subcollection...');
      const userGameProgressRef = collection(db, 'users', userId, 'gameProgress');
      gameSnapshot = await getDocs(userGameProgressRef);
      console.log('Total game documents found in user subcollection:', gameSnapshot.size);
    }
    
    const gameDetails: ActivityDetail[] = [];
    const gamePlayCounts: { [key: string]: number } = {};
    
    gameSnapshot.forEach(doc => {
      const data = doc.data();
      
      // Filter for current user's games
      if (data.userId !== userId) {
        console.log('Skipping game for different user:', data.userId);
        return;
      }
      
      console.log('Game data found for current user:', data);
      console.log('Game ID:', doc.id, 'lastPlayed field:', data.lastPlayed, 'updatedAt:', data.updatedAt);
      
      // Handle date conversion - more robust handling
      // Check for lastPlayed OR updatedAt fields
      let lastPlayed = null;
      const dateField = data.lastPlayed || data.updatedAt;
      
      if (dateField) {
        if (typeof dateField.toDate === 'function') {
          // Firestore Timestamp
          lastPlayed = dateField.toDate();
        } else if (dateField.seconds) {
          // Raw timestamp with seconds
          lastPlayed = new Date(dateField.seconds * 1000);
        } else if (typeof dateField === 'string') {
          // String date (ISO format)
          lastPlayed = new Date(dateField);
        } else if (typeof dateField === 'number') {
          // Unix timestamp
          lastPlayed = new Date(dateField);
        } else {
          // Try to parse it anyway
          lastPlayed = new Date(dateField);
        }
      }
      
      // Validate the date
      if (lastPlayed && isNaN(lastPlayed.getTime())) {
        console.warn('Invalid date for game:', doc.id, 'lastPlayed:', data.lastPlayed);
        lastPlayed = null;
      }
      
      console.log('Parsed lastPlayed:', lastPlayed, 'startDate:', startDate);
      
      // Format game name nicely
      let gameName = data.gameId || doc.id;
      
      // Map common game IDs to friendly names
      const gameNameMap: { [key: string]: string } = {
        'kanji_quest': 'Kanji Quest',
        'stroke_order_game': 'Stroke Order Practice',
        'word_match': 'Word Match',
        'hiragana_hunt': 'Hiragana Hunt',
        'katakana_challenge': 'Katakana Challenge',
        'vocabulary_builder': 'Vocabulary Builder',
        'grammar_quiz': 'Grammar Quiz',
        'particle_puzzle': 'Particle Puzzle',
        'verb_conjugation': 'Verb Conjugation',
        'reading_comprehension': 'Reading Comprehension'
      };
      
      gameName = gameNameMap[gameName.toLowerCase()] || 
                 gameName.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      
      // Track play counts
      gamePlayCounts[gameName] = (gamePlayCounts[gameName] || 0) + 1;
      
      // Calculate total play time if available
      const playTime = data.totalPlayTime ? Math.round(data.totalPlayTime / 60) : 0; // Convert to minutes
      const sessionsPlayed = data.sessionsPlayed || data.gamesPlayed || 1;
      
      // Add game if it has been played and we have a valid date
      // Also include games without dates but with other activity indicators
      const shouldInclude = (lastPlayed && lastPlayed >= startDate) || 
                           (!lastPlayed && (data.experience > 0 || data.currentLevel > 1));
      
      console.log('Should include game?', shouldInclude, 'for', gameName);
      
      if (shouldInclude) {
        // Use current date if no lastPlayed date is available
        const displayDate = lastPlayed || new Date();
        
        gameDetails.push({
          id: doc.id,
          title: gameName,
          subtitle: `Level ${data.currentLevel || 1} • ${data.experience || 0} XP • ${sessionsPlayed} sessions`,
          timestamp: displayDate,
          metadata: { 
            trustScore: data.trustScore,
            streak: data.streak_7,
            level: data.currentLevel || 1,
            experience: data.experience || 0,
            playTime: playTime,
            sessionsPlayed: sessionsPlayed,
            highScore: data.highScore || 0
          }
        });
      }
    });
    
    // Sort by most recently played
    gameDetails.sort((a, b) => {
      const aTime = a.timestamp?.getTime() || 0;
      const bTime = b.timestamp?.getTime() || 0;
      return bTime - aTime;
    });

    console.log(`Found ${gameDetails.length} games played`);
    if (gameDetails.length > 0) {
      activities.push({
        type: 'games',
        count: gameDetails.length,
        label: 'Games Played',
        icon: '🎮',
        color: 'bg-purple-500',
        details: gameDetails
      });
    }
  } catch (error) {
    console.error('Error fetching game progress:', error);
  }

  // 3. Search History - Japanese words only
  try {
    console.log('Fetching search history...');
    const searchHistoryRef = doc(db, 'users', userId, 'searchHistory', 'data');
    const searchSnapshot = await getDoc(searchHistoryRef);
    const searchDetails: ActivityDetail[] = [];
    
    if (searchSnapshot.exists()) {
      const searchData = searchSnapshot.data();
      console.log('Search history data:', searchData);
      
      if (searchData.history && Array.isArray(searchData.history)) {
        // Process each search entry
        searchData.history.forEach((search: any) => {
          const searchDate = search.timestamp?.toDate ? search.timestamp.toDate() : new Date(search.timestamp);
          
          // Only include searches within the date range
          if (searchDate >= startDate) {
            // Get the Japanese word (kanji or kana)
            const japaneseWord = search.kanji || search.kana || search.japanese || '';
            const meaning = search.meaning || search.english || '';
            
            // Only add if we have a Japanese word
            if (japaneseWord) {
              searchDetails.push({
                id: search.id || `search-${Date.now()}-${Math.random()}`,
                title: japaneseWord, // Show only the Japanese word
                subtitle: meaning ? meaning.substring(0, 50) + (meaning.length > 50 ? '...' : '') : '',
                timestamp: searchDate,
                metadata: { 
                  type: search.type || 'word',
                  reading: search.reading || search.furigana || '',
                  partOfSpeech: search.partOfSpeech || []
                }
              });
            }
          }
        });
        
        // Sort by most recent first
        searchDetails.sort((a, b) => {
          const aTime = a.timestamp?.getTime() || 0;
          const bTime = b.timestamp?.getTime() || 0;
          return bTime - aTime;
        });
      }
    }

    console.log(`Found ${searchDetails.length} search items`);
    if (searchDetails.length > 0) {
      activities.push({
        type: 'searches',
        count: searchDetails.length,
        label: 'Words Looked Up',
        icon: '🔍',
        color: 'bg-blue-500',
        details: searchDetails.slice(0, 20) // Show up to 20 most recent
      });
    }
  } catch (error) {
    console.error('Error fetching search history:', error);
  }

  // 4. System-Generated Lists (Daily Kanji, JLPT, etc.)
  try {
    console.log('Fetching system-generated lists...');
    
    // System lists are stored as individual documents under studyLists collection
    const studyListsRef = collection(db, 'users', userId, 'studyLists');
    const studyListsSnapshot = await getDocs(studyListsRef);
    const systemListDetails: ActivityDetail[] = [];
    
    console.log('Study lists found:', studyListsSnapshot.size);
    
    studyListsSnapshot.forEach(doc => {
      // Skip the 'data' document as it contains user lists, not system lists
      if (doc.id === 'data') return;
      
      const data = doc.data();
      console.log('System-generated list document:', doc.id, data);
      
      // Format system list names nicely
      let listName = doc.id;
      if (listName === 'list_daily_kanji') {
        listName = '📅 Daily Kanji Practice';
      } else if (listName.includes('jlpt')) {
        listName = '🎯 ' + listName.replace('list_jlpt_', 'JLPT ').replace(/_/g, ' ').toUpperCase();
      } else {
        // Format other system list names
        listName = '📚 ' + listName.replace(/^list_/, '').replace(/_/g, ' ')
          .replace(/\b\w/g, (l: string) => l.toUpperCase());
      }
      
      // System lists might store items differently (could be array or object)
      let itemCount = 0;
      if (Array.isArray(data)) {
        itemCount = data.length;
      } else if (data.items && Array.isArray(data.items)) {
        itemCount = data.items.length;
      } else if (data.itemIds && Array.isArray(data.itemIds)) {
        itemCount = data.itemIds.length;
      }
      
      // Use current date for system lists as they're regularly updated
      const timestamp = new Date();
      
      if (itemCount > 0 || doc.id.startsWith('list_')) {
        systemListDetails.push({
          id: doc.id,
          title: listName,
          subtitle: `${itemCount} items`,
          timestamp: timestamp,
          metadata: { 
            itemCount: itemCount,
            type: 'system_list',
            isSystemGenerated: true
          }
        });
      }
    });
    
    // Add system lists as a separate activity type
    if (systemListDetails.length > 0) {
      activities.push({
        type: 'lists',
        count: systemListDetails.length,
        label: 'Lists',
        icon: '📚',
        color: 'bg-indigo-500',
        details: systemListDetails
      });
    }
  } catch (error) {
    console.error('Error fetching system lists:', error);
  }

  // 5. User-Created Saved Items (myWord-1, myKanji-1, etc.)
  try {
    console.log('Fetching user saved items...');
    const savedItemDetails: ActivityDetail[] = [];
    
    // Get user-created lists from the data document
    const studyListsDataRef = doc(db, 'users', userId, 'studyLists', 'data');
    const dataDoc = await getDoc(studyListsDataRef);
    
    if (dataDoc.exists()) {
      const allLists = dataDoc.data();
      console.log('User saved lists data found:', Object.keys(allLists));
      
      // Process the studyLists array (user-created saved lists like myWord-1, myKanji-1)
      if (allLists.studyLists && Array.isArray(allLists.studyLists)) {
        console.log(`Found ${allLists.studyLists.length} user-created saved lists`);
        
        allLists.studyLists.forEach((list: any) => {
          if (list.name && list.itemIds) {
            const itemCount = Array.isArray(list.itemIds) ? list.itemIds.length : 0;
            
            // Parse timestamp
            let timestamp = new Date();
            if (list.updatedAt) {
              timestamp = list.updatedAt.toDate ? list.updatedAt.toDate() : new Date(list.updatedAt);
            } else if (list.createdAt) {
              timestamp = list.createdAt.toDate ? list.createdAt.toDate() : new Date(list.createdAt);
            }
            
            savedItemDetails.push({
              id: list.id || list.name,
              title: list.name,
              subtitle: `${itemCount} items • ${list.description || 'Personal collection'}`,
              timestamp: timestamp,
              metadata: {
                itemCount: itemCount,
                type: list.type || 'flashcard',
                color: list.color,
                description: list.description,
                items: list.itemIds?.slice(0, 3),
                isUserCreated: true,
                listId: list.id // Important for navigation
              }
            });
          }
        });
      }
    }
    
    // Also check savedStudyItems collection for additional saved items
    try {
      const savedStudyItemsRef = collection(db, 'users', userId, 'savedStudyItems');
      const savedSnapshot = await getDocs(savedStudyItemsRef);
      
      savedSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.items && data.items.length > 0) {
          savedItemDetails.push({
            id: doc.id,
            title: data.name || doc.id.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
            subtitle: `${data.items.length} items • Custom collection`,
            timestamp: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            metadata: {
              itemCount: data.items.length,
              type: 'saved_items',
              listId: doc.id
            }
          });
        }
      });
    } catch (error) {
      console.error('Error fetching saved study items:', error);
    }

    if (savedItemDetails.length > 0) {
      // Sort by most recent first
      savedItemDetails.sort((a, b) => {
        const aTime = a.timestamp?.getTime() || 0;
        const bTime = b.timestamp?.getTime() || 0;
        return bTime - aTime;
      });
      
      activities.push({
        type: 'savedItems',
        count: savedItemDetails.length,
        label: 'Saved Items',
        icon: '⭐',
        color: 'bg-purple-500',
        details: savedItemDetails
      });
    }

    // 5. Textbook Vocabulary Progress
    const textbookVocabRef = collection(db, 'users', userId, 'textbookVocabularyProgress');
    const textbookSnapshot = await getDocs(textbookVocabRef);
    const textbookDetails: ActivityDetail[] = [];
    
    textbookSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.genki1_l1_w1 !== undefined || data.genki1_l1_w2 !== undefined) {
        // Parse the document ID to get textbook and lesson info
        const parts = doc.id.match(/genki(\d+)_l(\d+)/);
        if (parts) {
          textbookDetails.push({
            id: doc.id,
            title: `Genki ${parts[1]} - Lesson ${parts[2]}`,
            subtitle: `Progress tracked`,
            timestamp: new Date(),
            metadata: data
          });
        }
      }
    });

    if (textbookDetails.length > 0) {
      activities.push({
        type: 'textbooks',
        count: textbookDetails.length,
        label: 'Textbook Lessons',
        icon: '📖',
        color: 'bg-orange-500',
        details: textbookDetails
      });
    }

    // 6. Kanji Study Sessions with details
    const kanjiSessionsRef = collection(db, 'users', userId, 'kanjiStudySessions');
    const kanjiQuery = query(
      kanjiSessionsRef,
      orderBy('date', 'desc'),
      limit(7)
    );
    const kanjiSnapshot = await getDocs(kanjiQuery);
    const kanjiDetails: ActivityDetail[] = [];
    
    kanjiSnapshot.forEach(doc => {
      const data = doc.data();
      const sessionDate = data.date?.toDate ? data.date.toDate() : new Date(data.date);
      if (sessionDate >= startDate) {
        kanjiDetails.push({
          id: doc.id,
          title: `${data.kanjiReviewed || 0} kanji studied`,
          subtitle: `${Math.round((data.timeSpent || 0) / 60000)} minutes`,
          timestamp: sessionDate,
          metadata: { accuracy: data.accuracy }
        });
      }
    });

    if (kanjiDetails.length > 0) {
      activities.push({
        type: 'kanji',
        count: kanjiDetails.reduce((sum, k) => sum + (parseInt(k.title) || 0), 0),
        label: 'Kanji Studied',
        icon: '漢',
        color: 'bg-purple-500',
        details: kanjiDetails
      });
    }

    // 7. Get usage data for other activities
    const usageDocRef = doc(db, 'users', userId, 'usage', 'current');
    const usageSnapshot = await getDoc(usageDocRef);
    
    if (usageSnapshot.exists()) {
      const latestUsage = usageSnapshot.data();
      if (latestUsage?.daily) {
        // Add other activities without details for now
        if (latestUsage.daily.article_reading > 0) {
          activities.push({
            type: 'articles',
            count: latestUsage.daily.article_reading,
            label: 'Articles Read',
            icon: '🗞️',
            color: 'bg-blue-500'
          });
        }
        
        if (latestUsage.daily.mood_board_viewing > 0) {
          activities.push({
            type: 'moodboards',
            count: latestUsage.daily.mood_board_viewing,
            label: 'Mood Boards',
            icon: '🗺️',
            color: 'bg-pink-500'
          });
        }
        
        if (latestUsage.daily.drill_practice > 0) {
          activities.push({
            type: 'drills',
            count: latestUsage.daily.drill_practice,
            label: 'Drills Completed',
            icon: '⚡',
            color: 'bg-yellow-500'
          });
        }
      }
    }
  } catch (error) {
    console.error('Error fetching usage data:', error);
  }

  // If no detailed activities were found, fetch basic activities
  if (activities.length === 0) {
    console.log('No detailed activities found, fetching basic activities...');
    const basicActivity = daysAgo <= 7 ? await getWeeklyActivity(userId) : await getMonthlyActivity(userId);
    return transformActivityData(basicActivity);
  }

  return activities;
}

/**
 * Transform activity data into display items
 */
export function transformActivityData(activity: WeeklyActivity): ActivityItem[] {
  const items: ActivityItem[] = [];

  // Only add items with non-zero counts
  if (activity.articlesRead > 0) {
    items.push({
      type: 'articles',
      count: activity.articlesRead,
      label: 'Articles Read',
      icon: '🗞️',
      color: 'bg-blue-500'
    });
  }

  if (activity.kanjiStudied > 0) {
    items.push({
      type: 'kanji',
      count: activity.kanjiStudied,
      label: 'Kanji Studied',
      icon: '漢',
      color: 'bg-purple-500'
    });
  }

  if (activity.vocabularyReviewed > 0) {
    items.push({
      type: 'vocabulary',
      count: activity.vocabularyReviewed,
      label: 'Words Reviewed',
      icon: '📖',
      color: 'bg-green-500'
    });
  }

  if (activity.storiesCompleted > 0) {
    items.push({
      type: 'stories',
      count: activity.storiesCompleted,
      label: 'Stories Completed',
      icon: '📚',
      color: 'bg-orange-500'
    });
  }

  if (activity.moodboardsViewed > 0) {
    items.push({
      type: 'moodboards',
      count: activity.moodboardsViewed,
      label: 'Mood Boards',
      icon: '🗺️',
      color: 'bg-pink-500'
    });
  }

  if (activity.videosWatched > 0) {
    items.push({
      type: 'videos',
      count: activity.videosWatched,
      label: 'Videos Practiced',
      icon: '📺',
      color: 'bg-red-500'
    });
  }

  if (activity.drillsCompleted > 0) {
    items.push({
      type: 'drills',
      count: activity.drillsCompleted,
      label: 'Drills Completed',
      icon: '⚡',
      color: 'bg-yellow-500'
    });
  }

  // Add new activity types that were missing
  if (activity.searchesPerformed && activity.searchesPerformed > 0) {
    items.push({
      type: 'searches',
      count: activity.searchesPerformed,
      label: 'Searches Made',
      icon: '🔍',
      color: 'bg-indigo-500'
    });
  }

  if (activity.gamesPlayed && activity.gamesPlayed > 0) {
    items.push({
      type: 'games',
      count: activity.gamesPlayed,
      label: 'Games Played',
      icon: '🎮',
      color: 'bg-purple-500'
    });
  }

  if (activity.flashcardsReviewed && activity.flashcardsReviewed > 0) {
    items.push({
      type: 'flashcards',
      count: activity.flashcardsReviewed,
      label: 'Flashcards',
      icon: '🎴',
      color: 'bg-teal-500'
    });
  }

  if (activity.achievementsUnlocked && activity.achievementsUnlocked > 0) {
    items.push({
      type: 'achievements',
      count: activity.achievementsUnlocked,
      label: 'Achievements',
      icon: '🏆',
      color: 'bg-amber-500'
    });
  }

  if (activity.studyStreakDays && activity.studyStreakDays > 0) {
    items.push({
      type: 'streak',
      count: activity.studyStreakDays,
      label: 'Day Streak',
      icon: '🔥',
      color: 'bg-red-600'
    });
  }

  if (activity.totalStudyMinutes && activity.totalStudyMinutes > 0) {
    items.push({
      type: 'time',
      count: activity.totalStudyMinutes,
      label: 'Minutes Studied',
      icon: '⏱️',
      color: 'bg-cyan-500'
    });
  }

  return items;
}

/**
 * Get comparison with previous week
 */
export async function getWeeklyComparison(userId: string): Promise<{ current: WeeklyActivity; previous: WeeklyActivity }> {
  const current = await getWeeklyActivity(userId);
  
  // For now, return the same data for previous week
  // In production, we'd query 2 weeks ago to 1 week ago
  const previous = { ...current };
  
  return { current, previous };
}