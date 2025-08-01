export interface TranscriptSegment {
  text: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
  offset?: number;
  lang?: string;
  confidence?: number; // 0-1 confidence score
}

export interface TranscriptMetadata {
  videoId?: string;
  videoTitle?: string;
  videoUrl?: string;
  channelName?: string;
  channelId?: string;
  duration?: number;
  thumbnailUrl?: string;
  language?: string;
  isMusic?: boolean;
  hasLyrics?: boolean;
  extractedAt?: Date;
  source?: 'supadata' | 'youtube' | 'whisper' | 'manual';
}