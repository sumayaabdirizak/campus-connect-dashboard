import { describe, it, expect } from 'vitest';
import { formatDate } from '@/lib/format';
import { pastelFor, PASTEL_SLOTS } from '@/lib/pastel';
import { resourceDownloadUrl } from '@/lib/course-details/services/resources-service';

describe('formatDate', () => {
  it('returns empty for falsy input', () => {
    expect(formatDate(undefined)).toBe('');
  });

  it('formats a fixed date in en-US', () => {
    expect(formatDate('2026-01-15T12:00:00.000Z', { timeZone: 'UTC' })).toMatch(/January/);
  });
});

describe('pastelFor', () => {
  it('is stable for the same seed', () => {
    expect(pastelFor('CS101')).toBe(pastelFor('CS101'));
    expect(PASTEL_SLOTS).toContain(pastelFor('CS101'));
  });
});

describe('resourceDownloadUrl', () => {
  it('returns same-origin rewrite path', () => {
    expect(resourceDownloadUrl(42)).toBe('/api/download/42');
  });

  it('adds download query when forcing attachment', () => {
    expect(resourceDownloadUrl(42, { forceDownload: true })).toBe(
      '/api/download/42?download=1'
    );
  });
});
