/**
 * App Version Configuration
 * 
 * Semantic Versioning: MAJOR.MINOR.PATCH
 * - MAJOR: Breaking changes (1.0.0 -> 2.0.0)
 * - MINOR: New features (1.0.0 -> 1.1.0)  
 * - PATCH: Bug fixes (1.0.0 -> 1.0.1)
 */

export const APP_VERSION = {
  // Current version - update this for each release
  version: '2.0.0',
  
  // Build number - auto-incremented in CI/CD or manually
  build: process.env.NEXT_PUBLIC_BUILD_NUMBER || 'dev',
  
  // Git commit hash for tracking
  commit: process.env.NEXT_PUBLIC_COMMIT_SHA || 'local',
  
  // Release date
  releaseDate: '2025-08-01',
  
  // Release notes URL
  releaseNotesUrl: 'https://doshisensei.com/releases/v2.0.0',
  
  // Feature flags for gradual rollouts
  features: {
    kanjiMastery: true,
    leaderboard: true,
    friends: true,
    subscriptions: true,
  }
};

// Version history for tracking
export const VERSION_HISTORY = [
  {
    version: '2.0.0',
    date: '2025-08-01',
    changes: [
      '🚨 BREAKING: Complete subscription system overhaul - clean architecture',
      '🚨 BREAKING: Removed nested subscription structures',
      '✨ Fixed webhook to prevent mixed subscription data',
      '✨ Added admin dashboard compliance with new architecture',
      '✨ Implemented app versioning system',
      '🐛 Fixed premium users not getting access after payment',
      '📝 Comprehensive documentation for subscription migration',
      '🔧 Updated all subscription-related admin tools',
    ]
  },
  {
    version: '1.0.0',
    date: '2025-08-01',
    changes: [
      'Initial release',
      'Added Kanji Mastery feature',
      'Implemented leaderboard',
      'Added friends system',
    ]
  },
];

// Helper to check if update is available
export function isUpdateAvailable(currentVersion: string, latestVersion: string): boolean {
  const current = currentVersion.split('.').map(Number);
  const latest = latestVersion.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    if (latest[i] > current[i]) return true;
    if (latest[i] < current[i]) return false;
  }
  return false;
}

// Get full version string
export function getVersionString(): string {
  const { version, build, commit } = APP_VERSION;
  const env = process.env.NODE_ENV;
  
  if (env === 'production') {
    return `v${version}`;
  }
  
  return `v${version} (${build}) [${commit.slice(0, 7)}]`;
}

// Get version for API headers
export function getApiVersion(): string {
  return APP_VERSION.version;
}