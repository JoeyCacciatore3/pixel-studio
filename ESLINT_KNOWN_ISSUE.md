# ESLint Known Issue

## Problem

ESLint 9.39.1 has a known bug with `FlatCompat` that causes a circular reference error when using certain plugin combinations (specifically with `eslint-config-next` and React plugins).

**Error:**

```
TypeError: Converting circular structure to JSON
  --> starting at object with constructor 'Object'
  |     property 'configs' -> object with constructor 'Object'
  |     property 'flat' -> object with constructor 'Object'
  |     ...
  |     property 'plugins' -> object with constructor 'Object'
  --- property 'react' closes the circle
```

## Current Workaround

ESLint has been temporarily disabled in `lint-staged` to allow commits to proceed. The pre-commit hook will still run Prettier and TypeScript checks.

**To manually run ESLint:**

```bash
npm run lint
```

Note: This will currently fail with the circular reference error. The issue is being tracked upstream.

## References

- [ESLint Issue #20237](https://github.com/eslint/eslint/issues/20237)
- [React Issue #28313](https://github.com/facebook/react/issues/28313)

## Future Fix

Once ESLint fixes the circular reference bug or `eslint-config-next` provides better flat config support, we can re-enable ESLint in lint-staged.

## Alternative Solutions

1. Wait for ESLint/Next.js to fix the compatibility issue
2. Migrate to a pure flat config without FlatCompat (requires manual plugin configuration)
3. Downgrade ESLint to v8 (not recommended for new projects)
