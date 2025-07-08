/**
 * Quick Resource Creation Utilities
 * For creating visually appealing resources from URLs
 */

// Available icon collections
const ICON_COLLECTIONS = [
  'watermelon', 'pride-stickers', 'alphabet-and-numbers', 'animals', 
  'pets', 'creativity', 'love', 'education', 'nature', 'spring',
  'earth-save-the-planet', 'wild-animals'
];

// Pastel color palettes
const PASTEL_COLORS = [
  { bg: 'bg-pink-100', border: 'border-pink-200', text: 'text-pink-800' },
  { bg: 'bg-blue-100', border: 'border-blue-200', text: 'text-blue-800' },
  { bg: 'bg-green-100', border: 'border-green-200', text: 'text-green-800' },
  { bg: 'bg-purple-100', border: 'border-purple-200', text: 'text-purple-800' },
  { bg: 'bg-yellow-100', border: 'border-yellow-200', text: 'text-yellow-800' },
  { bg: 'bg-indigo-100', border: 'border-indigo-200', text: 'text-indigo-800' },
  { bg: 'bg-rose-100', border: 'border-rose-200', text: 'text-rose-800' },
  { bg: 'bg-teal-100', border: 'border-teal-200', text: 'text-teal-800' },
  { bg: 'bg-orange-100', border: 'border-orange-200', text: 'text-orange-800' },
  { bg: 'bg-cyan-100', border: 'border-cyan-200', text: 'text-cyan-800' },
];

// Sample icons from different collections (based on the folder structure)
const SAMPLE_ICONS = [
  // Watermelon emotions
  '17517790-summer-watermelon/png/001-happy.png',
  '17517790-summer-watermelon/png/002-love.png',
  '17517790-summer-watermelon/png/013-wow.png',
  '17517790-summer-watermelon/png/014-angel.png',
  '17517790-summer-watermelon/png/020-ok.png',
  
  // Pride stickers
  '18986852-pride-stickers/png/005-knowledge.png',
  '18986852-pride-stickers/png/015-teacher.png',
  '18986852-pride-stickers/png/022-trophy.png',
  '18986852-pride-stickers/png/036-achivement.png',
  '18986852-pride-stickers/png/065-reading.png',
  
  // Animals
  '4193242-animals/png/016-panda bear.png',
  '4193242-animals/png/009-fox.png',
  '4193242-animals/png/010-rabbit.png',
  '4193242-animals/png/033-lion.png',
  '4193242-animals/png/022-elephant.png',
  
  // Education themed
  '4341021-education/png/001-book.png',
  '4341021-education/png/015-graduation cap.png',
  '4341021-education/png/020-light bulb.png',
  
  // Nature
  '4359705-nature/png/001-sun.png',
  '4359705-nature/png/015-tree.png',
  '4359705-nature/png/025-flower.png',
  
  // Creativity
  '4228672-creativity/png/001-paint brush.png',
  '4228672-creativity/png/010-art palette.png',
  '4228672-creativity/png/015-pencil.png',
];

/**
 * Get a random pastel color palette
 */
export function getRandomPastelColor() {
  return PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)];
}

/**
 * Get a random icon path
 */
export function getRandomIcon() {
  return SAMPLE_ICONS[Math.floor(Math.random() * SAMPLE_ICONS.length)];
}

/**
 * Extract metadata from various URL types
 */
export async function extractUrlMetadata(url: string) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    let extractedData = {
      title: '',
      description: '',
      image: '',
      type: 'general' as 'youtube' | 'instagram' | 'twitter' | 'general'
    };

    // YouTube URLs
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      extractedData.type = 'youtube';
      const videoId = extractVideoId(url);
      if (videoId) {
        try {
          // Try to get video info using oEmbed
          const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
          if (response.ok) {
            const data = await response.json();
            extractedData.title = data.title || '';
            extractedData.description = data.author_name || '';
            extractedData.image = data.thumbnail_url || '';
          }
        } catch (error) {
          console.warn('Failed to fetch YouTube metadata:', error);
        }
      }
    }
    
    // Instagram URLs  
    else if (hostname.includes('instagram.com')) {
      extractedData.type = 'instagram';
      // Instagram metadata is harder to extract due to restrictions
      extractedData.title = 'Instagram Post';
    }
    
    // Twitter URLs
    else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      extractedData.type = 'twitter';
      extractedData.title = 'Twitter/X Post';
    }
    
    // General URL - try to extract basic info
    else {
      try {
        // For general URLs, we'd need a backend service to avoid CORS
        // For now, just extract from the URL structure
        const pathSegments = urlObj.pathname.split('/').filter(Boolean);
        if (pathSegments.length > 0) {
          extractedData.title = pathSegments[pathSegments.length - 1]
            .replace(/[-_]/g, ' ')
            .replace(/\.(html|php|aspx?)$/i, '')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        }
        extractedData.description = urlObj.hostname;
      } catch (error) {
        console.warn('Failed to extract general URL metadata:', error);
      }
    }
    
    return extractedData;
  } catch (error) {
    console.error('Invalid URL:', error);
    return null;
  }
}

/**
 * Extract YouTube video ID from various YouTube URL formats
 */
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Generate suggested tags based on URL type and content
 */
export function generateSuggestedTags(url: string, extractedData: any): string[] {
  const tags: string[] = [];
  
  switch (extractedData?.type) {
    case 'youtube':
      tags.push('video', 'youtube');
      break;
    case 'instagram':
      tags.push('social', 'instagram');
      break;
    case 'twitter':
      tags.push('social', 'twitter');
      break;
    default:
      tags.push('external', 'resource');
  }
  
  // Add domain-based tags
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('grammar')) tags.push('grammar');
    if (hostname.includes('vocab')) tags.push('vocabulary');
    if (hostname.includes('kanji')) tags.push('kanji');
    if (hostname.includes('japanese') || hostname.includes('nihongo')) tags.push('japanese');
    if (hostname.includes('jlpt')) tags.push('jlpt');
  } catch (error) {
    // Invalid URL, skip domain analysis
  }
  
  return tags.slice(0, 3); // Limit to 3 suggested tags
}

/**
 * Create resource content with embedded URL
 */
export function createResourceContent(url: string, extractedData: any): string {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname;
  
  let content = `# External Resource\n\n`;
  
  if (extractedData?.description) {
    content += `${extractedData.description}\n\n`;
  }
  
  content += `**Source:** [${hostname}](${url})\n\n`;
  
  if (extractedData?.type === 'youtube') {
    content += `[🎥 Watch on YouTube](${url})\n\n`;
  } else if (extractedData?.type === 'instagram') {
    content += `[📸 View on Instagram](${url})\n\n`;
  } else if (extractedData?.type === 'twitter') {
    content += `[🐦 View on Twitter/X](${url})\n\n`;
  } else {
    content += `[🔗 Visit Resource](${url})\n\n`;
  }
  
  content += `---\n\n*This resource opens in a new tab/window.*`;
  
  return content;
}