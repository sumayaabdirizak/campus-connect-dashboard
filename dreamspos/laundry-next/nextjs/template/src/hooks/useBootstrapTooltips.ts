"use client";
import { useEffect } from "react";

/**
 * Initialize Bootstrap tooltips for elements with data-bs-toggle="tooltip".
 * Cleans up instances and stray DOM nodes on dependency change/unmount.
 *
 * Usage:
 *   useBootstrapTooltips([location.pathname])
 */
export function useBootstrapTooltips(deps: any[] = []) {
  useEffect(() => {
    // Skip during SSR
    if (typeof document === 'undefined') {
      return;
    }

    let tooltipInstances: any[] = [];

    // Dynamically import Bootstrap Tooltip on the client side
    import('bootstrap/js/dist/tooltip').then(({ default: Tooltip }) => {
      // Clean existing tooltip DOM nodes
      const oldTooltips = document.querySelectorAll('.tooltip');
      oldTooltips.forEach((el) => el.parentNode?.removeChild(el));

      // Initialize tooltips
      const tooltipTriggerList = Array.from(
        document.querySelectorAll('[data-bs-toggle="tooltip"]')
      ) as HTMLElement[];
      
      tooltipInstances = tooltipTriggerList.map((el) => new Tooltip(el));
    });

    // Cleanup function
    return () => {
      tooltipInstances.forEach((tooltip) => {
        try {
          tooltip?.dispose?.();
        } catch (e) {
          // Tooltip might already be disposed
        }
      });
    };
  }, [...deps]);
}
