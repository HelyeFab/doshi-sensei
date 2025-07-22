'use client';

import { useState } from 'react';
import { useStrings } from '@/contexts/LanguageContext';
import { StandardPageHeader } from '@/components/StandardPageHeader';
import YouTubeInput from './components/YouTubeInput';
import AudioExtractor from './components/AudioExtractor';
import TranscriptDisplay from './components/TranscriptDisplay';
import ShadowingPlayer from './components/ShadowingPlayer';

const pageStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "YouTube Shadowing Practice - Doshi Sensei",
  "description": "Practice Japanese shadowing with YouTube videos. Extract audio, get transcripts, and improve your pronunciation.",
  "url": "https://doshisensei.com/tools/youtube-shadowing"
};

export interface TranscriptLine {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  words?: string[];
}

export interface ShadowingSession {
  videoUrl: string;
  videoTitle?: string;
  audioUrl?: string;
  transcript: TranscriptLine[];
  currentLineIndex: number;
}

export default function YouTubeShadowing() {
  const strings = useStrings();
  const [session, setSession] = useState<ShadowingSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUrlSubmit = async (url: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Initialize session with URL
      setSession({
        videoUrl: url,
        transcript: [],
        currentLineIndex: 0
      });
    } catch (err) {
      setError('Failed to process YouTube URL');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudioExtracted = (audioUrl: string, title?: string) => {
    if (session) {
      setSession({
        ...session,
        audioUrl,
        videoTitle: title
      });
    }
  };

  const handleTranscriptLoaded = (transcript: TranscriptLine[]) => {
    if (session) {
      setSession({
        ...session,
        transcript
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(pageStructuredData),
        }}
      />

      <StandardPageHeader 
        title={strings.youtubeShadowing?.title || "YouTube Shadowing Practice"}
        backHref="/" 
      />

      <div className="px-4 pb-20">
        {!session && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
              <h2 className="text-lg font-semibold mb-2 text-foreground">{strings.youtubeShadowing?.subtitle || "Practice Japanese with YouTube"}</h2>
              <p className="text-muted-foreground mb-4">
                {strings.youtubeShadowing?.description || "Paste a YouTube link to extract audio, get transcripts, and practice shadowing to improve your pronunciation and listening skills."}
              </p>
              
              <YouTubeInput 
                onSubmit={handleUrlSubmit}
                isLoading={isLoading}
              />
              
              {error && (
                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Recent Sessions */}
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              <h3 className="font-medium text-foreground mb-4">{strings.youtubeShadowing?.recentSessions || "Recent Sessions"}</h3>
              <p className="text-sm text-muted-foreground">{strings.youtubeShadowing?.noSessions || "No recent sessions yet. Start by pasting a YouTube link above!"}</p>
            </div>
          </div>
        )}

        {session && (
          <div className="max-w-4xl mx-auto">
            {/* Video Info */}
            {session.videoTitle && (
              <div className="bg-card rounded-lg shadow-sm border border-border p-4 mb-4">
                <h2 className="font-medium text-foreground">{session.videoTitle}</h2>
                <p className="text-sm text-muted-foreground mt-1">{session.videoUrl}</p>
              </div>
            )}

            {/* Audio Extraction */}
            {!session.audioUrl && (
              <AudioExtractor
                videoUrl={session.videoUrl}
                onAudioExtracted={handleAudioExtracted}
              />
            )}

            {/* Transcript Loading */}
            {session.audioUrl && session.transcript.length === 0 && (
              <TranscriptDisplay
                videoUrl={session.videoUrl}
                audioUrl={session.audioUrl}
                onTranscriptLoaded={handleTranscriptLoaded}
              />
            )}

            {/* Shadowing Player */}
            {session.audioUrl && session.transcript.length > 0 && (
              <ShadowingPlayer
                session={session}
                onLineChange={(index) => setSession({ ...session, currentLineIndex: index })}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}