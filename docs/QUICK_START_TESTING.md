# Quick Start - Browser Testing

## Get Started in 3 Steps

### Step 1: Install Dependencies

```bash
cd /home/joey/Desktop/AiStudio/pixel-studio
npm install
npx playwright install
```

### Step 2: Start Development Server

```bash
npm run dev
```

Server will start at `http://localhost:3000`

### Step 3: Run Tests

In a new terminal:

```bash
# Run all tests
npm run test:e2e

# Or use the shell script
./scripts/run-browser-tests.sh
```

## View Results

```bash
npm run test:e2e:report
```

## Quick Commands Reference

```bash
# All tests
npm run test:e2e

# Browser compatibility only
npm run test:e2e:browser

# Mobile touch tests only
npm run test:e2e:mobile

# Specific browser
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# Interactive UI mode
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug
```

## Documentation

- **Full Testing Guide**: `docs/TESTING_GUIDE.md`
- **Code Review**: `docs/MULTI_DEVICE_REVIEW.md`
- **Browser Compatibility**: `docs/BROWSER_COMPATIBILITY_MATRIX.md`
- **Implementation Summary**: `docs/IMPLEMENTATION_SUMMARY.md`

## What Gets Tested?

✅ Application load and initialization
✅ Responsive layouts (mobile, tablet, desktop)
✅ Canvas functionality
✅ Mobile touch interactions
✅ Browser-specific features
✅ Performance metrics
✅ Accessibility
✅ PWA functionality

## Troubleshooting

**Tests can't connect?**

- Make sure dev server is running (`npm run dev`)

**Browser not found?**

- Run `npx playwright install`

**Need help?**

- Check `docs/TESTING_GUIDE.md` for detailed instructions

---

**Ready to test!** 🚀
