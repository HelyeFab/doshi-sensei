import TTSCache from './ttsCache';

/**
 * Utility to clear TTS cache when voice settings change
 */
export async function clearAllTTSCache() {
  const cache = TTSCache.getInstance();
  await cache.clearCache();
  console.log('✅ TTS cache cleared successfully');
}

// Clear cache for specific provider
export async function clearProviderCache(provider: 'elevenlabs' | 'google') {
  const cache = TTSCache.getInstance();
  // Since clearCache clears everything, we'll do that for now
  // In the future, we could implement provider-specific clearing
  await cache.clearCache();
  console.log(`✅ TTS cache cleared for ${provider}`);
}