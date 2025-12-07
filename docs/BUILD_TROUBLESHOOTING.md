# Build Troubleshooting Guide

## Turbopack Error Resolution

### Error Message

```
ERROR: This build is using Turbopack, with a `webpack` config and no `turbopack` config.
This may be a mistake.
```

### Cause

The `next-pwa` plugin requires webpack configuration, which is incompatible with Turbopack (Next.js 16's new bundler).

### Solution Applied

1. **Explicit Webpack Configuration**: Added webpack function to `next.config.js` to ensure webpack is used
2. **PWA Plugin Compatibility**: The `next-pwa` plugin modifies webpack, requiring webpack bundler
3. **Documentation**: See `docs/TURBOPACK_NOTES.md` for details

### Important Notes

- **Do NOT use `--turbo` flag**: This will enable Turbopack and cause conflicts
- **Use standard commands**: `npm run dev` and `npm run build` use webpack (required)
- **PWA in Development**: PWA is disabled in development mode (see `next.config.js`)

### Commands

```bash
# ✅ Correct - uses webpack
npm run dev
npm run build

# ❌ Incorrect - enables Turbopack (will cause error)
npm run dev --turbo
npm run build --turbo
```

### Verification

After the fix, builds should complete successfully using webpack. The error should no longer occur.

---

## Other Common Issues

### Package Lock Sync Error

**Error**: `npm ci` fails with missing packages

**Solution**: Run `npm install` locally to update `package-lock.json`, then commit and push.

### TypeScript Errors in Test Files

**Error**: TypeScript errors in `tests/e2e/*.spec.ts`

**Solution**: Test files are excluded from TypeScript checking (see `tsconfig.json`). This is expected - Playwright tests are E2E and don't need type checking.

### Service Worker Not Registering in Development

**Note**: PWA service worker is disabled in development mode. This is by design - enable only in production builds.

---

## Getting Help

If you encounter other build issues:

1. Check error messages carefully
2. Review `next.config.js` configuration
3. Verify `package.json` dependencies
4. Check `docs/TURBOPACK_NOTES.md` for Turbopack-specific issues
5. Review build logs for specific errors

---

**Last Updated**: $(date)
