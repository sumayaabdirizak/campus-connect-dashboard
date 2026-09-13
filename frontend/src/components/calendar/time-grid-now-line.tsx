'use client';

import { useEffect, useState } from 'react';
import { HOUR_HEIGHT } from './time-grid-layout';

export function NowLine() {
  const [min, setMin] = useState(() => new Date().getHours() * 60 + new Date().getMinutes());

  useEffect(() => {
    const id = window.setInterval(() => {
      const n = new Date();
      setMin(n.getHours() * 60 + n.getMinutes());
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className='pointer-events-none absolute inset-x-0 z-20' style={{ top: (min / 60) * HOUR_HEIGHT }}>
      <div className='relative'>
        <span className='absolute -left-1 -top-1 size-2 rounded-full bg-red-500' />
        <div className='border-t border-red-500' />
      </div>
    </div>
  );
}
