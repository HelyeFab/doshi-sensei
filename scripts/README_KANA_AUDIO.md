# Kana Audio Download Script

This script downloads all hiragana and katakana audio files from Google Text-to-Speech API to enable offline playback.

## Prerequisites

1. Ensure you have the Google TTS API key in your `.env.local` file:
   ```
   NEXT_PUBLIC_GOOGLE_TTS_API_KEY=your_api_key_here
   ```

2. Make sure you have Node.js installed.

## Usage

Run the script from the project root:

```bash
# From project root
node scripts/download-kana-audio.js

# Or make it executable and run directly
chmod +x scripts/download-kana-audio.js
./scripts/download-kana-audio.js
```

## What it does

1. **Creates directories**: 
   - `/public/audio/kana/hiragana/` - for hiragana audio files
   - `/public/audio/kana/katakana/` - for katakana audio files

2. **Downloads audio files**:
   - All basic kana (あ-ん, ア-ン)
   - All dakuten/handakuten variations (が, ぱ, etc.)
   - All digraphs/yōon (きゃ, しゅ, etc.)
   - Total: ~214 audio files (107 hiragana + 107 katakana)

3. **Creates an index file**:
   - `/public/audio/kana/index.json` - maps kana IDs to file paths

## Output Structure

```
public/
└── audio/
    └── kana/
        ├── hiragana/
        │   ├── a.mp3      # あ
        │   ├── ka.mp3     # か
        │   ├── kya.mp3    # きゃ
        │   └── ...
        ├── katakana/
        │   ├── a.mp3      # ア
        │   ├── ka.mp3     # カ
        │   ├── kya.mp3    # キャ
        │   └── ...
        └── index.json     # Audio file mapping
```

## Features

- **Resume support**: If the script fails, you can run it again and it will skip already downloaded files
- **Rate limiting**: Waits 100ms between requests to avoid API limits
- **Error handling**: Continues downloading even if some files fail
- **Progress tracking**: Shows real-time download progress

## Integration

The TTS manager (`/src/utils/tts.ts`) has been updated to automatically use these local files when available:

1. When `TTSManager.speak()` is called with a single kana character
2. It checks if a local audio file exists
3. If found, plays the local file (no API call)
4. If not found, falls back to Google TTS API

This enables:
- **Offline support**: Kana practice works without internet
- **Faster playback**: No network latency
- **Cost savings**: Reduces API calls
- **Consistent quality**: Same audio every time

## Notes

- The script uses the female voice (`ja-JP-Neural2-B`) to match the app's default
- Audio files are in MP3 format for broad compatibility
- Files are small (~5-10KB each), total size ~2MB
- The `/public/audio/` directory is gitignored by default