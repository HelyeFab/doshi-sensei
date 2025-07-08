# Doshi Sensei Test Suite

This comprehensive test suite ensures the reliability and correctness of the Doshi Sensei Japanese conjugation application.

## Test Overview

The test suite covers all critical aspects of the application:

### 📁 Test Structure

```
__tests__/
├── integration/           # Integration tests
│   └── conjugation-flow.test.tsx
src/
├── app/
│   ├── __tests__/
│   │   └── page.test.tsx         # Home page tests
│   └── drill/__tests__/
│       └── page.test.tsx         # Drill page tests
├── utils/__tests__/
│   ├── conjugation.test.ts       # Conjugation engine tests
│   └── api.test.ts              # API utility tests
└── types/
    └── jest-dom.d.ts            # TypeScript declarations
```

### 🧪 Test Categories

#### 1. **Core Functionality Tests** (`src/utils/__tests__/`)

**Conjugation Engine Tests** (`conjugation.test.ts`)
- ✅ Ichidan verb conjugations (全127 forms)
- ✅ Godan verb conjugations with all endings (う、く、ぐ、す、つ、ぬ、ぶ、む、る)
- ✅ Irregular verb conjugations (する、来る、compound verbs)
- ✅ i-adjective conjugations
- ✅ na-adjective conjugations
- ✅ Conjugation rule explanations
- ✅ Helper functions (random forms, question stems)
- ✅ Error handling and edge cases

**API Utility Tests** (`api.test.ts`)
- ✅ Word search functionality
- ✅ WaniKani API integration
- ✅ Jisho API fallback
- ✅ CORS proxy handling
- ✅ Word type detection
- ✅ JLPT level classification
- ✅ Error handling and retry logic
- ✅ Data transformation and filtering

#### 2. **Component Tests** (`src/app/__tests__/`)

**Home Page Tests** (`page.test.tsx`)
- ✅ App branding and header rendering
- ✅ Navigation card functionality
- ✅ Statistics display
- ✅ Responsive design classes
- ✅ Accessibility compliance
- ✅ User interactions
- ✅ Japanese text rendering

**Drill Page Tests** (`drill/__tests__/page.test.tsx`)
- ✅ Loading states
- ✅ Game flow (start → question → answer → results)
- ✅ Score tracking
- ✅ Answer selection and feedback
- ✅ Rules toggle functionality
- ✅ Session storage handling
- ✅ Error states and retry logic
- ✅ Accessibility features

#### 3. **Integration Tests** (`__tests__/integration/`)

**Conjugation Flow Tests** (`conjugation-flow.test.tsx`)
- ✅ End-to-end conjugation workflows
- ✅ Cross-word-type consistency
- ✅ Performance benchmarks
- ✅ Memory leak prevention
- ✅ Large dataset handling
- ✅ Error resilience

### 🛠️ Test Configuration

#### Jest Configuration (`jest.config.js`)
- Next.js integration
- TypeScript support
- Coverage reporting
- Path mapping for imports
- Custom test environment

#### Setup (`jest.setup.js`)
- Testing Library DOM matchers
- Next.js router mocking
- Storage API mocking
- Axios mocking
- Console suppression

### 🎯 Coverage Targets

The test suite aims for comprehensive coverage:

- **Statements**: >95%
- **Branches**: >90%
- **Functions**: >95%
- **Lines**: >95%

### 🚀 Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run tests for CI/CD
npm run test:ci
```

### 📊 Test Metrics

#### Core Features Tested
- **Conjugation Engine**: 127 conjugation forms across 5 word types
- **API Integration**: 15+ API scenarios including fallbacks
- **UI Components**: 40+ user interface interactions
- **Error Handling**: 20+ error scenarios and edge cases
- **Performance**: 1000+ conjugations in <1 second
- **Accessibility**: WCAG compliance testing

#### Test Categories by Numbers
- **Unit Tests**: 85+ individual test cases
- **Component Tests**: 25+ React component tests
- **Integration Tests**: 15+ end-to-end workflows
- **Edge Cases**: 10+ error and boundary tests
- **Performance Tests**: 5+ benchmark tests

### 🔧 Test Development Guidelines

#### Writing New Tests

1. **Follow AAA Pattern**:
   ```typescript
   test('should do something', () => {
     // Arrange
     const input = createTestData();

     // Act
     const result = functionUnderTest(input);

     // Assert
     expect(result).toBe(expectedOutput);
   });
   ```

2. **Use Descriptive Names**:
   ```typescript
   // Good
   test('should conjugate Ichidan verbs to past tense correctly')

   // Bad
   test('conjugation test')
   ```

3. **Mock External Dependencies**:
   ```typescript
   jest.mock('@/utils/api');
   const mockApi = api as jest.Mocked<typeof api>;
   ```

4. **Test Edge Cases**:
   ```typescript
   test('should handle empty input gracefully', () => {
     expect(() => conjugate('')).not.toThrow();
   });
   ```

#### Best Practices

- **Test Behavior, Not Implementation**: Focus on what the code does, not how
- **Keep Tests Independent**: Each test should be able to run in isolation
- **Use Realistic Test Data**: Test with actual Japanese characters and realistic scenarios
- **Mock External Services**: Don't rely on external APIs in tests
- **Test Accessibility**: Ensure UI components are accessible
- **Performance Testing**: Include benchmarks for critical functions

### 🐛 Debugging Tests

#### Common Issues

1. **Mock Issues**: Ensure mocks are cleared between tests
2. **Async Operations**: Use `waitFor` for async operations
3. **DOM Queries**: Use appropriate queries (`getByRole`, `getByText`, etc.)
4. **TypeScript Errors**: Ensure proper type mocking

#### Debug Commands

```bash
# Run specific test file
npm test conjugation.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="Ichidan"

# Run with verbose output
npm test -- --verbose

# Debug with Node.js inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

### 📈 Continuous Integration

Tests are designed to run in CI/CD environments:

- **GitHub Actions**: Automated testing on push/PR
- **Coverage Reports**: Automated coverage reporting
- **Performance Regression**: Benchmark comparison
- **Cross-Platform**: Tested on Windows, macOS, and Linux

### 🎓 Test Education

For team members new to testing:

1. **Start with Unit Tests**: Begin with simple utility function tests
2. **Learn React Testing Library**: Focus on user-centric testing
3. **Practice TDD**: Write tests before implementation when possible
4. **Review Test Patterns**: Study existing tests for patterns and conventions

### 🔄 Maintenance

#### Regular Tasks
- Update test data when adding new features
- Review and update mocks when APIs change
- Maintain performance benchmarks
- Update coverage requirements as codebase grows

#### When to Update Tests
- Adding new features
- Changing existing functionality
- Upgrading dependencies
- Fixing bugs (add regression tests)

This test suite ensures that Doshi Sensei maintains high quality and reliability as it evolves, providing confidence for both developers and users learning Japanese conjugations.
