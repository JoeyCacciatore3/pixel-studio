'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';

import { MobilePanelProvider } from '@/contexts/MobilePanelContext';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import Canvas from '@/lib/canvas';
import History from '@/lib/history';
import { debounce } from '@/lib/utils/debounce';
import { logger } from '@/lib/utils/logger';
import { DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT, DEBOUNCE_DELAY } from '@/lib/constants';
import Header from '@/components/Header';
import ExtendedToolbar from '@/components/ExtendedToolbar';
import CanvasComponent from '@/components/Canvas';
import StatusBar from '@/components/StatusBar';
import SelectionToolbar from '@/components/SelectionToolbar';

// Import browser-compat to ensure browser fixes are applied (iOS viewport height, etc.)
// This runs automatically on module load
import '@/lib/browser-compat';

// Lazy load mobile-specific components (Next.js 16: optimize with dynamic imports)
const MobileToolbar = dynamic(() => import('@/components/MobileToolbar'), {
  ssr: false,
  loading: () => null, // Mobile toolbar is small, no loading state needed
});

const MobileLayout = dynamic(() => import('@/components/MobileLayout'), {
  ssr: false,
  loading: () => <div className="mobile-layout-loading" aria-label="Loading layout" />,
});

// RightPanel removed

function HomeContent() {
  const { isMobile } = useDeviceDetection();
  // State is managed via StateManager, accessed through useAppState hook in components that need it

  useEffect(() => {
    // Setup canvas resize handlers with debouncing
    const canvasWidth = document.getElementById('canvasWidth');
    const canvasHeight = document.getElementById('canvasHeight');

    const handleResize = debounce(() => {
      try {
        const width = parseInt(
          (canvasWidth as HTMLInputElement)?.value || String(DEFAULT_CANVAS_WIDTH),
          10
        );
        const height = parseInt(
          (canvasHeight as HTMLInputElement)?.value || String(DEFAULT_CANVAS_HEIGHT),
          10
        );
        Canvas.resize(width, height);
        History.save();
      } catch (error) {
        logger.error('Failed to resize canvas:', error);
      }
    }, DEBOUNCE_DELAY);

    canvasWidth?.addEventListener('change', handleResize);
    canvasHeight?.addEventListener('change', handleResize);

    return () => {
      canvasWidth?.removeEventListener('change', handleResize);
      canvasHeight?.removeEventListener('change', handleResize);
    };
  }, []);


  return (
    <MobileLayout>
      <div className="app-container">
        <Header />
        {!isMobile && <ExtendedToolbar />}
        {isMobile && <MobileToolbar />}
        <SelectionToolbar />
        <main role="main" aria-label="Pixel art canvas">
          <CanvasComponent />
        </main>
        <StatusBar />
      </div>
    </MobileLayout>
  );
}

export default function Home() {
  return (
    <MobilePanelProvider>
      <HomeContent />
    </MobilePanelProvider>
  );
}
