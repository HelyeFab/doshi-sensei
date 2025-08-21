/**
 * Fun loading messages that reveal the complex work happening behind the scenes
 * during YouTube transcript extraction and processing
 */

export interface LoadingMessage {
  message: string;
  emoji?: string;
  duration?: number; // Estimated duration in ms
}

// Messages for different stages of the process
export const YOUTUBE_EXTRACTION_MESSAGES: LoadingMessage[] = [
  // Initial connection
  { message: "Knocking on YouTube's door... 🚪", emoji: "🚪", duration: 1000 },
  { message: "Sweet-talking the YouTube API... 💬", emoji: "💬", duration: 1500 },
  { message: "Negotiating with YouTube's servers... 🤝", emoji: "🤝", duration: 1500 },
  { message: "Convincing YouTube we're not a robot... 🤖", emoji: "🤖", duration: 1000 },
  
  // Checking cache
  { message: "Searching the community treasure chest... 📦", emoji: "📦", duration: 1000 },
  { message: "Checking if someone already did the hard work... 🔍", emoji: "🔍", duration: 1500 },
  { message: "Looking for cached transcripts in the vault... 🏦", emoji: "🏦", duration: 1000 },
  { message: "Scanning the collective consciousness... 🧠", emoji: "🧠", duration: 1500 },
  
  // Video metadata extraction
  { message: "Reading the video's DNA... 🧬", emoji: "🧬", duration: 2000 },
  { message: "Extracting video metadata (title, channel, the works)... 📊", emoji: "📊", duration: 1500 },
  { message: "Decoding the video's secret identity... 🕵️", emoji: "🕵️", duration: 1500 },
  { message: "Interrogating the video for basic information... 👮", emoji: "👮", duration: 1000 },
  
  // Subtitle search
  { message: "Hunting for Japanese subtitles in the wild... 🏹", emoji: "🏹", duration: 2000 },
  { message: "Checking under the video's couch cushions for captions... 🛋️", emoji: "🛋️", duration: 1500 },
  { message: "Asking YouTube nicely for subtitles... Pretty please? 🙏", emoji: "🙏", duration: 1500 },
  { message: "Searching for cc_load_policy=1 (that's nerd speak for subtitles)... 🤓", emoji: "🤓", duration: 2000 },
  
  // SupaData API
  { message: "Activating the SupaData AI extraction engine... 🚀", emoji: "🚀", duration: 2000 },
  { message: "Waking up our AI transcript extraction bot... 🤖", emoji: "🤖", duration: 1500 },
  { message: "Sending your video to our transcript ninjas... 🥷", emoji: "🥷", duration: 2000 },
  { message: "SupaData is doing its magic (costs us real money btw)... 💸", emoji: "💸", duration: 2500 },
  
  // Audio extraction
  { message: "Extracting audio from the video matrix... 🎵", emoji: "🎵", duration: 3000 },
  { message: "Converting video pixels to sound waves... 🌊", emoji: "🌊", duration: 2500 },
  { message: "Separating the audio from the visual noise... 🎧", emoji: "🎧", duration: 2000 },
  { message: "Downloading audio stream (YouTube doesn't make this easy)... 📥", emoji: "📥", duration: 3000 },
  
  // Whisper transcription
  { message: "Sending audio to OpenAI's Whisper AI... 🎤", emoji: "🎤", duration: 5000 },
  { message: "Teaching AI to understand Japanese... 🇯🇵", emoji: "🇯🇵", duration: 4000 },
  { message: "Whisper AI is listening very carefully... 👂", emoji: "👂", duration: 4500 },
  { message: "Converting sound waves into kanji, hiragana, and katakana... ✍️", emoji: "✍️", duration: 5000 },
  
  // GPT-4 formatting
  { message: "GPT-4 is fixing the transcript's grammar... 📝", emoji: "📝", duration: 3000 },
  { message: "AI is adding proper sentence breaks (it's harder than it looks)... 📖", emoji: "📖", duration: 2500 },
  { message: "Making the transcript actually readable by humans... 👀", emoji: "👀", duration: 2000 },
  { message: "GPT-4 is judging the original transcript's formatting... 🧐", emoji: "🧐", duration: 2500 },
  
  // Processing
  { message: "Syncing timestamps with the matrix... ⏱️", emoji: "⏱️", duration: 2000 },
  { message: "Aligning Japanese text with space-time continuum... 🌌", emoji: "🌌", duration: 1500 },
  { message: "Teaching each word when to appear on screen... 🎬", emoji: "🎬", duration: 2000 },
  { message: "Calculating the exact millisecond for each syllable... ⚡", emoji: "⚡", duration: 1500 },
  
  // Saving to cache
  { message: "Saving transcript for the next person (pay it forward!)... 💾", emoji: "💾", duration: 1500 },
  { message: "Uploading to the community knowledge base... ☁️", emoji: "☁️", duration: 2000 },
  { message: "Storing in Firestore (Google's fancy database)... 🗄️", emoji: "🗄️", duration: 1500 },
  { message: "Contributing to the collective learning hive mind... 🐝", emoji: "🐝", duration: 1000 },
  
  // Fun waiting messages
  { message: "Making coffee while the servers work... ☕", emoji: "☕", duration: 2000 },
  { message: "Bribing the internet hamsters to run faster... 🐹", emoji: "🐹", duration: 1500 },
  { message: "Performing ancient transcript summoning ritual... 🔮", emoji: "🔮", duration: 2000 },
  { message: "Asking ChatGPT's cousin for help... 🤖", emoji: "🤖", duration: 1500 },
  { message: "This is taking longer than my ramen delivery... 🍜", emoji: "🍜", duration: 2500 },
  { message: "Still faster than learning Japanese the old way... 📚", emoji: "📚", duration: 2000 },
  { message: "Processing... (that's computer speak for 'please wait')... 💻", emoji: "💻", duration: 1500 },
  { message: "Doing 17 different things at once behind the scenes... 🎪", emoji: "🎪", duration: 2000 },
  
  // Technical details (nerdy)
  { message: "Parsing ISO 8601 duration format (PT4M33S)... 🤔", emoji: "🤔", duration: 1000 },
  { message: "Converting YouTube's weird timestamp format... 🔄", emoji: "🔄", duration: 1500 },
  { message: "Bypassing CORS restrictions like a ninja... 🥷", emoji: "🥷", duration: 1000 },
  { message: "Running regex patterns that would make your head spin... 🌀", emoji: "🌀", duration: 1500 },
  
  // Almost done
  { message: "Putting the final touches on your transcript... 🎨", emoji: "🎨", duration: 1000 },
  { message: "Quality checking the results (we have standards!)... ✅", emoji: "✅", duration: 1500 },
  { message: "Almost there! Just dotting the い's and crossing the て's... ✏️", emoji: "✏️", duration: 1000 },
  { message: "Wrapping up this digital origami... 🗾", emoji: "🗾", duration: 1000 }
];

// Messages for when things are found in cache
export const CACHE_HIT_MESSAGES: LoadingMessage[] = [
  { message: "Jackpot! Found it in the cache! 🎰", emoji: "🎰", duration: 500 },
  { message: "Someone already extracted this! High five! 🙌", emoji: "🙌", duration: 500 },
  { message: "Cache hit! Saving you time and our API credits! 💰", emoji: "💰", duration: 500 },
  { message: "Found in the community vault! No extraction needed! 🏆", emoji: "🏆", duration: 500 },
  { message: "Lucky you! This transcript is already processed! 🍀", emoji: "🍀", duration: 500 }
];

// Messages for errors with humor
export const ERROR_MESSAGES = {
  noSubtitles: [
    "YouTube is being shy with the subtitles... 😳",
    "No subtitles found. YouTube is keeping secrets! 🤐",
    "This video is subtitle-free. Time for plan B! 🅱️",
    "Subtitles are playing hide and seek (and winning)... 🙈"
  ],
  apiError: [
    "Our transcript extraction robot needs a coffee break... ☕",
    "The API is having a moment. We've all been there... 😅",
    "Something went sideways in the matrix... 🔄",
    "Our servers are practicing social distancing... 📏"
  ],
  networkError: [
    "The internet tubes are clogged... 🚰",
    "WiFi signal got lost on its way here... 📡",
    "The cloud is actually cloudy today... ☁️",
    "Internet hamsters are on strike... 🐹"
  ]
};

/**
 * Get a random loading message from a specific category
 */
export function getRandomLoadingMessage(messages: LoadingMessage[] = YOUTUBE_EXTRACTION_MESSAGES): LoadingMessage {
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Get a sequence of loading messages that tell a story
 */
export function getLoadingMessageSequence(totalDuration: number = 15000): LoadingMessage[] {
  const sequence: LoadingMessage[] = [];
  let currentDuration = 0;
  const stages = [
    "Connecting to YouTube... 🌐",
    "Checking community cache... 📦",
    "Extracting video metadata... 📊",
    "Searching for subtitles... 🔍",
    "Activating SupaData AI... 🤖",
    "Processing transcript data... ⚙️",
    "Formatting with GPT-4... ✨",
    "Saving for the community... 💾"
  ];
  
  stages.forEach((message, index) => {
    if (currentDuration < totalDuration) {
      const duration = Math.min(2000, totalDuration - currentDuration);
      sequence.push({ message, duration });
      currentDuration += duration;
    }
  });
  
  return sequence;
}

/**
 * Get a humorous technical detail message
 */
export function getTechnicalDetailMessage(): string {
  const details = [
    "Currently executing 14 API calls simultaneously...",
    "Processing 7,000 milliseconds of timestamp data...",
    "Converting YouTube's proprietary format to human-readable text...",
    "Running natural language processing on Japanese characters...",
    "Calculating optimal furigana placement algorithms...",
    "Synchronizing audio waveforms with text timestamps...",
    "Applying machine learning to improve accuracy...",
    "Cross-referencing with 10,000 cached transcripts...",
    "Optimizing for both speed and accuracy (it's a balance)...",
    "Utilizing distributed computing across 3 continents..."
  ];
  
  return details[Math.floor(Math.random() * details.length)];
}