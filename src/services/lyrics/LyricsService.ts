import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

export interface LyricsResult {
  id: string;
  artist: string;
  title: string;
  lyrics: string;
  source: 'genius' | 'musixmatch' | 'manual';
  language?: string;
  romanizedLyrics?: string;
  confidence: number; // 0-1, how confident we are in the match
  metadata?: {
    geniusId?: number;
    musixmatchId?: string;
    albumName?: string;
    releaseDate?: string;
    thumbnailUrl?: string;
  };
}

export interface LyricsCacheEntry extends LyricsResult {
  searchQuery: string;
  createdAt: Timestamp;
  lastAccessed: Timestamp;
  accessCount: number;
}

export interface MusicVideoInfo {
  isMusic: boolean;
  confidence: number; // 0-1
  artist?: string;
  title?: string;
  category?: string;
  indicators: string[]; // What made us think it's music
}

class LyricsService {
  private readonly COLLECTION_NAME = 'lyricsCache';
  private readonly GENIUS_CLIENT_ID = process.env.NEXT_PUBLIC_GENIUS_CLIENT_ID;
  private readonly GENIUS_CLIENT_SECRET = process.env.GENIUS_CLIENT_SECRET;
  private readonly GENIUS_ACCESS_TOKEN = process.env.GENIUS_ACCESS_TOKEN;
  private readonly MUSIXMATCH_API_KEY = process.env.MUSIXMATCH_API_KEY;

  /**
   * Detect if a YouTube video is likely a music video
   */
  detectMusicVideo(videoData: {
    title?: string;
    description?: string;
    channelName?: string;
    category?: string;
    tags?: string[];
  }): MusicVideoInfo {
    const indicators: string[] = [];
    let confidence = 0;

    // Check category (strongest indicator)
    if (videoData.category?.toLowerCase().includes('music')) {
      confidence += 0.4;
      indicators.push('YouTube Music category');
    }

    // Common music video patterns in title
    const musicPatterns = [
      /official\s*(music\s*)?video/i,
      /\(official\s*(music\s*)?video\)/i,
      /【MV】/,
      /【PV】/,
      /\[MV\]/,
      /\[PV\]/,
      /MVフル/,
      /ミュージックビデオ/,
      /feat\./i,
      /ft\./i,
      /Official Audio/i,
      /lyrics?\s*video/i,
    ];

    const title = videoData.title || '';
    for (const pattern of musicPatterns) {
      if (pattern.test(title)) {
        confidence += 0.3;
        indicators.push(`Title pattern: ${pattern.source}`);
        break;
      }
    }

    // Check for artist - song title pattern
    const titlePatterns = [
      /^(.+?)\s*[-–—]\s*(.+?)(?:\s*\(|$)/,  // "Artist - Song Title"
      /^(.+?)\s*[「『].+?[」』]/,             // Japanese quotation marks
      /^(.+?)\s*\/\s*(.+?)(?:\s*\(|$)/,     // "Artist / Song Title"
    ];

    let artist: string | undefined;
    let songTitle: string | undefined;

    for (const pattern of titlePatterns) {
      const match = title.match(pattern);
      if (match) {
        artist = match[1].trim();
        songTitle = match[2]?.trim();
        confidence += 0.2;
        indicators.push('Artist - Title format detected');
        break;
      }
    }

    // Check channel name for music-related keywords
    const channelPatterns = [
      /official/i,
      /records/i,
      /music/i,
      /VEVO$/i,
      /エンタ/,        // Entertainment
      /レコード/,      // Records
      /ミュージック/,  // Music
    ];

    const channelName = videoData.channelName || '';
    for (const pattern of channelPatterns) {
      if (pattern.test(channelName)) {
        confidence += 0.1;
        indicators.push(`Channel pattern: ${pattern.source}`);
        break;
      }
    }

    // Check tags
    if (videoData.tags?.some(tag => 
      /music|song|mv|pv|official|lyrics/i.test(tag) ||
      /音楽|歌|ミュージック/.test(tag)
    )) {
      confidence += 0.1;
      indicators.push('Music-related tags');
    }

    // Cap confidence at 1
    confidence = Math.min(confidence, 1);

    return {
      isMusic: confidence >= 0.5,
      confidence,
      artist,
      title: songTitle,
      category: videoData.category,
      indicators,
    };
  }

  /**
   * Search for lyrics using multiple APIs
   */
  async searchLyrics(
    query: string,
    options?: {
      artist?: string;
      title?: string;
      preferJapanese?: boolean;
    }
  ): Promise<LyricsResult | null> {
    // Check cache first
    const cached = await this.getCachedLyrics(query);
    if (cached) {
      await this.updateCacheAccess(cached.id);
      return cached;
    }

    // Try different search strategies
    let result: LyricsResult | null = null;

    // If we have artist and title, search more precisely
    if (options?.artist && options?.title) {
      result = await this.searchWithArtistTitle(options.artist, options.title, options.preferJapanese);
    }

    // Fallback to general search
    if (!result) {
      result = await this.searchGeneral(query, options?.preferJapanese);
    }

    // Cache the result
    if (result) {
      await this.cacheLyrics(query, result);
    }

    return result;
  }

  /**
   * Search using artist and title
   */
  private async searchWithArtistTitle(
    artist: string,
    title: string,
    preferJapanese = true
  ): Promise<LyricsResult | null> {
    // Try Genius first (better for international music)
    let result = await this.searchGenius(`${artist} ${title}`);
    
    // Try Musixmatch if Genius fails
    if (!result && this.MUSIXMATCH_API_KEY) {
      result = await this.searchMusixmatch(artist, title);
    }

    return result;
  }

  /**
   * General search across all providers
   */
  private async searchGeneral(query: string, preferJapanese = true): Promise<LyricsResult | null> {
    // Try Genius
    let result = await this.searchGenius(query);
    
    // Try Musixmatch
    if (!result && this.MUSIXMATCH_API_KEY) {
      result = await this.searchMusixmatch(query);
    }

    return result;
  }

  /**
   * Search Genius API
   */
  private async searchGenius(query: string): Promise<LyricsResult | null> {
    if (!this.GENIUS_ACCESS_TOKEN) {
      console.warn('Genius API token not configured');
      return null;
    }

    try {
      // Search for the song
      const searchResponse = await fetch(
        `https://api.genius.com/search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            'Authorization': `Bearer ${this.GENIUS_ACCESS_TOKEN}`,
          },
        }
      );

      if (!searchResponse.ok) {
        throw new Error(`Genius search failed: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      const hits = searchData.response.hits;

      if (!hits || hits.length === 0) {
        return null;
      }

      // Get the first result
      const song = hits[0].result;

      // Fetch full song details to get lyrics
      const songResponse = await fetch(
        `https://api.genius.com/songs/${song.id}`,
        {
          headers: {
            'Authorization': `Bearer ${this.GENIUS_ACCESS_TOKEN}`,
          },
        }
      );

      if (!songResponse.ok) {
        throw new Error(`Genius song fetch failed: ${songResponse.status}`);
      }

      const songData = await songResponse.json();
      const fullSong = songData.response.song;

      // Note: Genius API doesn't provide lyrics directly
      // We'd need to scrape the lyrics URL, which is against their ToS
      // For now, we'll return the metadata and indicate lyrics need to be fetched separately
      
      return {
        id: `genius_${song.id}`,
        artist: song.primary_artist.name,
        title: song.title,
        lyrics: '', // Would need to be scraped or entered manually
        source: 'genius',
        confidence: 0.8,
        metadata: {
          geniusId: song.id,
          albumName: fullSong.album?.name,
          releaseDate: fullSong.release_date,
          thumbnailUrl: song.header_image_thumbnail_url,
        },
      };
    } catch (error) {
      console.error('Genius API error:', error);
      return null;
    }
  }

  /**
   * Search Musixmatch API
   */
  private async searchMusixmatch(query: string, title?: string): Promise<LyricsResult | null> {
    if (!this.MUSIXMATCH_API_KEY) {
      console.warn('Musixmatch API key not configured');
      return null;
    }

    try {
      // Search for the track
      const searchParams = new URLSearchParams({
        apikey: this.MUSIXMATCH_API_KEY,
        q: query,
        page_size: '5',
        s_track_rating: 'desc',
      });

      if (title) {
        searchParams.set('q_track', title);
      }

      const searchResponse = await fetch(
        `https://api.musixmatch.com/ws/1.1/track.search?${searchParams}`
      );

      if (!searchResponse.ok) {
        throw new Error(`Musixmatch search failed: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      const tracks = searchData.message.body.track_list;

      if (!tracks || tracks.length === 0) {
        return null;
      }

      const track = tracks[0].track;

      // Get lyrics
      const lyricsResponse = await fetch(
        `https://api.musixmatch.com/ws/1.1/track.lyrics.get?apikey=${this.MUSIXMATCH_API_KEY}&track_id=${track.track_id}`
      );

      if (!lyricsResponse.ok) {
        throw new Error(`Musixmatch lyrics fetch failed: ${lyricsResponse.status}`);
      }

      const lyricsData = await lyricsResponse.json();
      const lyrics = lyricsData.message.body.lyrics;

      if (!lyrics) {
        return null;
      }

      return {
        id: `musixmatch_${track.track_id}`,
        artist: track.artist_name,
        title: track.track_name,
        lyrics: lyrics.lyrics_body,
        source: 'musixmatch',
        confidence: 0.85,
        metadata: {
          musixmatchId: track.track_id.toString(),
          albumName: track.album_name,
        },
      };
    } catch (error) {
      console.error('Musixmatch API error:', error);
      return null;
    }
  }

  /**
   * Get cached lyrics
   */
  private async getCachedLyrics(query: string): Promise<LyricsCacheEntry | null> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('searchQuery', '==', query.toLowerCase())
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }

      return snapshot.docs[0].data() as LyricsCacheEntry;
    } catch (error) {
      console.error('Error fetching cached lyrics:', error);
      return null;
    }
  }

  /**
   * Cache lyrics result
   */
  private async cacheLyrics(query: string, lyrics: LyricsResult): Promise<void> {
    try {
      const cacheEntry: LyricsCacheEntry = {
        ...lyrics,
        searchQuery: query.toLowerCase(),
        createdAt: serverTimestamp() as Timestamp,
        lastAccessed: serverTimestamp() as Timestamp,
        accessCount: 1,
      };

      await setDoc(
        doc(db, this.COLLECTION_NAME, lyrics.id),
        cacheEntry
      );
    } catch (error) {
      console.error('Error caching lyrics:', error);
    }
  }

  /**
   * Update cache access count
   */
  private async updateCacheAccess(lyricsId: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, lyricsId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        await setDoc(docRef, {
          ...data,
          lastAccessed: serverTimestamp(),
          accessCount: (data.accessCount || 0) + 1,
        });
      }
    } catch (error) {
      console.error('Error updating cache access:', error);
    }
  }

  /**
   * Compare lyrics with transcript for validation
   */
  validateTranscriptWithLyrics(
    transcript: string[],
    lyrics: string,
    options?: {
      fuzzyThreshold?: number; // 0-1, how similar lines need to be
      minMatchRatio?: number;  // Minimum ratio of matched lines
    }
  ): {
    isValid: boolean;
    confidence: number;
    matchedLines: number;
    totalLines: number;
    issues: string[];
  } {
    const fuzzyThreshold = options?.fuzzyThreshold || 0.8;
    const minMatchRatio = options?.minMatchRatio || 0.7;

    // Normalize and split lyrics into lines
    const lyricsLines = lyrics
      .split('\n')
      .map(line => this.normalizeLine(line))
      .filter(line => line.length > 0);

    const transcriptLines = transcript
      .map(line => this.normalizeLine(line))
      .filter(line => line.length > 0);

    if (lyricsLines.length === 0 || transcriptLines.length === 0) {
      return {
        isValid: false,
        confidence: 0,
        matchedLines: 0,
        totalLines: Math.max(lyricsLines.length, transcriptLines.length),
        issues: ['No valid lines to compare'],
      };
    }

    // Use dynamic programming to find best alignment
    const matches = this.findBestAlignment(transcriptLines, lyricsLines, fuzzyThreshold);
    
    const matchRatio = matches.length / Math.min(transcriptLines.length, lyricsLines.length);
    const confidence = Math.min(matchRatio, 1);
    
    const issues: string[] = [];
    if (matchRatio < minMatchRatio) {
      issues.push(`Low match ratio: ${(matchRatio * 100).toFixed(1)}%`);
    }

    return {
      isValid: matchRatio >= minMatchRatio,
      confidence,
      matchedLines: matches.length,
      totalLines: transcriptLines.length,
      issues,
    };
  }

  /**
   * Normalize text for comparison
   */
  private normalizeLine(line: string): string {
    return line
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, '') // Remove punctuation but keep Unicode letters
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Find best alignment between transcript and lyrics
   */
  private findBestAlignment(
    transcript: string[],
    lyrics: string[],
    threshold: number
  ): Array<[number, number]> {
    const matches: Array<[number, number]> = [];
    const usedLyricIndices = new Set<number>();

    for (let tIdx = 0; tIdx < transcript.length; tIdx++) {
      let bestMatch = -1;
      let bestScore = 0;

      for (let lIdx = 0; lIdx < lyrics.length; lIdx++) {
        if (usedLyricIndices.has(lIdx)) continue;

        const score = this.calculateSimilarity(transcript[tIdx], lyrics[lIdx]);
        if (score > threshold && score > bestScore) {
          bestScore = score;
          bestMatch = lIdx;
        }
      }

      if (bestMatch !== -1) {
        matches.push([tIdx, bestMatch]);
        usedLyricIndices.add(bestMatch);
      }
    }

    return matches;
  }

  /**
   * Calculate similarity between two strings (0-1)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;

    // Use Levenshtein distance
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    return 1 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

export const lyricsService = new LyricsService();