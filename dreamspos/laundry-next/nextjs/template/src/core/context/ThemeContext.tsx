"use client";
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';

interface ThemeState {
  theme: string;
  direction: 'ltr' | 'rtl';
  isHydrated: boolean;
}

interface ThemeContextType {
  state: ThemeState;
  updateTheme: (settings: { theme: string; direction?: 'ltr' | 'rtl' }) => void;
  hydrateTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const initialState: ThemeState = {
  theme: 'light',
  direction: 'ltr',
  isHydrated: false,
};

// Default context value for SSR
const defaultContextValue: ThemeContextType = {
  state: initialState,
  updateTheme: () => {},
  hydrateTheme: () => {},
};

export function ThemeContextProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ThemeState>(initialState);

  const updateTheme = useCallback((settings: { theme: string; direction?: 'ltr' | 'rtl' }) => {
    const { theme, direction } = settings;
    setState((prev) => {
      const newState = {
        ...prev,
        theme,
        ...(direction && { direction }),
      };
      
      // Update DOM only on client side
      if (typeof window !== 'undefined') {
        if (direction) {
          document.documentElement.dir = direction;
          Cookies.set('dir', direction, { expires: 365 });
        }
        document.documentElement.setAttribute('data-bs-theme', theme);
        Cookies.set('theme', theme, { expires: 365 });
      }
      
      return newState;
    });
  }, []);

  const hydrateTheme = useCallback(() => {
    setState((prev) => ({ ...prev, isHydrated: true }));
  }, []);

  // Hydrate theme from cookies on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const theme = Cookies.get('theme') || 'light';
    const dir = Cookies.get('dir');
    const direction: 'ltr' | 'rtl' = (dir === 'rtl' ? 'rtl' : 'ltr');

    updateTheme({ theme, direction });
    hydrateTheme();
  }, [updateTheme, hydrateTheme]);

  return (
    <ThemeContext.Provider
      value={{
        state,
        updateTheme,
        hydrateTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// SSR-safe hook that returns default values when context is not available
export function useTheme() {
  const context = useContext(ThemeContext);
  // Return default values during SSR instead of throwing
  if (context === undefined) {
    return defaultContextValue;
  }
  return context;
}
