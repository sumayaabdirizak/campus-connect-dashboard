"use client";
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useBootstrapTooltips } from '@/hooks/useBootstrapTooltips';

const BootstrapJs = () => {
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    if (isClient) {
      // Only import Bootstrap JS on the client side
      import('bootstrap/dist/js/bootstrap.bundle.min.js' as any).catch(console.error);
    }
  }, [isClient]);

  // Initialize Bootstrap tooltips on every route change
  useBootstrapTooltips([pathname]);

  return null;
};

export default BootstrapJs;