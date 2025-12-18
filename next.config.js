const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-font-assets',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-image-assets',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\/_next\/image\?url=.+$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-image',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\.(?:mp3|wav|ogg)$/i,
      handler: 'CacheFirst',
      options: {
        rangeRequests: true,
        cacheName: 'static-audio-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\.(?:mp4)$/i,
      handler: 'CacheFirst',
      options: {
        rangeRequests: true,
        cacheName: 'static-video-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\.(?:js)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-js-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\.(?:css|less)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-style-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-data',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\/api\/.*$/i,
      handler: 'NetworkFirst',
      method: 'GET',
      options: {
        cacheName: 'apis',
        expiration: {
          maxEntries: 16,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        networkTimeoutSeconds: 10,
      },
    },
    {
      urlPattern: ({ request }) => request.destination === 'document',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Explicitly disable Turbopack - next-pwa requires webpack
  turbopack: {},
  // Experimental optimizations
  experimental: {
    // Optimize package imports for better tree-shaking and bundle size
    // Add packages here that export many modules (e.g., icon libraries)
    optimizePackageImports: [],
    // Enable webpack memory optimizations (Next.js 15+)
    webpackMemoryOptimizations: true,
  },
  // next-pwa requires webpack configuration
  // Ensure webpack is used (not Turbopack) when PWA is enabled
  webpack: (config) => {
    return config;
  },
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';

    // Conditional CSP based on environment
    // Development: Permissive CSP for Next.js HMR and development tools
    // Production: More strict CSP while maintaining Next.js compatibility
    // NOTE: Do NOT use 'strict-dynamic' as it disables host-based allowlisting
    // and requires nonces for all scripts, which blocks Next.js dynamic scripts
    const cspDirectives = [
      "default-src 'self'",

      // Scripts: Allow Next.js scripts and inline scripts
      // script-src-elem is explicitly set to handle <script> elements
      // This is separate from script-src which handles eval() and other script execution
      isDev
        ? // Development: Allow all necessary Next.js development features including HMR
          "script-src 'self' 'unsafe-eval' 'unsafe-inline' http://localhost:3000 http://localhost:* ws://localhost:* wss://localhost:*"
        : // Production: Allow Next.js scripts without strict-dynamic
          "script-src 'self' 'unsafe-eval' 'unsafe-inline'",

      // script-src-elem: Explicitly allow script elements (required for Next.js)
      // This directive handles <script> tags, separate from script-src
      isDev
        ? "script-src-elem 'self' 'unsafe-inline' http://localhost:3000 http://localhost:*"
        : "script-src-elem 'self' 'unsafe-inline'",

      // Styles: unsafe-inline required for Next.js CSS-in-JS in all environments
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

      // Images: Allow data URIs and blob URLs for canvas operations
      "img-src 'self' data: blob:",

      // Fonts: Allow Google Fonts and data URIs
      "font-src 'self' data: https://fonts.gstatic.com",

      // Connections: Allow Google Fonts API and same-origin
      // Also allow localhost in development for HMR WebSocket connections
      isDev
        ? "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com http://localhost:3000 http://localhost:* ws://localhost:* wss://localhost:*"
        : "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",

      // Workers: Required for Web Workers (blend modes, history)
      "worker-src 'self' blob:",

      // Manifest: Allow manifest.json
      "manifest-src 'self'",

      // Frame ancestors: Prevent clickjacking
      "frame-ancestors 'self'",

      // Base URI: Prevent base tag injection
      "base-uri 'self'",

      // Form action: Restrict form submissions
      "form-action 'self'",

      // Object source: Block plugins
      "object-src 'none'",
    ];

    // Add upgrade-insecure-requests in production only
    if (!isDev) {
      cspDirectives.push('upgrade-insecure-requests');
    }

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: cspDirectives.join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = withBundleAnalyzer(withPWA(nextConfig));
