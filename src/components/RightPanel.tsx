'use client';

import { useEffect } from 'react';
import UI from '@/lib/ui';
import CleanupPanel from '@/components/CleanupPanel';
import StateManager from '@/lib/stateManager';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { useMobilePanel } from '@/contexts/MobilePanelContext';

interface RightPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function RightPanel({
  isOpen: propIsOpen,
  onClose: propOnClose,
}: RightPanelProps = {}) {
  const { isMobile } = useDeviceDetection();
  const { isOpen: contextIsOpen, setIsOpen: contextSetIsOpen } = useMobilePanel();
  const isOpen = propIsOpen !== undefined ? propIsOpen : contextIsOpen;
  const onClose = propOnClose || (() => contextSetIsOpen(false));

  useEffect(() => {
    // Setup UI controls once - only color controls remain
    UI.setupColorControls(
      (newColor) => {
        StateManager.setColor(newColor);
      },
      (newAlpha) => {
        StateManager.setAlpha(newAlpha);
      }
    );
  }, []);

  // Close panel when clicking outside on mobile
  useEffect(() => {
    if (isMobile && isOpen && onClose) {
      const handleClickOutside = (e: MouseEvent) => {
        const panel = document.querySelector('.right-panel');
        if (panel && !panel.contains(e.target as Node)) {
          onClose();
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [isMobile, isOpen, onClose]);

  return (
    <aside
      className={`right-panel ${isMobile && isOpen ? 'open' : ''}`}
      role="complementary"
      aria-label="Properties panel"
    >
      <CleanupPanel />
    </aside>
  );
}
