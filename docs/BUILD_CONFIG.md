# Build Configuration & Troubleshooting

## Turbopack vs Webpack

### Issue

Next.js 16 uses Turbopack by default, but `next-pwa` plugin requires webpack configuration which is incompatible with Turbopack.

### Solution

We explicitly force webpack usage via:

1. **`--webpack` flag** in build scripts (`package.json`)
2. **Empty `turbopack: {}` config** in `next.config.js` to explicitly disable Turbopack

### Correct Usage

```bash
# ✅ Correct - explicitly uses webpack (required for next-pwa)
npm run dev    # Uses --webpack flag internally
npm run build  # Uses --webpack flag internally

# ❌ Incorrect - would use Turbopack (incompatible with next-pwa)
next dev       # Without --webpack flag
next build     # Without --webpack flag
```

### Configuration

The `next.config.js` includes:

- `turbopack: {}` - Explicitly disables Turbopack
- `webpack: (config) => config` - Ensures webpack is used
- `next-pwa` plugin - Requires webpack configuration

The `package.json` scripts explicitly use `--webpack` flag to force webpack bundler.

### Current Status

- ✅ Using webpack explicitly via `--webpack` flag (compatible with next-pwa)
- ✅ Turbopack explicitly disabled via `turbopack: {}` config
- ✅ PWA works correctly in production builds
- ✅ Build scripts force webpack usage

### Why This Approach?

Next.js 16 defaults to Turbopack, but when it detects webpack configuration (from next-pwa), it throws an error. By:

1. Explicitly using `--webpack` flag in scripts, we force webpack usage
2. Adding `turbopack: {}` config, we silence the warning and make our intent clear
3. This ensures consistent behavior across all environments (dev, build, CI/CD)

### Future Considerations

When Turbopack support becomes available for PWA plugins, or if you switch to an alternative PWA solution that supports Turbopack, you can:

1. Remove the webpack configuration
2. Enable Turbopack with the `--turbo` flag
3. Update PWA configuration accordingly

---

## Common Build Issues

### Turbopack Error

**Error Message**:

```
ERROR: This build is using Turbopack, with a `webpack` config and no `turbopack` config.
This may be a mistake.
```

**Solution**: Use `npm run dev` or `npm run build` which include the `--webpack` flag. Do NOT use `--turbo` flag.

### Package Lock Sync Error

**Error**: `npm ci` fails with missing packages

**Solution**: Run `npm install` locally to update `package-lock.json`, then commit and push.

### TypeScript Errors in Test Files

**Error**: TypeScript errors in `tests/e2e/*.spec.ts`

**Solution**: Test files are excluded from TypeScript checking (see `tsconfig.json`). This is expected - Playwright tests are E2E and don't need type checking.

### Service Worker Not Registering in Development

**Note**: PWA service worker is disabled in development mode. This is by design - enable only in production builds.

### Important Notes

- **Do NOT use `--turbo` flag**: This will enable Turbopack and cause conflicts
- **Use standard commands**: `npm run dev` and `npm run build` use webpack (required)
- **PWA in Development**: PWA is disabled in development mode (see `next.config.js`)

---

## Getting Help

If you encounter other build issues:

1. Check error messages carefully
2. Review `next.config.js` configuration
3. Verify `package.json` dependencies
4. Review build logs for specific errors

---

**Last Updated**: December 2025
