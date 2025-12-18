import type { Metadata, Viewport } from 'next';
import { Sora, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { WebVitals } from '@/components/WebVitals';

// Browser compatibility is initialized in client components where needed
// This prevents hydration mismatches from server/client differences

const sora = Sora({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  display: 'swap', // Use swap to prevent font blocking render while minimizing CLS
  variable: '--font-sora',
  preload: true, // Preload fonts for better performance
  adjustFontFallback: true, // Optimize fallback font metrics to reduce CLS
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap', // Use swap to prevent font blocking render while minimizing CLS
  variable: '--font-jetbrains-mono',
  preload: true, // Preload fonts for better performance
  adjustFontFallback: true, // Optimize fallback font metrics to reduce CLS
});

export const metadata: Metadata = {
  title: {
    default: 'Pixel Studio',
    template: '%s | Pixel Studio',
  },
  description: 'Professional pixel art editor built with Next.js, TypeScript, and React',
  keywords: ['pixel art', 'editor', 'drawing', 'canvas', 'art tool'],
  authors: [{ name: 'Pixel Studio Team' }],
  creator: 'Pixel Studio',
  publisher: 'Pixel Studio',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Pixel Studio',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'Pixel Studio - Professional Pixel Art Editor',
    description: 'Professional pixel art editor built with Next.js, TypeScript, and React',
    siteName: 'Pixel Studio',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pixel Studio - Professional Pixel Art Editor',
    description: 'Professional pixel art editor built with Next.js, TypeScript, and React',
    creator: '@pixelstudio',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#6366f1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pixelstudio.app';

  // Structured data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Pixel Studio',
    description: 'Professional pixel art editor built with Next.js, TypeScript, and React',
    url: baseUrl,
    applicationCategory: 'GraphicsApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'Drawing Tools',
      'Selection Tools',
      'Layers System',
      'Undo/Redo',
      'Export to PNG',
      'Mobile Support',
      'PWA Support',
    ],
  };

  return (
    <html
      lang="en"
      className={`${sora.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512x512.png" />
        {/* Resource hints for optimal loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        {/* Structured data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className={sora.className} suppressHydrationWarning>
        <WebVitals />
        {children}
      </body>
    </html>
  );
}
