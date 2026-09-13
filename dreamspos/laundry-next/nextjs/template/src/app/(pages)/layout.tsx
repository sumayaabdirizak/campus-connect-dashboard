'use client';

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import dynamic from 'next/dynamic';

// Lazy load the Sidebar to ensure it's only loaded on the client
const Sidebar = dynamic(() => import('@/components/sidebar/sidebar'), {
  ssr: false,
  loading: () => <div className="sidebar-placeholder" />,
});

import { useSidebar } from "@/core/context/SidebarContext";
import { useTheme } from "@/core/context/ThemeContext";
import { useBootstrapTooltips } from "@/hooks/useBootstrapTooltips";

const OutletLoader = () => (
  <div
    className="d-flex align-items-center justify-content-center"
    style={{ height: "100vh" }}
  >
    <div className="loader-dots">
      <span></span><span></span><span></span>
      <span></span><span></span><span></span>
    </div>
  </div>
);

export default function PagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [isOutletLoading, setIsOutletLoading] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get state from contexts
  const { state: sidebarState, resetMobileSidebar } = useSidebar();
  const { state: themeState } = useTheme();

  const mobileSidebar = sidebarState.mobileSidebar;
  const isHydrated = themeState.isHydrated;

  // Mark as mounted on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Tooltip initializer
  useBootstrapTooltips([pathname]);

  // Reset sidebar on route change
  useEffect(() => {
    if (isMounted) {
      resetMobileSidebar();
    }
  }, [pathname, resetMobileSidebar, isMounted]);

  // Show loader immediately on route change
  useEffect(() => {
    setIsOutletLoading(true);
  }, [pathname]);

  // Hide loader after delay
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      setIsOutletLoading(false);
    }, 1000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [pathname]);

  // Don't render anything until mounted and theme is hydrated
  if (!isMounted || !isHydrated) {
    return <OutletLoader />;
  }

  return (
    <>
      <div className="main-wrapper">
        <Sidebar />
        <Suspense fallback={<OutletLoader />}>
          {isOutletLoading ? <OutletLoader /> : children}
        </Suspense>
      </div>

      <div
        className={`sidebar-overlay${mobileSidebar ? " opened" : ""}`}
        onClick={() => resetMobileSidebar()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && resetMobileSidebar()}
        aria-label="Close sidebar"
      />
    </>
  );
}
