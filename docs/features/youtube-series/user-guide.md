# YouTube Series - User Guide

## Overview

The YouTube Series feature provides curated Japanese learning content from YouTube, enhanced with learning tools and organized for effective study.

## Accessing YouTube Series

### Navigation
- **Direct URL**: `/tools/youtube-series`
- **From Homepage**: Click "YouTube Series" card
- **From Tools Menu**: Select "YouTube Series"

### Access Levels

| Feature | Guest | Free User | Premium User |
|---------|-------|-----------|--------------|
| Browse Channels | ✅ | ✅ | ✅ |
| View Video Lists | ✅ | ✅ | ✅ |
| Watch on YouTube | ✅ | ✅ | ✅ |
| Read as Resource | ❌ | ✅ (Limited) | ✅ |
| Practice Shadowing | ❌ | ✅ (Limited) | ✅ |
| Premium Channels | ❌ | ❌ | ✅ |

## User Interface

### Main Page Layout

```
┌─────────────────────────────────────────┐
│         Curated Japanese Series         │
│    📚 X Channels | 🎬 Y Videos         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Channel Card                           │
├─────────────────────────────────────────┤
│  [Thumbnail] Channel Name               │
│              Description                │
│              #tags                      │
│                                         │
│  Recent Videos:                        │
│  • Video 1 [Duration] [Actions]        │
│  • Video 2 [Duration] [Actions]        │
│  • Video 3 [Duration] [Actions]        │
│                                         │
│  → View all videos                     │
└─────────────────────────────────────────┘
```

### Visual Elements

#### Channel Information
- **Thumbnail**: Channel profile image
- **Title**: Channel name
- **Description**: Brief channel description
- **Tags**: Content categories and topics
- **Badges**: Special indicators (Premium, New, Popular)

#### Video Information
- **Thumbnail**: Video preview image
- **Title**: Video name
- **Duration**: Length in minutes/seconds
- **Published**: Time since publication
- **Views**: YouTube view count
- **NEW Badge**: Videos added in last 7 days

## Features for Users

### 1. Browsing Channels

#### Channel Organization
- **Alphabetical**: Default sorting by channel name
- **Most Recent**: Channels with newest videos
- **Most Popular**: By total view count
- **Category**: Grouped by content type

#### Channel Details
Each channel card displays:
- Channel avatar and name
- Channel description (truncated)
- Content tags
- 3 most recent videos
- Link to full channel view

### 2. Video Actions

Each video offers three primary actions:

#### 📖 Read as Resource
- Opens video content in structured format
- Includes transcript (if available)
- Progress tracking
- Note-taking capability
- Vocabulary extraction

**Best for**: Detailed study, vocabulary learning, comprehension

#### 🎯 Practice Shadowing
- Opens shadowing practice tool
- Synchronized transcript display
- Playback controls
- Repeat sections
- Speed adjustment

**Best for**: Pronunciation, listening, speaking practice

#### ▶️ Watch on YouTube
- Direct link to YouTube
- Opens in new tab
- Preserves creator metrics
- Access YouTube features

**Best for**: Casual viewing, supporting creators

### 3. Video Indicators

#### Status Badges
- **NEW**: Added within last 7 days
- **HOT**: Trending (high recent engagement)
- **💎 Premium**: Premium users only
- **✓ Transcript**: Transcript available

#### Availability Indicators
- **Green checkmark**: Transcript cached and ready
- **Clock icon**: Transcript pending
- **Lock icon**: Premium content
- **Play icon**: Video available

### 4. Search and Filter

#### Search Options
- Search by video title
- Search by channel name
- Search by tags
- Search by description

#### Filter Options
- **Duration**: Short (<5min), Medium (5-15min), Long (>15min)
- **Transcript**: Available/Not available
- **Level**: Beginner, Intermediate, Advanced
- **Type**: Vlog, Lesson, Story, News
- **Features**: Shadowing enabled, Resource available

### 5. Personal Features

#### Watch History (Logged-in Users)
- Tracks viewed videos
- Resume from last position
- Mark as complete
- Hide watched videos option

#### Favorites (Premium)
- Save favorite channels
- Bookmark videos
- Create custom lists
- Get notifications for new videos

## Learning Workflows

### Workflow 1: Casual Browsing
1. Browse channels on main page
2. Click interesting video thumbnail
3. Choose "Watch on YouTube"
4. Enjoy content casually

### Workflow 2: Intensive Study
1. Select a video with transcript
2. Click "Read as Resource"
3. Study vocabulary and grammar
4. Take notes on difficult sections
5. Review and repeat

### Workflow 3: Shadowing Practice
1. Find video with ✓ Transcript indicator
2. Click "Practice Shadowing"
3. Listen to a section
4. Pause and repeat
5. Compare with transcript
6. Adjust speed as needed

### Workflow 4: Systematic Learning
1. Choose a channel to follow
2. Start with oldest videos
3. Work through chronologically
4. Track progress
5. Review regularly

## Tips for Effective Use

### For Beginners
1. **Start with shorter videos** (<5 minutes)
2. **Look for "beginner" tags**
3. **Use shadowing at 0.75x speed**
4. **Focus on videos with clear speech**
5. **Review same video multiple times**

### For Intermediate Learners
1. **Mix content types** (vlogs, lessons, stories)
2. **Challenge yourself with native speed**
3. **Practice without subtitles first**
4. **Take notes on new expressions**
5. **Try to predict content from titles**

### For Advanced Learners
1. **Focus on natural, unscripted content**
2. **Watch news and current events**
3. **Practice simultaneous shadowing**
4. **Analyze regional dialects**
5. **Engage with complex topics**

## Mobile Experience

### Optimized Features
- **Responsive design**: Adapts to screen size
- **Touch gestures**: Swipe to navigate
- **Video controls**: Large touch targets
- **Offline support**: Cached transcripts
- **Data saving**: Thumbnail optimization

### Mobile-Specific Tips
1. Download transcripts on WiFi
2. Use landscape for shadowing
3. Enable auto-rotate for videos
4. Use headphones for shadowing
5. Bookmark videos for later

## Understanding Limitations

### API Limitations
- Some videos may not have transcripts
- Sync delays for new videos
- Occasional thumbnail loading issues

### Content Limitations
- Not all YouTube videos are included
- Curated selection only
- Some content requires premium

### Technical Limitations
- Requires stable internet for video playback
- Shadowing requires modern browser
- Some features need JavaScript enabled

## Frequently Asked Questions

### General Questions

**Q: Why can't I find a specific YouTube channel?**
A: Only admin-curated channels are available. You can suggest channels through feedback.

**Q: How often are new videos added?**
A: Channels are synced based on their configuration, typically daily.

**Q: Can I download videos?**
A: No, videos stream from YouTube. Transcripts can be cached for offline reading.

### Feature Questions

**Q: What's the difference between "Read as Resource" and "Practice Shadowing"?**
A: Resource mode is for studying content and vocabulary. Shadowing is for pronunciation and listening practice.

**Q: Why do some videos not have shadowing available?**
A: Shadowing requires transcripts. Not all videos have captions available.

**Q: Can I slow down videos?**
A: Yes, in shadowing mode you can adjust playback speed from 0.25x to 2x.

### Access Questions

**Q: What's included in premium?**
A: Premium users get unlimited access to all features and exclusive content channels.

**Q: How many videos can free users access?**
A: Free users have daily limits based on the three-pillar architecture (typically 50 actions/day).

**Q: Can I share videos with friends?**
A: You can share YouTube links. Platform features require individual accounts.

## Getting Support

### Self-Help Resources
1. Check this documentation
2. Review video tutorials
3. Browse FAQ section
4. Search community forums

### Contact Support
- **Bug Reports**: Use feedback form
- **Feature Requests**: Submit through feedback
- **Technical Issues**: Include browser/device info
- **Content Issues**: Report specific videos

## Privacy and Safety

### Your Data
- Watch history is private
- Progress tracked locally
- No data shared with YouTube
- Anonymous usage statistics only

### Content Safety
- All content is pre-screened
- Inappropriate content removed quickly
- Report concerns immediately
- Safe learning environment maintained

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Space | Play/Pause |
| ← → | Seek 5 seconds |
| ↑ ↓ | Volume control |
| F | Fullscreen |
| C | Toggle captions |
| < > | Speed control |
| R | Repeat section |
| N | Next video |
| P | Previous video |

## Best Practices

### Daily Routine
1. **Morning**: Watch one new video
2. **Afternoon**: Practice shadowing
3. **Evening**: Review and take notes

### Weekly Goals
- Complete 5-7 videos
- Master 20 new words
- Practice 30 minutes shadowing
- Review previous week's content

### Progress Tracking
- Keep a learning journal
- Note challenging sections
- Track vocabulary growth
- Record speaking practice
- Celebrate milestones