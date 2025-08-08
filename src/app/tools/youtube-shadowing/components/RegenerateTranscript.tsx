'use client';

import { useState } from 'react';
import { RefreshCw, Sparkles, Server, Globe, AlertCircle, Loader2, Check } from 'lucide-react';
import { TranscriptLine } from '../YouTubeShadowing';
import { motion, AnimatePresence } from 'framer-motion';

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
  pros: string[];
  cons: string[];
  requiresAuth?: boolean;
  requiresApiKey?: boolean;
  cost?: string;
};

const providers: Provider[] = [
  {
    id: 'supadata',
    name: 'SupaData AI (Recommended)',
    description: 'Our primary provider with excellent Japanese support (we pay for each request)',
    icon: <Sparkles className="w-5 h-5" />,
    pros: [
      'Excellent Japanese caption support',
      'Works with most videos',
      'Fast and reliable',
      'Cached for community benefit'
    ],
    cons: [
      'Costs us money per request',
      'May fail on very new videos'
    ],
    cost: 'Free to you (we pay)'
  },
  {
    id: 'youtube-native',
    name: 'YouTube Native Captions',
    description: 'Direct extraction from YouTube\'s own captions',
    icon: <Globe className="w-5 h-5" />,
    pros: [
      'Official YouTube captions',
      'Most accurate when available',
      'Completely free'
    ],
    cons: [
      'Not all videos have captions',
      'May be auto-generated (lower quality)',
      'Can be blocked by YouTube'
    ],
    cost: 'Free'
  },
  {
    id: 'youtube-transcript-io',
    name: 'YouTube-Transcript.io',
    description: 'Third-party service with reliable extraction',
    icon: <Server className="w-5 h-5" />,
    pros: [
      'Very reliable extraction',
      'Works when YouTube blocks direct access',
      'Good for bulk processing'
    ],
    cons: [
      'Requires API key for heavy use',
      'Limited free tier (25/month)',
      'May have rate limits'
    ],
    cost: 'Free tier: 25/mo',
    requiresApiKey: true
  },
  {
    id: 'whisper',
    name: 'OpenAI Whisper (Audio)',
    description: 'AI transcription from video audio (we pay OpenAI for processing)',
    icon: <RefreshCw className="w-5 h-5" />,
    pros: [
      'Works on any video',
      'High accuracy for clear audio',
      'Creates transcript when none exists'
    ],
    cons: [
      'Slower processing',
      'Requires audio extraction',
      'May miss on-screen text',
      'Costs us money per minute'
    ],
    cost: 'Free to you (we pay ~$0.006/min)'
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
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [regenerationStatus, setRegenerationStatus] = useState<string>('');

  const handleRegenerate = async () => {
    const provider = providers.find(p => p.id === selectedProvider);
    if (!provider) return;

    // Check if API key is required
    if (provider.requiresApiKey && !apiKey) {
      setShowApiKeyInput(true);
      setError('Please provide an API key for this provider');
      return;
    }

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
              apiKey: apiKey,
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
        setRegenerationStatus('Transcript regenerated successfully!');
        setTimeout(() => {
          onTranscriptRegenerated(data.transcript, selectedProvider);
          onClose?.();
        }, 1000);
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-6 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <RefreshCw className="w-6 h-6" />
                Regenerate Transcript
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a provider to extract a fresh transcript
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
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
                    setShowApiKeyInput(false);
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

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-muted rounded-lg flex items-center justify-center text-primary">
                      {provider.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-foreground">{provider.name}</h4>
                        {provider.cost && (
                          <span className="text-xs bg-muted px-2 py-1 rounded-full">
                            {provider.cost}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {provider.description}
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Pros:</p>
                          <ul className="text-xs space-y-1">
                            {provider.pros.map((pro, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                                <span className="text-muted-foreground">{pro}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">Cons:</p>
                          <ul className="text-xs space-y-1">
                            {provider.cons.map((con, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <span className="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
                                <span className="text-muted-foreground">{con}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* API Key Input */}
                      {provider.requiresApiKey && selectedProvider === provider.id && showApiKeyInput && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-3 p-3 bg-muted/50 rounded-lg"
                        >
                          <label className="block text-sm font-medium text-foreground mb-2">
                            API Key Required
                          </label>
                          <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter your API key"
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            Get your API key from{' '}
                            <a 
                              href="https://www.youtube-transcript.io" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              youtube-transcript.io
                            </a>
                          </p>
                        </motion.div>
                      )}
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
                className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {regenerationStatus}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              onClick={onClose}
              disabled={isRegenerating}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating || !selectedProvider}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
      </motion.div>
    </div>
  );
}