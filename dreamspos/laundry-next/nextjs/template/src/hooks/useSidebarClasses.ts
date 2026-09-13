"use client";
import { useMemo } from 'react';
import { useIsMobile } from './useMediaQuery';

interface SidebarClassesProps {
  miniSidebar: boolean;
  dataLayout: string;
  dataSize: string;
  expandMenu: boolean;
  mobileSidebar: boolean;
  dir: string;
  isLayoutFullwidth: boolean;
}

export const useSidebarClasses = ({
  miniSidebar,
  dataLayout,
  dataSize,
  expandMenu,
  mobileSidebar,
  dir,
  isLayoutFullwidth
}: SidebarClassesProps) => {
  const isMobile = useIsMobile();

  return useMemo(() => {
    const classes: string[] = [];

    // Mini sidebar logic - skip on full-width unless mobile
    if ((miniSidebar || dataLayout === "mini" || dataSize === "compact") && 
        (!isLayoutFullwidth || isMobile)) {
      classes.push("mini-sidebar");
    }

    // Expand menu logic - skip on full-width unless mobile
    if ((expandMenu && (miniSidebar || dataLayout === "mini")) && 
        (!isLayoutFullwidth || isMobile)) {
      classes.push("expand-menu");
    }

    // Mobile sidebar logic - skip on full-width unless mobile
    if (mobileSidebar && (!isLayoutFullwidth || isMobile)) {
      classes.push("menu-opened", "slide-nav");
    }

    // RTL layout
    if (dir === "rtl") {
      classes.push("layout-mode-rtl");
    }

    return classes.join(" ");
  }, [miniSidebar, dataLayout, dataSize, expandMenu, mobileSidebar, dir, isLayoutFullwidth, isMobile]);
};
