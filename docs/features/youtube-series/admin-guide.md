# YouTube Series - Admin Guide

## Overview

This guide covers the administrative features of the YouTube Series system, including channel management, video synchronization, and content configuration.

## Access Requirements

- **Admin Role**: User must have `isAdmin: true` in their user document
- **Authentication**: Valid Firebase authentication token
- **Access URL**: `/admin/youtube-series`

## Admin Interface Features

### 1. Adding YouTube Channels

#### Method 1: Using Channel URL

1. Click "Add New Channel"
2. Enter the channel URL in any of these formats:
   - `https://youtube.com/@channelhandle`
   - `https://youtube.com/channel/CHANNEL_ID`
   - `https://youtube.com/c/customname`
   - `https://youtube.com/user/username`

3. Configure settings (see Configuration Options below)
4. Click "Add Channel"

#### Method 2: Using Video URL (Recommended)

1. Click "Add New Channel"
2. Paste any video URL from the desired channel:
   - `https://youtube.com/watch?v=VIDEO_ID`
   - `https://youtu.be/VIDEO_ID`

3. The system will automatically:
   - Extract the channel information
   - Fetch the channel name
   - Convert to proper channel URL

4. Configure settings and save

**Advantage**: This method ensures accurate channel information extraction

### 2. Configuration Options

#### Monitoring Settings

- **Enable Monitoring** (`monitoringEnabled`)
  - Toggle automatic checking for new videos
  - When enabled, system checks for new content periodically

- **Check Interval** (`checkInterval`)
  - Hours between automatic checks (1-168)
  - Default: 24 hours
  - Lower values = more frequent updates but higher API usage

#### Content Settings

- **Auto-create Resources** (`autoCreateResource`)
  - Automatically create resource entries for new videos
  - Enables videos to appear in the Resources section

- **Resource Category** (`resourceCategory`)
  - Default category for imported videos
  - Examples: "YouTube Series", "N5 Content", "Advanced Listening"

- **Tags** (`resourceTags`)
  - Comma-separated keywords
  - Used for search and filtering
  - Examples: "beginner, conversation, daily-life"

#### Feature Toggles

- **Premium Content** (`isPremiumContent`)
  - Restricts access to premium users only
  - Applies to all videos from this channel

- **Auto-extract Transcripts** (`autoExtractTranscript`)
  - Automatically fetch transcripts when available
  - Uses SupaData API for extraction

- **Enable Shadowing** (`shadowingEnabled`)
  - Allows videos to be used with the shadowing tool
  - Requires transcript availability

### 3. Synchronizing Videos

#### Manual Sync

1. Locate the channel in the list
2. Click the green sync button (🔄)
3. Wait for the process to complete
4. Review the sync results:
   - Videos added
   - Videos updated
   - Total videos processed

#### What Happens During Sync

1. **Channel Verification**
   - Validates channel exists on YouTube
   - Updates channel metadata (name, thumbnail, description)

2. **Video Fetching**
   - Retrieves latest videos (default: 10 most recent)
   - Extracts video metadata:
     - Title and description
     - Duration and publish date
     - View, like, and comment counts
     - Thumbnail URLs

3. **Database Updates**
   - Creates new video entries
   - Updates existing video information
   - Links videos to channel
   - Updates statistics

#### Sync Status Indicators

- **Spinning icon**: Sync in progress
- **Green checkmark**: Recent successful sync
- **Red X**: Sync failed (check console for errors)
- **Clock icon**: Never synced or outdated

### 4. Managing Existing Channels

#### Editing Channels

1. Click the edit button (✏️) next to a channel
2. Modify settings as needed
3. Click "Update Channel"
4. Changes apply to future syncs (doesn't affect existing videos)

#### Deleting Channels

1. Click the delete button (🗑️)
2. Confirm deletion in the dialog
3. **Warning**: This removes the channel but not imported videos

#### Channel Information Display

Each channel card shows:
- Channel name and URL
- Configuration status badges
- Import statistics
- Last sync timestamp
- Action buttons

### 5. Monitoring and Statistics

#### Channel Statistics

- **Videos Imported**: Total videos in database
- **Total Views**: Aggregate YouTube view count
- **Shadowing Sessions**: Platform usage count
- **Last Checked**: Most recent sync attempt

#### Status Badges

- 🟢 **Monitoring**: Active monitoring enabled
- 🔵 **Auto-create**: Resource creation enabled
- 🟣 **Shadowing**: Shadowing feature available
- 🟡 **Premium**: Premium-only content
- ⚪ **Paused**: Monitoring disabled

## Best Practices

### 1. Channel Selection

**Do Choose**:
- Channels with consistent Japanese content
- Educational or learning-focused creators
- Channels with clear audio quality
- Content with Japanese captions available

**Avoid**:
- Channels with mixed languages
- Music-only channels (unless for listening practice)
- Channels with excessive background noise
- Content without educational value

### 2. Configuration Guidelines

#### For Beginner Content
```javascript
{
  resourceCategory: "Beginner Japanese",
  resourceTags: "beginner, n5, n4, simple",
  isPremiumContent: false,
  shadowingEnabled: true,
  checkInterval: 48  // Less frequent updates
}
```

#### For Advanced Content
```javascript
{
  resourceCategory: "Advanced Japanese",
  resourceTags: "advanced, n1, n2, native",
  isPremiumContent: true,
  shadowingEnabled: true,
  checkInterval: 24  // Daily updates
}
```

#### For News/Current Events
```javascript
{
  resourceCategory: "Japanese News",
  resourceTags: "news, current-events, formal",
  isPremiumContent: false,
  shadowingEnabled: false,  // Often lacks captions
  checkInterval: 12  // Frequent updates
}
```

### 3. API Quota Management

YouTube API has daily quotas. To optimize usage:

1. **Batch Operations**: Sync multiple channels in one session
2. **Strategic Intervals**: Set longer intervals for inactive channels
3. **Selective Sync**: Only sync channels with active users
4. **Monitor Usage**: Check API dashboard for quota consumption

### 4. Content Curation Strategy

1. **Quality over Quantity**: Better to have 10 excellent channels than 100 mediocre ones
2. **Diversity**: Mix content types (vlogs, lessons, stories, news)
3. **Level Progression**: Ensure content for all learning levels
4. **Regular Review**: Remove inactive or low-quality channels
5. **User Feedback**: Monitor which channels users actually engage with

## Troubleshooting

### Common Issues

#### "Could not extract channel ID"
- **Cause**: Invalid URL format
- **Solution**: Use a video URL from the channel instead

#### "YouTube API quota exceeded"
- **Cause**: Daily API limit reached
- **Solution**: Wait 24 hours or upgrade API quota

#### "Channel not found"
- **Cause**: Channel deleted or made private
- **Solution**: Remove channel from system

#### Videos not appearing after sync
- **Cause**: No recent videos or all videos are private
- **Solution**: Check channel on YouTube directly

### API Key Configuration

Ensure your `.env` file contains:
```bash
YOUTUBE_API_KEY=your_api_key_here
SUPA_YOUTUBE_API_KEY=your_supadata_key_here
```

### Firestore Indexes

Required indexes are defined in `firestore.indexes.json`:
```json
{
  "collectionGroup": "youtubeVideoResources",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "channelId", "order": "ASCENDING" },
    { "fieldPath": "publishedAt", "order": "DESCENDING" }
  ]
}
```

## Advanced Features

### Bulk Operations

#### Import Multiple Channels
```javascript
// Use in console for bulk import
const channels = [
  'https://youtube.com/@channel1',
  'https://youtube.com/@channel2',
  // ...
];

for (const url of channels) {
  await addChannel(url, defaultSettings);
}
```

#### Sync All Channels
```javascript
// Sync all active channels
const activeChannels = channels.filter(c => c.monitoringEnabled);
for (const channel of activeChannels) {
  await syncChannel(channel.id);
  await delay(5000); // 5 second delay between syncs
}
```

### Custom Video Filters

You can modify the sync function to filter videos:

```javascript
// Only import videos with certain keywords
const filteredVideos = videos.filter(v => 
  v.title.includes('Japanese') || 
  v.title.includes('日本語')
);
```

### Webhook Integration

For automated updates, consider:
1. YouTube PubSubHubbub for real-time updates
2. Scheduled Cloud Functions for periodic syncs
3. Third-party monitoring services

## Security Notes

1. **API Keys**: Never expose API keys in client-side code
2. **Admin Verification**: Always verify admin status server-side
3. **Rate Limiting**: Implement rate limiting for sync operations
4. **Input Validation**: Sanitize all URL inputs
5. **Audit Logging**: Log all admin actions for accountability

## Maintenance Tasks

### Weekly
- Review sync failures
- Check API quota usage
- Update popular channels

### Monthly
- Remove inactive channels
- Review user engagement metrics
- Update channel categories/tags
- Archive old videos

### Quarterly
- Audit premium content settings
- Review and update documentation
- Analyze channel performance
- Plan new channel additions