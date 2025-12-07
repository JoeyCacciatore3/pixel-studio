'use client';

import { useState, useEffect } from 'react';

export interface OrientationInfo {
  angle: number;
  type: 'portrait' | 'landscape';
  isPortrait: boolean;
  isLandscape: boolean;
}

export function useOrientation(): OrientationInfo {
  const [orientation, setOrientation] = useState<OrientationInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        angle: 0,
        type: 'landscape',
        isPortrait: false,
        isLandscape: true,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isPortrait = height > width;
    const isLandscape = width > height;

    return {
      angle: window.screen?.orientation?.angle || 0,
      type: isPortrait ? 'portrait' : 'landscape',
      isPortrait,
      isLandscape,
    };
  });

  useEffect(() => {
    const updateOrientation = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isPortrait = height > width;
      const isLandscape = width > height;
      const angle = window.screen?.orientation?.angle || 0;

      setOrientation({
        angle,
        type: isPortrait ? 'portrait' : 'landscape',
        isPortrait,
        isLandscape,
      });
    };

    updateOrientation();

    // Listen to orientation change events
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);

    // Use Screen Orientation API if available
    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', updateOrientation);
    }

    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', updateOrientation);
      }
    };
  }, []);

  return orientation;
}
