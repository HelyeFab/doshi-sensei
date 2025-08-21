'use client';

import { useState } from 'react';
import { RefreshCw, Sparkles, Server, Globe, AlertCircle, Loader2, Check } from 'lucide-react';
import { TranscriptLine } from '../YouTubeShadowing';
import { motion, AnimatePresence } from 'framer-motion';
import { TranscriptCacheManager } from '@/utils/transcriptCache';
import SlideUpModal from '@/components/SlideUpModal';

interface RegenerateTranscriptProps {
  videoUrl: string;
  currentTranscript: TranscriptLine[];
  onTranscriptRegenerated: (transcript: TranscriptLine[], provider: string) => void;
  onClose?: () => void;
}

type Provider = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  requiresAuth?: boolean;
  requiresApiKey?: boolean;
};

const providers: Provider[] = [
  {
    id: 'supadata',
    name: 'SupaData AI',
    description: 'Primary provider with excellent Japanese support',
    icon: <Sparkles className="w-5 h-5" />,
  },
  {
    id: 'youtube-native',
    name: 'YouTube Native Captions',
    description: 'Direct extraction from YouTube\'s own captions',
    icon: <Globe className="w-5 h-5" />,
  },
  {
    id: 'youtube-transcript-io',
    name: 'YouTube-Transcript.io',
    description: 'Third-party service with reliable extraction',
    icon: <Server className="w-5 h-5" />,
    requiresApiKey: true
  },
  {
    id: 'whisper',
    name: 'OpenAI Whisper (Audio)',
    description: 'AI transcription from video audio',
    icon: <RefreshCw className="w-5 h-5" />,
  }
];

export default function RegenerateTranscript({
  videoUrl,
  currentTranscript,
  onTranscriptRegenerated,
  onClose
}: RegenerateTranscriptProps) {
  const [selectedProvider, setSelectedProvider] = useState<string>('supadata');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regenerationStatus, setRegenerationStatus] = useState<string>('');

  const handleRegenerate = async () => {
    const provider = providers.find(p => p.id === selectedProvider);
    if (!provider) return;

    setIsRegenerating(true);
    setError(null);
    setRegenerationStatus('Connecting to provider...');

    try {
      // Call the appropriate API based on selected provider
      let response;
      
      switch (selectedProvider) {
        case 'supadata':
          setRegenerationStatus('Extracting with SupaData AI...');
          response = await fetch('/api/youtube/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              url: videoUrl,
              provider: 'supadata',
              forceRegenerate: true 
            })
          });
          break;

        case 'youtube-native':
          setRegenerationStatus('Fetching YouTube captions...');
          response = await fetch('/api/youtube/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              url: videoUrl,
              provider: 'youtube-native',
              forceRegenerate: true 
            })
          });
          break;

        case 'youtube-transcript-io':
          setRegenerationStatus('Fetching via YouTube-Transcript.io...');
          response = await fetch('/api/youtube/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              url: videoUrl,
              provider: 'youtube-transcript-io',
              forceRegenerate: true 
            })
          });
          break;

        case 'whisper':
          setRegenerationStatus('Extracting audio for Whisper AI...');
          response = await fetch('/api/youtube/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              url: videoUrl,
              provider: 'whisper',
              forceRegenerate: true 
            })
          });
          break;

        default:
          throw new Error('Invalid provider selected');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to regenerate transcript');
      }

      const data = await response.json();
      
      if (data.success && data.transcript && data.transcript.length > 0) {
        // Generate proper content ID for YouTube videos
        const contentId = TranscriptCacheManager.generateContentId({
          type: 'youtube',
          videoUrl: videoUrl
        });
        
        // Trigger AI formatting for the new transcript
        setRegenerationStatus('Formatting transcript for optimal shadowing...');
        
        try {
          const formatResponse = await fetch('/api/ai/format-transcript', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contentId: contentId,
              transcript: data.transcript,
              language: 'ja'
            })
          });

          let formattedTranscript = data.transcript;
          
          if (formatResponse.ok) {
            const formatData = await formatResponse.json();
            if (formatData.success && formatData.formattedTranscript) {
              formattedTranscript = formatData.formattedTranscript;
              console.log('✅ Successfully applied AI formatting to regenerated transcript');
            }
          } else {
            console.warn('⚠️ AI formatting failed, using raw transcript');
          }
          
          setRegenerationStatus('Transcript regenerated successfully!');
          setTimeout(() => {
            onTranscriptRegenerated(formattedTranscript, selectedProvider);
            onClose?.();
          }, 1000);
        } catch (formatError) {
          console.error('Failed to format transcript:', formatError);
          // Still use the unformatted transcript if formatting fails
          setRegenerationStatus('Transcript regenerated successfully!');
          setTimeout(() => {
            onTranscriptRegenerated(data.transcript, selectedProvider);
            onClose?.();
          }, 1000);
        }
      } else {
        throw new Error(data.message || 'No transcript found');
      }
    } catch (err: any) {
      console.error('Regeneration error:', err);
      setError(err.message || 'Failed to regenerate transcript');
      setRegenerationStatus('');
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <SlideUpModal
      isOpen={true}
      onClose={onClose || (() => {})}
      title="Regenerate Transcript"
      height="70%"
      showHandle={false}
    >
      <div className="space-y-6">
        {/* Subtitle */}
        <p className="text-sm text-muted-foreground -mt-2">
          Choose a provider to extract a fresh transcript
        </p>

          {/* Provider Selection */}
          <div className="space-y-3">
            <h3 className="font-medium text-foreground">Select Provider</h3>
            <div className="grid gap-3">
              {providers.map((provider) => (
                <motion.div
                  key={provider.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    setSelectedProvider(provider.id);
                    setError(null);
                  }}
                  className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    selectedProvider === provider.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {/* Selected indicator */}
                  {selectedProvider === provider.id && (
                    <div className="absolute top-4 right-4">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-primary">
                      {provider.icon}
                    </div>
                    <div className="flex-1 min-w-0 pr-8">
                      <h4 className="font-semibold text-foreground mb-1">{provider.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {provider.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                      Regeneration Failed
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      {error}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Status Display */}
          <AnimatePresence>
            {regenerationStatus && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-spin" />
                  <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                    {regenerationStatus}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
            <button
              onClick={onClose}
              disabled={isRegenerating}
              className="flex-1 sm:flex-initial px-6 py-2.5 border border-border rounded-lg text-foreground hover:bg-muted transition-colors disabled:opacity-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating || !selectedProvider}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
            >
              {isRegenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Regenerate Transcript
                </>
              )}
            </button>
          </div>
      </div>
    </SlideUpModal>
  );
}