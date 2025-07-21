/**
 * Get the local audio path for a single kanji character
 * @param kanji Single kanji character
 * @returns Path to the audio file or null if not available
 */
export function getKanjiAudioPath(kanji: string): string | null {
  // Only handle single kanji characters
  if (!kanji || kanji.length !== 1) {
    return null;
  }
  
  // Check if it's a kanji character (CJK unified ideographs)
  const kanjiCode = kanji.charCodeAt(0);
  if (kanjiCode < 0x4e00 || kanjiCode > 0x9faf) {
    return null;
  }
  
  // Get the Unicode code point in hex
  const codePoint = kanji.charCodeAt(0).toString(16).padStart(5, '0');
  
  // Return the path to the audio file
  // Files are stored as /public/audio/kanji/[codepoint].mp3
  return `/audio/kanji/${codePoint}.mp3`;
}

/**
 * Check if local audio exists for a kanji
 * @param kanji Single kanji character
 * @returns Boolean indicating if audio is available
 */
export async function hasKanjiAudio(kanji: string): Promise<boolean> {
  const path = getKanjiAudioPath(kanji);
  if (!path) return false;
  
  try {
    const response = await fetch(path, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Preload kanji audio files for better performance
 * @param kanjiList Array of kanji characters to preload
 */
export function preloadKanjiAudio(kanjiList: string[]): void {
  kanjiList.forEach(kanji => {
    const path = getKanjiAudioPath(kanji);
    if (path) {
      // Create an audio element to preload the file
      const audio = new Audio(path);
      audio.preload = 'auto';
    }
  });
}