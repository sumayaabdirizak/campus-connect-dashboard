import { describe, it, expect } from 'vitest';
import { cn, formatBytes } from '@/lib/utils';

describe('utils', () => {
  it('cn merges conflicting Tailwind classes', () => {
    expect(cn('px-2 py-1', 'px-4')).toContain('px-4');
    expect(cn('px-2 py-1', 'px-4')).not.toContain('px-2');
  });

  it('formatBytes formats zero and common sizes', () => {
    expect(formatBytes(0)).toBe('0 Byte');
    expect(formatBytes(1024)).toMatch(/1\s*KB/);
    expect(formatBytes(1024 * 1024, { decimals: 1 })).toMatch(/1\.0\s*MB/);
  });
});
