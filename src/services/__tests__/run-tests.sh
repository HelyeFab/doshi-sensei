#!/bin/bash

# Review Hub Test Runner
# Comprehensive test execution script

echo "========================================="
echo "REVIEW HUB TEST SUITE"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test categories
RUN_UNIT=true
RUN_INTEGRATION=true
RUN_PERFORMANCE=false
RUN_COVERAGE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --unit-only)
      RUN_INTEGRATION=false
      RUN_PERFORMANCE=false
      shift
      ;;
    --integration-only)
      RUN_UNIT=false
      RUN_PERFORMANCE=false
      shift
      ;;
    --performance)
      RUN_PERFORMANCE=true
      shift
      ;;
    --coverage)
      RUN_COVERAGE=true
      shift
      ;;
    --all)
      RUN_PERFORMANCE=true
      RUN_COVERAGE=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--unit-only|--integration-only|--performance|--coverage|--all]"
      exit 1
      ;;
  esac
done

# Function to run tests
run_tests() {
  local test_type=$1
  local test_pattern=$2
  
  echo -e "${YELLOW}Running $test_type tests...${NC}"
  
  if npm test -- $test_pattern --passWithNoTests; then
    echo -e "${GREEN}✓ $test_type tests passed${NC}"
    return 0
  else
    echo -e "${RED}✗ $test_type tests failed${NC}"
    return 1
  fi
}

# Track failures
FAILED_TESTS=()

# Run unit tests
if [ "$RUN_UNIT" = true ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "UNIT TESTS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  if ! run_tests "Event Bus" "src/services/review-events/__tests__/EventBus.test.ts"; then
    FAILED_TESTS+=("Event Bus")
  fi
  
  if ! run_tests "Unified Data Store" "src/services/review-store/__tests__/UnifiedDataStore.test.ts"; then
    FAILED_TESTS+=("Unified Data Store")
  fi
  
  echo ""
fi

# Run integration tests
if [ "$RUN_INTEGRATION" = true ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "INTEGRATION TESTS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  if ! run_tests "Integration" "src/services/__tests__/integration.test.ts"; then
    FAILED_TESTS+=("Integration")
  fi
  
  echo ""
fi

# Run performance benchmarks
if [ "$RUN_PERFORMANCE" = true ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "PERFORMANCE BENCHMARKS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  if ! run_tests "Performance" "src/services/__tests__/performance.benchmark.ts"; then
    FAILED_TESTS+=("Performance")
  fi
  
  echo ""
fi

# Run with coverage
if [ "$RUN_COVERAGE" = true ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "CODE COVERAGE"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  echo -e "${YELLOW}Generating coverage report...${NC}"
  
  if npm test -- --coverage --config=src/services/__tests__/jest.config.js; then
    echo -e "${GREEN}✓ Coverage report generated${NC}"
    echo ""
    echo "Coverage Summary:"
    cat coverage/review-hub/coverage-summary.json | python3 -m json.tool | grep -E '"pct"|"total"' | head -20
  else
    echo -e "${RED}✗ Coverage generation failed${NC}"
    FAILED_TESTS+=("Coverage")
  fi
  
  echo ""
fi

# Summary
echo "========================================="
echo "TEST SUMMARY"
echo "========================================="

if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed successfully!${NC}"
  echo ""
  echo "Review Hub is ready for production!"
  exit 0
else
  echo -e "${RED}✗ Some tests failed:${NC}"
  for test in "${FAILED_TESTS[@]}"; do
    echo "  - $test"
  done
  echo ""
  echo "Please fix the failing tests before deployment."
  exit 1
fi