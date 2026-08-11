'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'pharmacy-sidebar-mini';

export function usePharmacySidebar() {
  const [mini, setMini] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);

  const expanded = !mini || hoverExpanded;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setMini(stored === '1');
    } catch {
      /* ignore */
    }
  }, []);

  const toggleMini = useCallback(() => {
    setHoverExpanded(false);
    setMini((prev) => {
      const next = !prev;
      try {
        if (next) localStorage.setItem(STORAGE_KEY, '1');
        else localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const onSidebarMouseEnter = useCallback(() => {
    if (mini) setHoverExpanded(true);
  }, [mini]);

  const onSidebarMouseLeave = useCallback(() => {
    setHoverExpanded(false);
  }, []);

  return {
    mini,
    expanded,
    mobileOpen,
    toggleMini,
    onSidebarMouseEnter,
    onSidebarMouseLeave,
    openMobile: () => setMobileOpen(true),
    closeMobile: () => setMobileOpen(false),
    toggleMobile: () => setMobileOpen((v) => !v),
  };
}
