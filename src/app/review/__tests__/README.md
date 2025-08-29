# Unified Review Hub Tests

This directory contains comprehensive tests for the Unified Review Hub system, covering both automated integration tests and manual testing procedures.

## Test Files

### Integration Tests
- `unified-review-integration.test.tsx` - Main integration test suite covering the complete hub workflow
- `golden-time.test.tsx` - Specific tests for golden time learning optimization features  
- `subscription-features.test.tsx` - Tests for subscription tier-based access control and subscriber features
- `test-utils.tsx` - Shared mocks, fixtures, and helper functions
- `jest.setup.js` - Jest configuration and global test setup

### Manual Testing
- `../../../docs/remember/UNIFIED_REVIEW_HUB_TESTING.md` - Comprehensive manual testing checklist

## Running Tests

### Automated Tests
```bash
# Run all review hub tests
npm test src/app/review/__tests__

# Run specific test file
npm test unified-review-integration.test.tsx

# Run with coverage
npm test -- --coverage src/app/review/__tests__

# Run in watch mode during development
npm test -- --watch src/app/review/__tests__
```

### Manual Testing
Follow the comprehensive checklist in `UNIFIED_REVIEW_HUB_TESTING.md` to verify:
- User flows across different subscription tiers
- Golden time features and time transitions
- Source management and priority control
- Error handling and edge cases
- Cross-browser and device compatibility
- Accessibility compliance

## Test Coverage

### What's Tested
✅ **Hub Loading and Initialization**
- Registry setup and source registration
- Loading states and error handling
- Data fetching and display

✅ **Review Source Management**
- Source card display and interactions
- Priority management and reordering
- Enable/disable source controls
- Real-time updates and events

✅ **Golden Time Features**
- Time window detection and display
- Bonus multiplier calculations
- Transition handling between windows
- Next window predictions

✅ **Subscription Features and Access Control**
- Subscription tier detection
- Feature gating for free vs subscription users
- Upgrade prompts and messaging
- Cross-tier functionality preservation

✅ **Navigation and Session Management**
- Source navigation with return paths
- Review session launch and completion
- URL parameter handling
- Browser navigation (back/forward)

✅ **Statistics and Analytics**
- Aggregated statistics display
- Source-specific metrics
- Learning insights and recommendations
- Performance trends

✅ **User Interface**
- Responsive design across devices
- Accessibility compliance
- Keyboard navigation
- Screen reader compatibility

✅ **Error Handling**
- Network failures and recovery
- Source health check failures
- Graceful degradation
- User-friendly error messages

### Test Data Requirements
Tests use comprehensive mock data including:
- Multiple review sources with different types
- Items with various due dates and priorities
- Users with different subscription tiers
- Statistics across different time periods
- Golden time scenarios at various hours

## Test Architecture

### Mock Strategy
- **Registry Mocking**: Complete ReviewSourceRegistry mock with all methods
- **Source Mocking**: Individual review sources with realistic behavior
- **Auth Mocking**: Different user types and subscription tiers
- **Time Mocking**: Controlled time scenarios for golden time testing
- **Router Mocking**: Navigation and URL parameter handling

### Test Utilities
The `test-utils.tsx` file provides:
- Mock data generators for consistent test scenarios
- Helper functions for common test operations
- Time manipulation utilities for golden time testing
- Authentication context mocking for different user types
- Storage mocking for session/localStorage operations

### Best Practices
- **Isolation**: Each test is independent with proper cleanup
- **Realistic Data**: Mock data reflects real-world usage patterns  
- **Error Scenarios**: Tests cover both success and failure cases
- **User Perspective**: Tests focus on user-visible behavior
- **Performance**: Tests verify loading times and responsiveness

## Continuous Integration

These tests are designed to run in CI/CD pipelines with:
- Headless browser support for UI tests
- Consistent mock data for reproducible results
- Performance benchmarks and assertions
- Coverage reporting and thresholds
- Cross-browser testing capabilities

## Contributing to Tests

When adding new features to the Review Hub:

1. **Update Integration Tests**: Add test cases to `unified-review-integration.test.tsx`
2. **Create Feature-Specific Tests**: Add dedicated test files for complex features
3. **Update Manual Checklist**: Add new scenarios to the manual testing guide
4. **Update Mock Data**: Ensure test utilities reflect new data structures
5. **Verify Coverage**: Confirm new code paths are tested

### Test Naming Convention
- Describe behavior, not implementation: `"displays golden time indicator during morning hours"`
- Group related tests with `describe` blocks
- Use present tense for test descriptions
- Include both positive and negative test cases

### Mock Best Practices
- Keep mocks close to real implementations
- Update mocks when interfaces change
- Use realistic data that represents actual usage
- Mock at the appropriate level (component, service, or API)

## Debugging Tests

### Common Issues
- **Timing Issues**: Use `waitFor()` for async operations
- **Mock Updates**: Ensure mocks are cleared between tests
- **Component State**: Wait for loading states to complete
- **Event Handling**: Use `act()` for state updates

### Debug Tools
- `screen.debug()` to inspect rendered DOM
- `console.log` mock registry calls
- Breakpoints in test files work with most IDEs
- React Developer Tools for component inspection

## Performance Testing

While automated tests cover functionality, manual performance testing should verify:
- Initial load time under 3 seconds
- Source loading parallelization
- Smooth animations at 60fps
- Memory usage stability
- Network request efficiency

## Security Testing

Review hub tests include verification of:
- User data isolation between tiers
- Proper access control enforcement
- No client-side credential exposure
- Secure navigation parameter handling
- CSRF protection on state changes