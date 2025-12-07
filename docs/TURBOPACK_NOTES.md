# Turbopack Compatibility Notes

## Issue

Next.js 16 supports Turbopack, but `next-pwa` plugin requires webpack configuration which is incompatible with Turbopack.

## Solution

**Do not use the `--turbo` flag** when running development or build commands. The default commands use webpack which is required for `next-pwa`.

### Correct Usage

```bash
# ✅ Correct - uses webpack (required for next-pwa)
npm run dev
npm run build

# ❌ Incorrect - uses Turbopack (incompatible with next-pwa)
npm run dev --turbo
npm run build --turbo
```

## Configuration

The `next.config.js` explicitly uses webpack configuration to ensure compatibility with `next-pwa`. The PWA plugin modifies webpack settings, which requires webpack to be the bundler.

## Future Considerations

When Turbopack support becomes available for PWA plugins, or if you switch to an alternative PWA solution that supports Turbopack, you can:

1. Remove the webpack configuration
2. Enable Turbopack with the `--turbo` flag
3. Update PWA configuration accordingly

## Current Status

- ✅ Using webpack (compatible with next-pwa)
- ❌ Turbopack disabled (incompatible with next-pwa)
- ✅ PWA works correctly in production builds
