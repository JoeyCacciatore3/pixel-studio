import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { Sora, JetBrains_Mono } from 'next/font/google';
import './globals.css';

// Initialize polyfills and browser compatibility
if (typeof window !== 'undefined') {
  import('@/lib/polyfills');
  import('@/lib/browser-compat');
}

const sora = Sora({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
  variable: '--font-sora',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
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
  return (
    <html lang="en" className={`${sora.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512x512.png" />
      </head>
      <body className={sora.className}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
