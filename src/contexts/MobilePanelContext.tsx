'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface MobilePanelContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
}

const MobilePanelContext = createContext<MobilePanelContextType | undefined>(undefined);

export function MobilePanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen(!isOpen);

  return (
    <MobilePanelContext.Provider value={{ isOpen, setIsOpen, toggle }}>
      {children}
    </MobilePanelContext.Provider>
  );
}

export function useMobilePanel() {
  const context = useContext(MobilePanelContext);
  if (!context) {
    // Return default values if not in provider (desktop)
    return { isOpen: true, setIsOpen: () => {}, toggle: () => {} };
  }
  return context;
}
