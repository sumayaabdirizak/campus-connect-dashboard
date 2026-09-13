'use client';

import { SidebarProvider } from './context/SidebarContext';
import { ThemeContextProvider } from './context/ThemeContext';

/**
 * App Provider wrapper for Next.js App Router
 * Combines all context providers
 * SSR-safe - contexts work correctly during server-side rendering
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContextProvider>
      <SidebarProvider>
        {children}
      </SidebarProvider>
    </ThemeContextProvider>
  );
}
