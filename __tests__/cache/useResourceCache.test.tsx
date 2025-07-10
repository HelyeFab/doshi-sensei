import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useResourceCache } from '@/hooks/useResourceCache';
import { Kanji, Verb, Adjective, AudioResource } from '@/lib/cache';

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

// Test component to use the hook
const TestComponent = () => {
  const {
    cacheKanji,
    getKanji,
    cacheVerb,
    getVerb,
    cacheAdjective,
    getAdjective,
    cacheAudio,
    getAudio,
    clearAllCaches,
    getCacheStats
  } = useResourceCache();

  const handleCacheKanji = () => {
    const kanji: Kanji = {
      character: '日',
      readings: { onyomi: ['にち'], kunyomi: ['ひ'] },
      meanings: ['sun', 'day'],
      strokeCount: 4
    };
    cacheKanji(kanji);
  };

  const handleGetKanji = () => {
    getKanji('日');
  };

  return (
    <div>
      <button onClick={handleCacheKanji}>Cache Kanji</button>
      <button onClick={handleGetKanji}>Get Kanji</button>
      <button onClick={clearAllCaches}>Clear All</button>
      <button onClick={getCacheStats}>Get Stats</button>
    </div>
  );
};

describe('useResourceCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide caching methods', () => {
    render(<TestComponent />);

    expect(screen.getByText('Cache Kanji')).toBeInTheDocument();
    expect(screen.getByText('Get Kanji')).toBeInTheDocument();
    expect(screen.getByText('Clear All')).toBeInTheDocument();
    expect(screen.getByText('Get Stats')).toBeInTheDocument();
  });

  it('should call cache methods when buttons are clicked', async () => {
    const { KanjiCache } = require('@/lib/cache/kanjiCache');

    render(<TestComponent />);

    fireEvent.click(screen.getByText('Cache Kanji'));

    await waitFor(() => {
      expect(KanjiCache.cacheKanji).toHaveBeenCalledWith(
        expect.objectContaining({
          character: '日',
          readings: { onyomi: ['にち'], kunyomi: ['ひ'] },
          meanings: ['sun', 'day'],
          strokeCount: 4
        })
      );
    });
  });

  it('should call get methods when buttons are clicked', async () => {
    const { KanjiCache } = require('@/lib/cache/kanjiCache');

    render(<TestComponent />);

    fireEvent.click(screen.getByText('Get Kanji'));

    await waitFor(() => {
      expect(KanjiCache.getKanji).toHaveBeenCalledWith('日', undefined);
    });
  });

  it('should handle clear all caches', async () => {
    const { KanjiCache } = require('@/lib/cache/kanjiCache');
    const { VerbCache } = require('@/lib/cache/verbCache');
    const { AdjectiveCache } = require('@/lib/cache/adjectiveCache');
    const { AudioCache } = require('@/lib/cache/audioCache');

    render(<TestComponent />);

    fireEvent.click(screen.getByText('Clear All'));

    await waitFor(() => {
      expect(KanjiCache.clearCache).toHaveBeenCalled();
      expect(VerbCache.clearCache).toHaveBeenCalled();
      expect(AdjectiveCache.clearCache).toHaveBeenCalled();
      expect(AudioCache.clearCache).toHaveBeenCalled();
    });
  });

  it('should handle get cache stats', async () => {
    const { KanjiCache } = require('@/lib/cache/kanjiCache');

    render(<TestComponent />);

    fireEvent.click(screen.getByText('Get Stats'));

    await waitFor(() => {
      expect(KanjiCache.getCacheStats).toHaveBeenCalled();
    });
  });
});
