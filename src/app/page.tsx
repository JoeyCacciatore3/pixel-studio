'use client';

import { useState, useEffect } from 'react';
import type { AppState } from '@/lib/types';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import Toolbar from '@/components/Toolbar';
import MobileToolbar from '@/components/MobileToolbar';
import CanvasComponent from '@/components/Canvas';
import StatusBar from '@/components/StatusBar';
import ZoomControls from '@/components/ZoomControls';
import SelectionToolbar from '@/components/SelectionToolbar';
import MobileLayout from '@/components/MobileLayout';

// Lazy load non-critical components
const RightPanel = dynamic(() => import('@/components/RightPanel'), {
  ssr: false,
  loading: () => <div className="right-panel-loading" aria-label="Loading panel" />,
});
import { MobilePanelProvider, useMobilePanel } from '@/contexts/MobilePanelContext';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { useOrientation } from '@/hooks/useOrientation';
import Canvas from '@/lib/canvas';
import History from '@/lib/history';

function HomeContent() {
  const { isMobile } = useDeviceDetection();
  const orientation = useOrientation();
  const { isOpen: rightPanelOpen, setIsOpen: setRightPanelOpen } = useMobilePanel();

  const [appState, setAppState] = useState<AppState>({
    currentTool: 'pencil',
    currentColor: '#6366f1',
    currentAlpha: 1,
    brushSize: 4,
    brushHardness: 100,
    brushOpacity: 100,
    brushFlow: 100,
    brushSpacing: 25,
    brushJitter: 0,
    brushTexture: null,
    pressureEnabled: false,
    pressureSize: true,
    pressureOpacity: true,
    pressureFlow: false,
    pressureCurve: 'linear',
    stabilizerStrength: 30,
    tolerance: 32,
    zoom: 1,
    selection: null,
    colorRangeSelection: null,
    selectionMode: 'replace',
    selectionFeather: 0,
    selectionAntiAlias: true,
    imageLayer: null,
    imageOffsetX: 0,
    imageOffsetY: 0,
    layers: [],
    activeLayerId: null,
  });

  useEffect(() => {
    // Setup image upload handler
    const imageUpload = document.getElementById('imageUpload');
    if (imageUpload) {
      const handleImageUpload = (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const img = new Image();
        img.onload = () => {
          try {
            Canvas.loadImage(img, true);
            const offset = Canvas.getImageOffset();
            setAppState((prev) => ({
              ...prev,
              imageLayer: img,
              imageOffsetX: offset.x,
              imageOffsetY: offset.y,
            }));
            History.save();
          } catch (error) {
            console.error('Failed to load image:', error);
          }
        };
        img.src = URL.createObjectURL(file);
        (e.target as HTMLInputElement).value = '';
      };
      imageUpload.addEventListener('change', handleImageUpload);
      return () => {
        imageUpload.removeEventListener('change', handleImageUpload);
      };
    }

    // Setup canvas resize handlers
    const canvasWidth = document.getElementById('canvasWidth');
    const canvasHeight = document.getElementById('canvasHeight');

    const handleResize = () => {
      try {
        const width = parseInt((canvasWidth as HTMLInputElement)?.value || '512', 10);
        const height = parseInt((canvasHeight as HTMLInputElement)?.value || '512', 10);
        Canvas.resize(width, height);
        setAppState((prev) => ({ ...prev }));
        History.save();
      } catch (error) {
        console.error('Failed to resize canvas:', error);
      }
    };

    canvasWidth?.addEventListener('change', handleResize);
    canvasHeight?.addEventListener('change', handleResize);

    return () => {
      canvasWidth?.removeEventListener('change', handleResize);
      canvasHeight?.removeEventListener('change', handleResize);
    };
  }, []);

  // Handle orientation changes
  useEffect(() => {
    // Preserve canvas state during rotation
    // Canvas state is already preserved in appState
  }, [orientation]);

  return (
    <MobileLayout>
      <div className="app-container">
        <Header />
        {!isMobile && <Toolbar />}
        {isMobile && <MobileToolbar />}
        <SelectionToolbar />
        <CanvasComponent state={appState} onStateChange={setAppState} />
        <RightPanel isOpen={rightPanelOpen} onClose={() => setRightPanelOpen(false)} />
        <ZoomControls />
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
