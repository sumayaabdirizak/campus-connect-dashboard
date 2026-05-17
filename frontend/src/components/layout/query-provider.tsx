'use client';

import React from 'react';

/** Legacy layout wrapper; data fetching uses `src/lib/async-query.ts` (no external query library). */
export default function QueryProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
