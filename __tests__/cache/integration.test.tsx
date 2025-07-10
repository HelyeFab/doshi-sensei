import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResourceCacheDemo from '@/components/ResourceCacheDemo';

// Mock Firebase and other browser dependencies
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-user', email: 'test@example.com' },
    loading: false,
    signInWithEmail: jest.fn(),
    signOut: jest.fn(),
    signUp: jest.fn()
  })
}));

jest.mock('@/hooks/useAccess', () => ({
  useAccess: () => ({
    hasFeature: jest.fn(() => true),
    getUserType: jest.fn(() => 'premium'),
    isFeatureEnabled: jest.fn(() => true),
    getFeatureLimit: jest.fn(() => 1000),
    getFeatureUsage: jest.fn(() => 0)
  })
}));

jest.mock('@/hooks/useFeature', () => ({
  useFeature: () => ({
    isFeatureEnabled: jest.fn(() => true),
    getFeatureValue: jest.fn(() => 100),
    isFeatureAvailable: jest.fn(() => true)
  })
}));

jest.mock('@/lib/firebase', () => ({
  app: {},
  auth: {},
  firestore: {}
}));

jest.mock('@/lib/subscriptions/manager', () => ({
  SubscriptionsManager: {
    getUserType: jest.fn(() => 'premium'),
    getSubscriptionStatus: jest.fn(() => 'active'),
    getCurrentPlan: jest.fn(() => 'premium')
  }
}));

jest.mock('@/lib/access/index', () => ({
  AccessManager: {
    hasFeature: jest.fn(() => true),
    getUserType: jest.fn(() => 'premium')
  }
}));

jest.mock('@/lib/features/registry', () => ({
  FeaturesRegistry: {
    isFeatureEnabled: jest.fn(() => true),
    getFeatureValue: jest.fn(() => 100)
  }
}));

jest.mock('@/hooks/useSubscription2', () => ({
  useSubscription2: () => ({
    subscription: {
      status: 'active',
      plan: 'premium',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    loading: false,
    error: null
  })
}));

jest.mock('@/lib/cache/kanjiCache', () => ({
  KanjiCache: {
    cacheKanji: jest.fn(),
    getKanji: jest.fn(),
    cacheKanjiSet: jest.fn(),
    preCacheRelated: jest.fn(),
    clearCache: jest.fn(),
    getCacheStats: jest.fn()
  }
}));

jest.mock('@/lib/cache/verbCache', () => ({
  VerbCache: {
    cacheVerb: jest.fn(),
    getVerb: jest.fn(),
    cacheVerbSet: jest.fn(),
    preCacheRelated: jest.fn(),
    clearCache: jest.fn(),
    getCacheStats: jest.fn()
  }
}));

jest.mock('@/lib/cache/adjectiveCache', () => ({
  AdjectiveCache: {
    cacheAdjective: jest.fn(),
    getAdjective: jest.fn(),
    cacheAdjectiveSet: jest.fn(),
    preCacheRelated: jest.fn(),
    clearCache: jest.fn(),
    getCacheStats: jest.fn()
  }
}));

jest.mock('@/lib/cache/audioCache', () => ({
  AudioCache: {
    cacheAudio: jest.fn(),
    getAudio: jest.fn(),
    cacheAudioSet: jest.fn(),
    preCacheRelated: jest.fn(),
    clearCache: jest.fn(),
    getCacheStats: jest.fn()
  }
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('ResourceCacheDemo Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the demo component', () => {
    render(<ResourceCacheDemo />);

    expect(screen.getByText('Resource Cache Demo')).toBeInTheDocument();
    expect(screen.getByText('Cache Kanji')).toBeInTheDocument();
    expect(screen.getByText('Cache Verb')).toBeInTheDocument();
    expect(screen.getByText('Cache Adjective')).toBeInTheDocument();
    expect(screen.getByText('Cache Audio')).toBeInTheDocument();
  });

  it('should handle kanji caching', async () => {
    const { KanjiCache } = require('@/lib/cache/kanjiCache');

    render(<ResourceCacheDemo />);

    fireEvent.click(screen.getByText('Cache Kanji'));

    await waitFor(() => {
      expect(KanjiCache.cacheKanji).toHaveBeenCalled();
    });
  });

  it('should handle verb caching', async () => {
    const { VerbCache } = require('@/lib/cache/verbCache');

    render(<ResourceCacheDemo />);

    fireEvent.click(screen.getByText('Cache Verb'));

    await waitFor(() => {
      expect(VerbCache.cacheVerb).toHaveBeenCalled();
    });
  });

  it('should handle adjective caching', async () => {
    const { AdjectiveCache } = require('@/lib/cache/adjectiveCache');

    render(<ResourceCacheDemo />);

    fireEvent.click(screen.getByText('Cache Adjective'));

    await waitFor(() => {
      expect(AdjectiveCache.cacheAdjective).toHaveBeenCalled();
    });
  });

  it('should handle audio caching', async () => {
    const { AudioCache } = require('@/lib/cache/audioCache');

    render(<ResourceCacheDemo />);

    fireEvent.click(screen.getByText('Cache Audio'));

    await waitFor(() => {
      expect(AudioCache.cacheAudio).toHaveBeenCalled();
    });
  });

  it('should handle clear all caches', async () => {
    const { KanjiCache } = require('@/lib/cache/kanjiCache');
    const { VerbCache } = require('@/lib/cache/verbCache');
    const { AdjectiveCache } = require('@/lib/cache/adjectiveCache');
    const { AudioCache } = require('@/lib/cache/audioCache');

    render(<ResourceCacheDemo />);

    fireEvent.click(screen.getByText('Clear All Caches'));

    await waitFor(() => {
      expect(KanjiCache.clearCache).toHaveBeenCalled();
      expect(VerbCache.clearCache).toHaveBeenCalled();
      expect(AdjectiveCache.clearCache).toHaveBeenCalled();
      expect(AudioCache.clearCache).toHaveBeenCalled();
    });
  });

  it('should display cache stats', async () => {
    const { KanjiCache } = require('@/lib/cache/kanjiCache');
    KanjiCache.getCacheStats.mockResolvedValue({
      count: 5,
      totalSize: 10240,
      oldestKanji: new Date(),
      newestKanji: new Date()
    });

    render(<ResourceCacheDemo />);

    fireEvent.click(screen.getByText('Get Cache Stats'));

    await waitFor(() => {
      expect(KanjiCache.getCacheStats).toHaveBeenCalled();
    });
  });
});
