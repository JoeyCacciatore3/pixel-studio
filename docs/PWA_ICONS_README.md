# PWA Icons Required

For the PWA to work properly, you need to create the following icon files in the `public` directory:

## Required Icons

1. **icon-192x192.png** - 192x192 pixels
   - Used for Android home screen icons
   - Should be a square icon with your app logo

2. **icon-512x512.png** - 512x512 pixels
   - Used for splash screens and high-resolution displays
   - Should be a square icon with your app logo

## Icon Design Guidelines

- Use a simple, recognizable design that works at small sizes
- Ensure good contrast for visibility
- Use the app's theme color (#6366f1) as the background or accent
- Keep important elements centered and away from edges
- Test icons on both light and dark backgrounds

## Quick Generation

You can generate these icons using:

- Online tools like [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
- Design tools like Figma, Sketch, or Adobe Illustrator
- AI image generators

## Placement

Place both icon files in: `pixel-studio/public/`

The manifest.json is already configured to reference these icons.
