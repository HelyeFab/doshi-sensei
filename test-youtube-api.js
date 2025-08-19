// Test script to verify YouTube API is working
const axios = require('axios');

const API_KEY = 'AIzaSyDfETlyCtkm_-iM8p7G3fCaVqK4bu1wjsg';
const videoId = 'bW0jIgjCynY';

async function testYouTubeAPI() {
  try {
    console.log('Testing YouTube API with video ID:', videoId);
    
    const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'snippet,contentDetails,statistics',
        id: videoId,
        key: API_KEY
      }
    });

    if (response.data.items && response.data.items.length > 0) {
      const video = response.data.items[0];
      console.log('\n✅ Video found!');
      console.log('Title:', video.snippet.title);
      console.log('Channel ID:', video.snippet.channelId);
      console.log('Channel Title:', video.snippet.channelTitle);
      
      // Now fetch channel info
      console.log('\n📊 Fetching channel info...');
      const channelResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: {
          part: 'snippet,statistics',
          id: video.snippet.channelId,
          key: API_KEY
        }
      });
      
      if (channelResponse.data.items && channelResponse.data.items.length > 0) {
        const channel = channelResponse.data.items[0];
        console.log('\n✅ Channel found!');
        console.log('Channel:', channel.snippet.title);
        console.log('Subscribers:', channel.statistics.subscriberCount);
        console.log('Videos:', channel.statistics.videoCount);
        console.log('Views:', channel.statistics.viewCount);
      }
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testYouTubeAPI();