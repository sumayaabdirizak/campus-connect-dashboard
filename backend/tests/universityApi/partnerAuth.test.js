import { describe, it, expect } from 'vitest';
import { buildPartnerAuthHeaders } from '../../src/services/integrations/universityApi/partnerAuth.js';

describe('university API partner auth', () => {
  it('builds Authorization and X-Timestamp per AIS spec', () => {
    const headers = buildPartnerAuthHeaders({
      apiKey: 'test-api-key',
      partnerCode: 'campus_connect',
      timestampSeconds: 1693612800,
    });
    expect(headers['X-Timestamp']).toBe('1693612800');
    expect(headers.Authorization).toBeTruthy();
    const decoded = Buffer.from(headers.Authorization, 'base64').toString('utf8');
    expect(decoded.startsWith('campus_connect:')).toBe(true);
    expect(decoded.length).toBeGreaterThan('campus_connect:'.length);
  });
});
