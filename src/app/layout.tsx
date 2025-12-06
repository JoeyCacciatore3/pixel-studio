import type { Metadata, Viewport } from 'next';
import './globals.css';

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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Sora:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
