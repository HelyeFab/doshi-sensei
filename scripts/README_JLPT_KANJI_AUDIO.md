# JLPT Kanji Audio Download Script

This script downloads audio files for all JLPT kanji characters (N5-N1), including the kanji character pronunciation and all their onyomi/kunyomi readings.

## What It Downloads

For each kanji, the script downloads:
1. **Character pronunciation** - How the kanji is pronounced by itself
2. **Onyomi readings** - Chinese-origin readings (in katakana)
3. **Kunyomi readings** - Japanese-origin readings (in hiragana)

## Prerequisites

1. Ensure you have the Google TTS API key in your `.env` or `.env.local` file:
   ```
   NEXT_PUBLIC_GOOGLE_TTS_API_KEY=your_api_key_here
   ```

2. Make sure you have Node.js installed.

## Usage

Run the script from the project root:

```bash
# From project root
node scripts/download-jlpt-kanji-audio.js

# Or make it executable and run directly
chmod +x scripts/download-jlpt-kanji-audio.js
./scripts/download-jlpt-kanji-audio.js
```

## Features

1. **Batch Processing**: Downloads in batches of 10 kanji (approximately 50 audio files per batch)
2. **Rate Limiting**: 
   - 300ms delay between individual requests
   - 10 second delay between batches
3. **Progress Tracking**: Saves progress to `jlpt-kanji-audio-progress.json`
4. **Resume Support**: Can stop and restart at any time - will skip already downloaded files
5. **Error Handling**: Tracks failed downloads for manual retry

## Output Structure

```
public/
└── audio/
    └── kanji/
        ├── n5/
        │   ├── character/
        │   │   ├── 人.mp3
        │   │   ├── 一.mp3
        │   │   └── ...
        │   ├── onyomi/
        │   │   ├── 人_ジン.mp3
        │   │   ├── 人_ニン.mp3
        │   │   └── ...
        │   └── kunyomi/
        │       ├── 人_ひと.mp3
        │       └── ...
        ├── n4/
        │   └── ... (same structure)
        ├── n3/
        │   └── ... (same structure)
        ├── n2/
        │   └── ... (same structure)
        ├── n1/
        │   └── ... (same structure)
        └── index.json
```

## Index File Format

The `index.json` file provides quick lookup for all audio files:

```json
{
  "N5": {
    "characters": {
      "人": "/audio/kanji/n5/character/人.mp3"
    },
    "onyomi": {
      "人": {
        "ジン": "/audio/kanji/n5/onyomi/人_ジン.mp3",
        "ニン": "/audio/kanji/n5/onyomi/人_ニン.mp3"
      }
    },
    "kunyomi": {
      "人": {
        "ひと": "/audio/kanji/n5/kunyomi/人_ひと.mp3"
      }
    }
  },
  "N4": { ... },
  "N3": { ... },
  "N2": { ... },
  "N1": { ... }
}
```

## Estimated Download Size & Time

- **N5**: ~80 kanji × ~5 files = ~400 files
- **N4**: ~170 kanji × ~5 files = ~850 files
- **N3**: ~270 kanji × ~5 files = ~1,350 files
- **N2**: ~380 kanji × ~5 files = ~1,900 files
- **N1**: ~1,136 kanji × ~5 files = ~5,680 files
- **Total**: ~2,036 kanji = ~10,180 audio files

**Estimated time**: 60-90 minutes (depending on API response times)
**Estimated size**: ~50-100MB total

## Integration

The TTS manager (`/src/utils/tts.ts`) has been updated to automatically use these local files:

1. When `TTSManager.speak()` is called with a single kanji character
2. It checks if a local audio file exists using `kanjiAudioLoader`
3. If found, plays the local file (no API call)
4. If not found, falls back to Google TTS API

Additional utilities in `/src/utils/kanjiAudioLoader.ts`:
- `getKanjiAudioPath(kanji, level?)` - Get character audio path
- `getOnyomiAudioPath(kanji, reading, level?)` - Get onyomi audio path
- `getKunyomiAudioPath(kanji, reading, level?)` - Get kunyomi audio path
- `playKanjiAudio(path)` - Play audio file with proper error handling

## Tips

1. **Start with N5**: You can modify the script to download only specific levels
2. **Monitor progress**: Check the console output and progress file
3. **Retry failures**: Delete the progress file to retry all failed downloads
4. **Check your API quota**: Make sure you have sufficient Google TTS API quota

## Notes

- Audio files use the female voice (`ja-JP-Neural2-B`) for consistency
- Special characters in filenames are replaced with underscores
- The `/public/audio/kanji/` directory is gitignored except for `index.json`