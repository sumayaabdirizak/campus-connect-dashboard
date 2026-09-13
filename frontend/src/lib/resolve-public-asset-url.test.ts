import { describe, it, expect, afterEach } from 'vitest';
import { resolvePublicAssetUrl } from '@/lib/resolve-public-asset-url';

describe('resolvePublicAssetUrl', () => {
  const prev = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    if (prev == null) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = prev;
  });

  it('returns null for empty values', () => {
    expect(resolvePublicAssetUrl(null)).toBeNull();
    expect(resolvePublicAssetUrl('')).toBeNull();
    expect(resolvePublicAssetUrl('   ')).toBeNull();
  });

  it('passes through absolute paths', () => {
    expect(resolvePublicAssetUrl('/uploads/covers/a.png')).toBe('/uploads/covers/a.png');
  });

  it('strips matching backend origin to a path', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000/api';
    expect(resolvePublicAssetUrl('http://localhost:4000/uploads/x.pdf')).toBe('/uploads/x.pdf');
  });

  it('keeps foreign absolute URLs', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000/api';
    expect(resolvePublicAssetUrl('https://cdn.example.com/a.jpg')).toBe(
      'https://cdn.example.com/a.jpg'
    );
  });
});
