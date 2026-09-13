"use client";
import type { RefObject } from "react";
import { useEffect } from "react";

interface UseMobileSidebarOverlayParams {
  mobileSidebar: boolean;
  isLayoutFullwidth: boolean;
  isMobile: boolean;
  containerRef: RefObject<HTMLElement | null> | null;
  onClose: () => void;
}

/**
 * Manages the `menu-opened` class on the <html> element when the mobile sidebar is open,
 * and closes the sidebar when clicking/touching outside of the provided container.
 */
export function useMobileSidebarOverlay({
  mobileSidebar,
  isLayoutFullwidth,
  isMobile,
  containerRef,
  onClose,
}: UseMobileSidebarOverlayParams) {
  // Toggle menu-opened class on the HTML element
  useEffect(() => {
    const htmlElement = document.documentElement;

    // Skip mobile sidebar logic when on layout-fullwidth AND not on mobile
    if (isLayoutFullwidth && !isMobile) {
      htmlElement.classList.remove("menu-opened");
      return;
    }

    if (mobileSidebar) {
      htmlElement.classList.add("menu-opened");
    } else {
      htmlElement.classList.remove("menu-opened");
    }
  }, [mobileSidebar, isLayoutFullwidth, isMobile]);

  // Handle click/touch outside to close
  useEffect(() => {
    const handlePointerOutside = (event: MouseEvent | TouchEvent) => {
      if (!mobileSidebar) return;
      const container = containerRef?.current;
      if (!container) return;
      if (container.contains(event.target as Node)) return;

      // If the click is on the sidebar itself, do nothing
      const sidebar = document.getElementById("sidebar");
      if (sidebar && sidebar.contains(event.target as Node)) return;

      onClose();
    };

    document.addEventListener("mousedown", handlePointerOutside);
    document.addEventListener("touchstart", handlePointerOutside);

    return () => {
      document.removeEventListener("mousedown", handlePointerOutside);
      document.removeEventListener("touchstart", handlePointerOutside);
    };
  }, [mobileSidebar, containerRef, onClose]);
}
