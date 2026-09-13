"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface SidebarState {
  mobileSidebar: boolean;
  miniSidebar: boolean;
  expandMenu: boolean;
  hiddenLayout: boolean;
}

interface SidebarContextType {
  state: SidebarState;
  setMobileSidebar: (value: boolean) => void;
  setMiniSidebar: (value: boolean) => void;
  toggleMiniSidebar: () => void;
  setExpandMenu: (value: boolean) => void;
  setHiddenLayout: (value: boolean) => void;
  toggleHiddenLayout: () => void;
  resetMobileSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const initialState: SidebarState = {
  mobileSidebar: false,
  miniSidebar: false,
  expandMenu: false,
  hiddenLayout: false,
};

// Default context value for SSR
const defaultContextValue: SidebarContextType = {
  state: initialState,
  setMobileSidebar: () => {},
  setMiniSidebar: () => {},
  toggleMiniSidebar: () => {},
  setExpandMenu: () => {},
  setHiddenLayout: () => {},
  toggleHiddenLayout: () => {},
  resetMobileSidebar: () => {},
};

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SidebarState>(initialState);

  const setMobileSidebar = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, mobileSidebar: value }));
  }, []);

  const setMiniSidebar = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, miniSidebar: value }));
  }, []);

  const toggleMiniSidebar = useCallback(() => {
    setState((prev) => ({ ...prev, miniSidebar: !prev.miniSidebar }));
  }, []);

  const setExpandMenu = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, expandMenu: value }));
  }, []);

  const setHiddenLayout = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, hiddenLayout: value }));
  }, []);

  const toggleHiddenLayout = useCallback(() => {
    setState((prev) => ({ ...prev, hiddenLayout: !prev.hiddenLayout }));
  }, []);

  const resetMobileSidebar = useCallback(() => {
    setState((prev) => ({ ...prev, mobileSidebar: false }));
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        state,
        setMobileSidebar,
        setMiniSidebar,
        toggleMiniSidebar,
        setExpandMenu,
        setHiddenLayout,
        toggleHiddenLayout,
        resetMobileSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

// SSR-safe hook that returns default values when context is not available
export function useSidebar() {
  const context = useContext(SidebarContext);
  // Return default values during SSR instead of throwing
  if (context === undefined) {
    return defaultContextValue;
  }
  return context;
}
