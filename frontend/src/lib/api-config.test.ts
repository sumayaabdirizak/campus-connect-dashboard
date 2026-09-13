import { describe, it, expect } from 'vitest';
import { normalizeApiBase, buildApiUrl, getBackendOrigin, getApiBaseUrl } from '@/lib/api-config';

describe('api-config', () => {
  it('normalizeApiBase appends /api when missing', () => {
    expect(normalizeApiBase('http://localhost:4000')).toBe('http://localhost:4000/api');
    expect(normalizeApiBase('http://localhost:4000/')).toBe('http://localhost:4000/api');
  });

  it('normalizeApiBase keeps trailing /api', () => {
    expect(normalizeApiBase('https://api.example.com/api')).toBe('https://api.example.com/api');
    expect(normalizeApiBase('https://api.example.com/api/')).toBe('https://api.example.com/api');
  });

  it('buildApiUrl joins endpoint paths', () => {
    const prev = process.env.NEXT_PUBLIC_API_URL;
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000/api';
    expect(buildApiUrl('/users/me')).toBe('http://localhost:4000/api/users/me');
    expect(buildApiUrl('users/me')).toBe('http://localhost:4000/api/users/me');
    if (prev == null) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = prev;
  });

  it('getBackendOrigin strips /api', () => {
    const prev = process.env.NEXT_PUBLIC_API_URL;
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000/api';
    expect(getBackendOrigin()).toBe('http://localhost:4000');
    expect(getApiBaseUrl()).toBe('http://localhost:4000/api');
    if (prev == null) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = prev;
  });
});
