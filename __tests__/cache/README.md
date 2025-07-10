# Resource Cache Test Suite

This directory contains comprehensive tests for the Phase 2 resource caching implementation. The tests cover all aspects of the caching system including individual cache managers, the unified ResourceCacheManager, React hooks, and full integration scenarios.

## Test Structure

### Individual Cache Tests

- **`kanjiCache.test.ts`** - Tests for KanjiCache implementation
- **`verbCache.test.ts`** - Tests for VerbCache implementation
- **`adjectiveCache.test.ts`** - Tests for AdjectiveCache implementation
- **`audioCache.test.ts`** - Tests for AudioCache implementation

### Unified Manager Tests

- **`resourceCacheManager.test.ts`** - Tests for ResourceCacheManager that coordinates all cache types

### React Hook Tests

- **`useResourceCache.test.tsx`** - Tests for the useResourceCache React hook with three-pillar integration

### Integration Tests

- **`integration.test.tsx`** - End-to-end tests that verify the entire system works together

## Test Coverage

### Individual Cache Managers

Each cache manager test covers:

#### Core Operations

- ✅ Caching individual resources
- ✅ Retrieving cached resources
- ✅ Batch caching operations
- ✅ Cache clearing
- ✅ Cache statistics

#### Error Handling

- ✅ Storage errors during caching
- ✅ Retrieval errors
- ✅ Network errors
- ✅ Invalid data handling

#### Performance

- ✅ Fast retrieval (< 50ms)
- ✅ Efficient batch processing
- ✅ Memory usage optimization

#### Edge Cases

- ✅ Stale cache handling
- ✅ Missing resources
- ✅ Invalid resource types
- ✅ Large datasets

### ResourceCacheManager

Tests the unified interface that coordinates all cache types:

#### Unified Operations

- ✅ Type-safe resource caching
- ✅ Unified retrieval interface
- ✅ Batch operations across types
- ✅ Combined statistics

#### Error Propagation

- ✅ Individual cache errors don't crash system
- ✅ Graceful degradation
- ✅ Error recovery

### useResourceCache Hook

Tests React integration with three-pillar architecture:

#### Three-Pillar Integration

- ✅ User type-based caching (free/premium/admin)
- ✅ Feature availability checks
- ✅ Resource limits enforcement
- ✅ Admin privileges

#### React Patterns

- ✅ Loading states
- ✅ Error states
- ✅ Async operations
- ✅ State management

#### Performance

- ✅ Fast UI updates
- ✅ Responsive interactions
- ✅ Memory efficiency

### Integration Tests

End-to-end scenarios that test the complete system:

#### Real-world Workflows

- ✅ Offline-first caching
- ✅ Batch operations
- ✅ Error recovery
- ✅ Performance under load

#### User Scenarios

- ✅ Premium vs free user behavior
- ✅ Feature toggles
- ✅ Admin operations
- ✅ Network failures

## Running Tests

### Run All Cache Tests

```bash
npm test __tests__/cache/
```

### Run Specific Test Files

```bash
# Individual cache tests
npm test __tests__/cache/kanjiCache.test.ts
npm test __tests__/cache/verbCache.test.ts
npm test __tests__/cache/adjectiveCache.test.ts
npm test __tests__/cache/audioCache.test.ts

# Unified manager tests
npm test __tests__/cache/resourceCacheManager.test.ts

# React hook tests
npm test __tests__/cache/useResourceCache.test.tsx

# Integration tests
npm test __tests__/cache/integration.test.tsx
```

### Run with Coverage

```bash
npm test __tests__/cache/ -- --coverage
```

### Run in Watch Mode

```bash
npm test __tests__/cache/ -- --watch
```

## Test Data

### Sample Resources

Each test uses realistic sample data:

#### Kanji

```typescript
{
  character: '漢',
  readings: { onyomi: ['かん'], kunyomi: [] },
  meanings: ['Chinese', 'Sino-'],
  strokeCount: 13,
  jlptLevel: 'N1',
  examples: [...]
}
```

#### Verbs

```typescript
{
  dictionaryForm: '食べる',
  reading: 'たべる',
  meaning: 'to eat',
  type: 'ichidan',
  conjugations: {...},
  examples: [...]
}
```

#### Adjectives

```typescript
{
  dictionaryForm: '大きい',
  reading: 'おおきい',
  meaning: 'big, large',
  type: 'i-adjective',
  conjugations: {...},
  examples: [...]
}
```

#### Audio

```typescript
{
  id: 'kanji-漢',
  url: '/api/audio/kanji/漢',
  type: 'kanji',
  text: '漢',
  language: 'ja',
  voice: 'female',
  speed: 1.0,
  format: 'mp3',
  duration: 2.5,
  fileSize: 51200
}
```

## Mocking Strategy

### EnhancedStorageManager2

All tests mock the EnhancedStorageManager2 to isolate the cache logic:

```typescript
jest.mock("@/utils/enhancedStorageManager2");
const mockEnhancedStorageManager2 = EnhancedStorageManager2 as jest.Mocked<
  typeof EnhancedStorageManager2
>;
```

### Three-Pillar Hooks

React hook tests mock the three-pillar system:

```typescript
jest.mock("@/hooks/useAccess");
jest.mock("@/hooks/useFeature");
```

### ResourceCacheManager

Integration tests mock the ResourceCacheManager to test component behavior:

```typescript
jest.mock("@/lib/cache/resourceCacheManager");
```

## Performance Benchmarks

### Speed Requirements

- **Cache retrieval**: < 50ms
- **Cache storage**: < 100ms
- **Batch operations**: < 500ms for 25 items
- **UI responsiveness**: < 100ms for user interactions

### Memory Requirements

- **Efficient storage**: Minimal overhead per cached item
- **LRU eviction**: Automatic cleanup of old items
- **Size limits**: Respect user type and feature limits

## Error Scenarios

### Network Errors

- ✅ Connection failures during caching
- ✅ Timeout handling
- ✅ Retry logic

### Storage Errors

- ✅ IndexedDB quota exceeded
- ✅ Corrupted cache data
- ✅ Storage not available

### User Permission Errors

- ✅ Feature disabled
- ✅ User type restrictions
- ✅ Admin access denied

## Test Patterns

### Async Testing

All tests properly handle async operations:

```typescript
await act(async () => {
  await result.current.cacheResource("kanji", sampleKanji);
});
```

### Error Testing

Tests verify error handling:

```typescript
mockResourceCacheManager.cacheResource.mockRejectedValue(
  new Error("Cache error")
);
await expect(cacheOperation()).rejects.toThrow("Cache error");
```

### Performance Testing

Tests measure performance:

```typescript
const start = performance.now();
await cacheOperation();
const duration = performance.now() - start;
expect(duration).toBeLessThan(50);
```

## Continuous Integration

### Pre-commit Hooks

Tests run automatically before commits to ensure quality.

### Coverage Requirements

- **Minimum coverage**: 90%
- **Critical paths**: 100%
- **Error handling**: 100%

### Performance Regression

Tests detect performance regressions and fail if benchmarks are exceeded.

## Debugging Tests

### Verbose Output

```bash
npm test __tests__/cache/ -- --verbose
```

### Debug Specific Test

```bash
npm test __tests__/cache/kanjiCache.test.ts -- --testNamePattern="should cache kanji successfully"
```

### Mock Inspection

```typescript
expect(mockEnhancedStorageManager2.cacheResource).toHaveBeenCalledWith(
  expect.objectContaining({
    id: "漢",
    type: "kanji",
  }),
  "free"
);
```

## Future Test Additions

### Phase 3 Tests

- ✅ Eviction strategy tests
- ✅ Background sync tests
- ✅ Conflict resolution tests

### Phase 4 Tests

- ✅ Advanced caching patterns
- ✅ Predictive caching
- ✅ Cache warming tests

### Phase 5 Tests

- ✅ Full system integration
- ✅ Performance benchmarks
- ✅ Stress testing

## Contributing

When adding new cache functionality:

1. **Add unit tests** for the new feature
2. **Update integration tests** to cover the new workflow
3. **Add performance benchmarks** if applicable
4. **Update this README** with new test patterns

### Test Naming Convention

- `should [action] when [condition]`
- `should handle [error scenario] gracefully`
- `should [performance metric] under [conditions]`

### Test Organization

- Group related tests in `describe` blocks
- Use `beforeEach` for common setup
- Use `afterEach` for cleanup
- Mock external dependencies consistently
