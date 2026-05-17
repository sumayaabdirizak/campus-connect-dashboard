'use client';

import { Suspense } from 'react';
import { ChatShellV2 } from '@/features/discussions/components/layout';

export default function DmIndexPage() {
  return (
    <Suspense fallback={null}>
      <ChatShellV2 />
    </Suspense>
  );
}
