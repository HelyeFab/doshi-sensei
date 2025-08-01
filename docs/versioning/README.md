# Doshi Sensei Versioning System

## Overview

Doshi Sensei uses **Semantic Versioning (SemVer)** to track releases and changes, similar to how major apps like Starbucks, Uber, and Spotify manage their versions.

## Version Format

**`MAJOR.MINOR.PATCH`** (e.g., `1.2.3`)

- **MAJOR**: Breaking changes that require user action or major feature overhauls
- **MINOR**: New features, enhancements, or significant improvements
- **PATCH**: Bug fixes, small improvements, security patches

## How Major Apps Do It

### Real-World Examples
- **Starbucks**: 6.34.1 (frequent minor updates for seasonal features)
- **Uber**: 4.481.10000 (high patch numbers for continuous deployment)
- **Spotify**: 8.8.94.554 (includes build number for internal tracking)
- **Instagram**: 312.0.0.0.4 (multiple version segments)

### Key Practices from Big Apps

1. **Forced Updates**: Critical security or breaking changes
2. **A/B Testing**: Different features for different version ranges
3. **Rollback Capability**: Can disable features remotely
4. **Analytics**: Track which versions are in use
5. **Staged Rollouts**: Release to percentage of users first

## Our Implementation

### 1. Version Configuration
Located in `/src/config/version.ts`:
```typescript
export const APP_VERSION = {
  version: '1.0.0',
  build: process.env.NEXT_PUBLIC_BUILD_NUMBER || 'dev',
  commit: process.env.NEXT_PUBLIC_COMMIT_SHA || 'local',
  releaseDate: '2025-08-01',
  releaseNotesUrl: 'https://doshisensei.com/releases/v1.0.0',
};
```

### 2. Version Bumping

```bash
# Patch version (1.0.0 -> 1.0.1)
npm run version:patch

# Minor version (1.0.0 -> 1.1.0)
npm run version:minor

# Major version (1.0.0 -> 2.0.0)
npm run version:major
```

### 3. Release Process

1. **Development Phase**
   ```bash
   # Feature branch
   git checkout -b feature/new-feature
   # Make changes...
   git commit -m "feat: add new feature"
   ```

2. **Pre-Release**
   ```bash
   # Bump version
   npm run version:minor
   
   # Update VERSION_HISTORY in src/config/version.ts
   # Add release notes
   ```

3. **Release**
   ```bash
   # Commit version bump
   git add -A
   git commit -m "chore: bump version to v1.1.0"
   
   # Tag release
   git tag -a v1.1.0 -m "Release version 1.1.0"
   
   # Push
   git push origin main
   git push origin v1.1.0
   ```

4. **Deploy**
   ```bash
   # Production build with version info
   NEXT_PUBLIC_BUILD_NUMBER=$(date +%s) \
   NEXT_PUBLIC_COMMIT_SHA=$(git rev-parse HEAD) \
   npm run build
   ```

## Version Display

### In the App
```tsx
import { VersionDisplay } from '@/components/VersionDisplay';

// Footer or Settings page
<VersionDisplay showDetails={true} />
```

### In API Headers
```typescript
headers: {
  'X-App-Version': getApiVersion(),
  'X-API-Version': '1.0',
}
```

## Feature Flags

Control feature rollout by version:
```typescript
if (isVersionGreaterOrEqual(userVersion, '1.1.0')) {
  // Show new feature
}
```

## Version Tracking

### 1. User Agent
Include version in API calls:
```typescript
const userAgent = `DoshiSensei/${APP_VERSION.version} (${platform})`;
```

### 2. Analytics
Track version distribution:
```typescript
analytics.track('app_opened', {
  version: APP_VERSION.version,
  build: APP_VERSION.build,
  platform: 'web',
});
```

### 3. Error Reporting
Include version in error reports:
```typescript
Sentry.setTag('app_version', APP_VERSION.version);
```

## Migration Strategy

For breaking changes:

1. **Deprecation Notice** (v1.0.0)
   - Add warning for upcoming change
   - Set deprecation date

2. **Dual Support** (v1.1.0)
   - Support both old and new methods
   - Track usage of deprecated features

3. **Remove Old Code** (v2.0.0)
   - Major version bump
   - Remove deprecated code
   - Force update if critical

## Best Practices

1. **Regular Releases**: Weekly or bi-weekly
2. **Clear Changelog**: Document all changes
3. **Beta Testing**: Use version like `1.1.0-beta.1`
4. **Hotfix Process**: Use `1.0.1` for urgent fixes
5. **Version in URLs**: `/api/v1/endpoint`

## Example Release Notes

### v1.1.0 - New Features (2025-08-01)
- ✨ Added Kanji Mastery feature
- ✨ Implemented leaderboard system
- 🐛 Fixed subscription nested structure issue
- 🔧 Improved admin dashboard
- 📱 Enhanced mobile experience

### v1.0.1 - Bug Fixes (2025-07-20)
- 🐛 Fixed login issue on Safari
- 🔒 Security patch for API endpoints
- ⚡ Performance improvements

## Automation (Future)

### GitHub Actions
```yaml
- name: Bump version
  run: |
    VERSION=$(node -p "require('./package.json').version")
    echo "VERSION=$VERSION" >> $GITHUB_ENV
    echo "BUILD_NUMBER=${{ github.run_number }}" >> $GITHUB_ENV
```

### Version Check API
```typescript
// Check for updates
const response = await fetch('/api/version/check');
const { latestVersion, updateRequired } = await response.json();
```

## Conclusion

This versioning system provides:
- **Clear tracking** of changes
- **Easy rollback** capability
- **User communication** about updates
- **Professional approach** matching industry standards

Similar to how Uber can push updates frequently while maintaining stability, this system allows Doshi Sensei to evolve rapidly while keeping users informed and systems compatible.