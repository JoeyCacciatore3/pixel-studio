# Turbopack Compatibility Notes

## Issue

Next.js 16 uses Turbopack by default, but `next-pwa` plugin requires webpack configuration which is incompatible with Turbopack.

## Solution

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

## Configuration

The `next.config.js` includes:

- `turbopack: {}` - Explicitly disables Turbopack
- `webpack: (config) => config` - Ensures webpack is used
- `next-pwa` plugin - Requires webpack configuration

The `package.json` scripts explicitly use `--webpack` flag to force webpack bundler.

## Future Considerations

When Turbopack support becomes available for PWA plugins, or if you switch to an alternative PWA solution that supports Turbopack, you can:

1. Remove the webpack configuration
2. Enable Turbopack with the `--turbo` flag
3. Update PWA configuration accordingly

## Current Status

- ✅ Using webpack explicitly via `--webpack` flag (compatible with next-pwa)
- ✅ Turbopack explicitly disabled via `turbopack: {}` config
- ✅ PWA works correctly in production builds
- ✅ Build scripts force webpack usage

## Why This Approach?

Next.js 16 defaults to Turbopack, but when it detects webpack configuration (from next-pwa), it throws an error. By:

1. Explicitly using `--webpack` flag in scripts, we force webpack usage
2. Adding `turbopack: {}` config, we silence the warning and make our intent clear
3. This ensures consistent behavior across all environments (dev, build, CI/CD)
