'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import UniversalSearch from './UniversalSearch';
import CompareDrawer from './CompareDrawer';

interface SpotlightContextType {
  isOpen: boolean;
  openSpotlight: () => void;
  closeSpotlight: () => void;
  toggleSpotlight: () => void;
}

const SpotlightContext = createContext<SpotlightContextType>({
  isOpen: false,
  openSpotlight: () => {},
  closeSpotlight: () => {},
  toggleSpotlight: () => {},
});

export function SpotlightProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openSpotlight = () => setIsOpen(true);
  const closeSpotlight = () => setIsOpen(false);
  const toggleSpotlight = () => setIsOpen(prev => !prev);

  // Global Cmd+K / Ctrl+K keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <SpotlightContext.Provider value={{ isOpen, openSpotlight, closeSpotlight, toggleSpotlight }}>
      {children}
      <UniversalSearch isOpen={isOpen} onClose={closeSpotlight} />
      <CompareDrawer />
    </SpotlightContext.Provider>
  );
}

export function useSpotlight() {
  return useContext(SpotlightContext);
}
