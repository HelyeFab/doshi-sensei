# Leaderboard Feature Documentation

## Overview

The Leaderboard feature provides a competitive element to Doshi Sensei by displaying user rankings based on their total activities. It creates a sense of community and motivation for learners to stay engaged with the platform.

## Key Features

- **Real-time Rankings**: Displays all users sorted by their total activities
- **User Avatars**: Shows Google profile photos or fallback to deterministic flat-icon avatars
- **Confetti Animation**: Celebrates top 3 users with a 5-second confetti animation
- **Mobile Responsive**: Fully optimized for all screen sizes
- **Theme Integration**: Uses the app's theme system for consistent styling
- **Internationalization**: All text strings are configurable through the language system

## Architecture

### Data Flow

```
Firebase Firestore
├── users/{userId}                    # User profile data
│   ├── displayName                   # User's display name
│   ├── photoURL                      # Google profile photo (optional)
│   └── email                         # User's email
│
└── userStats/{userId}/current/summary # User statistics
    └── totalActivities               # Total number of activities (used for ranking)
```

### Component Structure

```
/src/app/leaderboard/
├── page.tsx                          # Next.js page wrapper
└── LeaderboardPage.tsx               # Main leaderboard component

/src/config/strings/
└── en.ts                             # English strings configuration
```

## Implementation Details

### 1. Data Fetching

The leaderboard queries Firebase to get user data and their statistics:

```typescript
// Query all users
const usersRef = collection(db, 'users');
const q = query(usersRef, limit(200));
const snapshot = await getDocs(q);

// For each user, get their stats
const statsRef = doc(db, 'userStats', userDoc.id, 'current', 'summary');
const statsDoc = await getDoc(statsRef);

if (statsDoc.exists()) {
  const statsData = statsDoc.data();
  totalScore = statsData.totalActivities || 0;
}
```

### 2. Avatar System

The leaderboard uses a two-tier avatar system:

1. **Primary**: User's Google profile photo (if available)
2. **Fallback**: Deterministic flat-icon avatar based on user ID hash

```typescript
const getUserAvatar = (userId: string): string => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const index = Math.abs(hash) % AVATAR_OPTIONS.length;
  return AVATAR_OPTIONS[index];
};
```

### 3. Confetti Animation

Top 3 users receive a confetti celebration:

```typescript
useEffect(() => {
  if (userRank && userRank <= 3 && !loading) {
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }
}, [userRank, loading]);
```

### 4. Theme Integration

The component uses theme-aware CSS classes:

- `bg-background` - Dynamic background color
- `text-foreground` - Dynamic text color
- `bg-primary` / `text-primary` - Primary theme colors
- `bg-card` - Card background
- `border-border` - Border colors

### 5. Responsive Design

Mobile-first approach with responsive breakpoints:

```css
- Mobile: Default styles
- Tablet: sm: prefix (640px+)
- Desktop: md: prefix (768px+)
```

## Integration Points

### 1. Stats System

The leaderboard integrates with the app's statistics tracking system:

- Reads from `userStats` collection
- Uses `totalActivities` as the ranking metric
- Does NOT modify any stats (read-only)

### 2. Authentication

Integrates with Firebase Auth to:
- Identify the current user
- Highlight their position in the rankings
- Show personalized rank card

### 3. Navigation

- Uses `SmartPageHeader` component for consistent navigation
- Includes back button to home page
- Mobile-friendly with bottom navbar padding

## Strings Configuration

All user-facing text is configured in `/src/config/strings/en.ts`:

```typescript
leaderboard: {
  title: "Leaderboard",
  description: "View top learners and compete for the highest rank",
  loading: "Loading rankings...",
  error: "Failed to load leaderboard",
  noData: "No leaderboard data available yet",
  yourRank: "Your Rank",
  totalXP: "Total XP",
  xp: "XP",
  you: "You",
  timePeriods: {
    allTime: "All Time",
    thisMonth: "This Month",
    thisWeek: "This Week",
    today: "Today"
  },
  howScoringWorks: "How scoring works",
  scoringExplanation: "Points are earned by completing activities like drills, games, reading stories, and studying flashcards."
}
```

## Future Enhancements

### Time-Based Leaderboards

Currently showing "All Time" only. Future implementation can include:
- This Month
- This Week  
- Today

Requires tracking time-based statistics in Firebase.

### Additional Metrics

Consider tracking:
- XP points (achievement system)
- Specific activity types (games, drills, etc.)
- Study streaks
- Accuracy scores

### Social Features ✅ IMPLEMENTED (January 2025)

Successfully implemented a comprehensive social system with the following features:

#### 1. Friend System
- **Friend Requests**: Send and receive friend requests with proper validation
- **Duplicate Prevention**: Checks for existing requests in both directions
- **Accept/Decline**: Full friend request workflow with notifications
- **Friends List**: View all friends with their avatars and status
- **Remove Friends**: Unfriend functionality with confirmation

#### 2. Follow System
- **Follow/Unfollow**: One-way following without requiring approval
- **Following Tab**: View all users you're following with real-time data
- **Follower Count**: Track follower and following statistics
- **Quick Actions**: Follow/unfollow directly from search results

#### 3. Time-Based Leaderboards
- **Multiple Time Periods**: All Time, This Month, This Week, Today
- **Premium Feature**: Time-based stats tracked only for premium users
- **Real-time Updates**: Leaderboard updates as activities are completed
- **Graceful Fallback**: Free users show 0 for time-based periods

#### Implementation Details

**Key Files Added/Modified:**
- `/src/utils/socialFeatures.ts` - Core social functionality
- `/src/utils/timeBasedStats.ts` - Time-based statistics tracking
- `/src/app/friends/` - Friends management page
- `/src/app/leaderboard/LeaderboardPage.tsx` - Enhanced with time periods
- Updated Firestore rules and indexes for social collections

**Firestore Collections:**
```
userSocial/{userId}
├── followers: string[]
├── following: string[]
├── friends: Friend[]
├── friendRequests: string[]
├── isPublic: boolean
└── allowChallenges: boolean

friendRequests/{requestId}
├── fromUserId: string
├── fromUserName: string
├── fromUserPhoto: string | null
├── toUserId: string
├── toUserName: string
├── toUserPhoto: string | null
├── status: 'pending' | 'accepted' | 'rejected'
└── timestamps

userStats/{userId}/timeBasedStats/{period}_{date}
├── totalActivities: number
├── drillsCompleted: number
├── storiesRead: number
├── articlesRead: number
├── kanjiStudied: number
├── gamesPlayed: number
├── vocabStudied: number
├── flashcardsReviewed: number
├── practiceSessionsCompleted: number
├── totalScore: number
└── lastUpdated: Timestamp
```

**User Experience:**
1. Access friends via dedicated "Friends" card on homepage
2. Search users by email
3. Send friend requests with single click
4. View pending requests with notification badge
5. Follow users without requiring approval
6. See real-time following/follower counts
7. Mobile-optimized with "+" button for adding friends

**Security & Error Handling:**
- Proper Firestore security rules for social data
- Handles non-existent user profiles gracefully
- User-friendly error messages via ConfirmationDialog
- Prevents duplicate friend requests
- Validates all user inputs

### Rewards

- Badges for top positions
- Monthly rewards
- Seasonal competitions
- Special avatars/themes

## Development Guide

### Adding New Avatar Sets

1. Add new avatar paths to `AVATAR_OPTIONS` array
2. Ensure all images are in `/public/flat-icons/`
3. Test avatar distribution with different user IDs

### Modifying Ranking Algorithm

1. Update the stats query in `loadLeaderboard()`
2. Change the sorting logic
3. Update the scoring explanation string

### Adding Time Periods

1. Add time period buttons in the UI
2. Implement date filtering in Firebase queries
3. Update the `timePeriod` state handling
4. Add corresponding strings to config

### Testing

1. **Multiple Users**: Test with various user counts (0, 1, 10, 100+)
2. **Mobile**: Test on different screen sizes
3. **Confetti**: Verify animation triggers for top 3
4. **Performance**: Monitor query performance with large datasets

## Troubleshooting

### Common Issues

1. **Users showing 0 points**
   - Check `userStats` collection exists
   - Verify `totalActivities` field is being updated
   - Ensure stats tracking is working properly

2. **Confetti not showing**
   - Check user rank is 1-3
   - Verify loading state is false
   - Check browser console for errors

3. **Avatars not loading**
   - Verify flat-icon files exist in public folder
   - Check image paths are correct
   - Test fallback avatar logic

4. **Performance issues**
   - Limit query results (currently 200)
   - Consider pagination for large user bases
   - Implement caching strategy

## Security Considerations

- Read-only access to user data
- No sensitive information displayed
- Firestore rules should restrict access appropriately
- Avatar selection is deterministic (no random changes)

## Accessibility

- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- Screen reader friendly
- High contrast theme support

## Performance Optimizations

1. **Query Optimization**
   - Limits results to 200 users
   - Parallel stat fetching where possible
   - Early exit for missing data

2. **Rendering**
   - Staggered animations with Framer Motion
   - Lazy loading of confetti component
   - Memoized avatar calculations

3. **Future Improvements**
   - Implement virtual scrolling for large lists
   - Add result caching
   - Consider server-side rendering for SEO

## Conclusion

The leaderboard feature adds a competitive and social element to Doshi Sensei, encouraging users to stay engaged and track their progress relative to others. Its modular design makes it easy to extend with new features while maintaining performance and user experience.