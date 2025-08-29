# Review Sources Test Suite

This directory contains comprehensive test suites for the Review Sources system, focusing on testing real data connections with proper service mocking.

## Test Files

### kanji-mastery.test.ts

**Coverage: 91.87% statements, 95.65% functions**

Comprehensive test suite for the Kanji Mastery review source that verifies:

#### Core Functionality
- ✅ Real DataSyncService and ReviewQueueService integration
- ✅ Client-side vs server-side initialization handling
- ✅ Due items retrieval with priority calculation
- ✅ Statistics calculation from real data
- ✅ Review processing with FSRS rating conversion
- ✅ Item searching and retrieval

#### Configuration & Management
- ✅ Configuration updates and status changes
- ✅ Health checks and lifecycle management
- ✅ Proper initialization and destruction

#### Error Handling
- ✅ Service unavailability scenarios
- ✅ Network connectivity issues
- ✅ Malformed data handling
- ✅ Invalid input validation

#### User Types
- ✅ Guest users (null ID)
- ✅ Free users with standard limits
- ✅ Subscribers with higher limits

#### Priority System
- ✅ Overdue item prioritization
- ✅ Difficulty-based priority adjustment
- ✅ JLPT level consideration
- ✅ Lapse count impact
- ✅ Priority capping at maximum values

## Testing Approach

### Service Mocking
- Uses proper Jest mocking for external services
- Maintains realistic data structures and responses
- Tests actual integration points without database dependencies

### Test Data
- Realistic kanji progress items with FSRS data
- Mock user statistics and review queues
- Various difficulty levels and states

### Coverage Goals
- High statement and function coverage (>90%)
- Edge case and error scenario testing
- Complete user journey coverage

## Running Tests

```bash
# Run all review source tests
npm test -- src/lib/review-sources/__tests__/

# Run specific test file
npm test -- src/lib/review-sources/__tests__/sources/kanji-mastery.test.ts

# Run with coverage
npm test -- src/lib/review-sources/__tests__/ --coverage
```

## Adding New Tests

When adding tests for new review sources:

1. Follow the established mocking patterns
2. Test all major methods and error scenarios
3. Include user type variations
4. Verify real service integration points
5. Aim for >90% coverage
6. Test priority calculation logic
7. Include malformed data scenarios

## Best Practices

- Mock external services properly to avoid database dependencies
- Use realistic test data that matches production structures
- Test both happy path and error scenarios
- Verify console logging for debugging
- Test all user permission levels
- Include edge cases like empty responses and null data