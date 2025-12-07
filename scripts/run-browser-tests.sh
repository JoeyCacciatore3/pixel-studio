#!/bin/bash

# Pixel Studio - Browser Test Execution Script
# This script runs comprehensive browser compatibility tests

set -e

echo "🚀 Starting Pixel Studio Browser Compatibility Tests"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Playwright is installed
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ Error: npx is not installed${NC}"
    exit 1
fi

# Check if we're in the project directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Please run from project root.${NC}"
    exit 1
fi

# Set APP_URL if not set
export APP_URL=${APP_URL:-"http://localhost:3000"}

echo -e "${YELLOW}📋 Test Configuration:${NC}"
echo "  APP_URL: $APP_URL"
echo "  Test Directory: tests/e2e"
echo ""

# Check if dev server is running
echo -e "${YELLOW}🔍 Checking if dev server is running...${NC}"
if ! curl -s "$APP_URL" > /dev/null; then
    echo -e "${YELLOW}⚠️  Dev server not running at $APP_URL${NC}"
    echo -e "${YELLOW}   Starting dev server...${NC}"
    echo ""
    # Note: In CI, Playwright config will start the server
    # For manual runs, user should start it separately
    echo -e "${YELLOW}   Please start the dev server in another terminal:${NC}"
    echo -e "${YELLOW}   npm run dev${NC}"
    echo ""
    read -p "Press Enter when dev server is running, or Ctrl+C to cancel..."
fi

# Create test output directories
mkdir -p tests/screenshots
mkdir -p tests/reports

echo ""
echo -e "${GREEN}✅ Starting test execution...${NC}"
echo ""

# Run tests with different configurations
TEST_MODE=${1:-"all"}

case $TEST_MODE in
    "all")
        echo -e "${GREEN}Running all test suites...${NC}"
        npx playwright test
        ;;
    "browser")
        echo -e "${GREEN}Running browser compatibility tests...${NC}"
        npx playwright test browser-compatibility
        ;;
    "mobile")
        echo -e "${GREEN}Running mobile touch tests...${NC}"
        npx playwright test mobile-touch
        ;;
    "chromium")
        echo -e "${GREEN}Running tests on Chromium...${NC}"
        npx playwright test --project=chromium
        ;;
    "firefox")
        echo -e "${GREEN}Running tests on Firefox...${NC}"
        npx playwright test --project=firefox
        ;;
    "webkit")
        echo -e "${GREEN}Running tests on WebKit...${NC}"
        npx playwright test --project=webkit
        ;;
    "mobile-safari")
        echo -e "${GREEN}Running tests on Mobile Safari...${NC}"
        npx playwright test --project="Mobile Safari"
        ;;
    "mobile-chrome")
        echo -e "${GREEN}Running tests on Mobile Chrome...${NC}"
        npx playwright test --project="Mobile Chrome"
        ;;
    "ui")
        echo -e "${GREEN}Opening Playwright UI...${NC}"
        npx playwright test --ui
        ;;
    *)
        echo -e "${RED}Unknown test mode: $TEST_MODE${NC}"
        echo ""
        echo "Usage: $0 [mode]"
        echo ""
        echo "Modes:"
        echo "  all           - Run all test suites (default)"
        echo "  browser       - Browser compatibility tests only"
        echo "  mobile        - Mobile touch tests only"
        echo "  chromium      - Tests on Chromium only"
        echo "  firefox       - Tests on Firefox only"
        echo "  webkit        - Tests on WebKit only"
        echo "  mobile-safari - Tests on Mobile Safari only"
        echo "  mobile-chrome - Tests on Mobile Chrome only"
        echo "  ui            - Open Playwright UI"
        exit 1
        ;;
esac

TEST_EXIT_CODE=$?

echo ""
echo "=================================================="

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo -e "${GREEN}📊 View test report:${NC}"
    echo "   npx playwright show-report"
    echo ""
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo -e "${YELLOW}📊 View test report:${NC}"
    echo "   npx playwright show-report"
    echo ""
    echo -e "${YELLOW}🐛 Debug failed tests:${NC}"
    echo "   npx playwright test --debug"
    echo ""
fi

exit $TEST_EXIT_CODE
