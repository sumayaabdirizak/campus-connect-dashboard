import { describe, it, expect } from 'vitest';
import { matchBatchSection } from '../../src/services/integrations/academicInfoSystem/resolveAisSyncScope.js';
import { buildSyncEmail } from '../../src/services/integrations/academicInfoSystem/syncStudents.js';

describe('AIS sync helpers', () => {
  const sections = [
    { id: 1, name: 'Section A' },
    { id: 2, name: 'Section B' },
  ];

  it('matchBatchSection maps AIS section labels', () => {
    expect(matchBatchSection(sections, 'A')?.id).toBe(1);
    expect(matchBatchSection(sections, 'B')?.id).toBe(2);
    expect(matchBatchSection(sections, null)?.id).toBe(1);
  });

  it('buildSyncEmail produces stable internal addresses', () => {
    expect(buildSyncEmail('JU-2023-001')).toBe('sis+ju-2023-001@campus-connect.internal');
  });
});
