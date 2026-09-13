import { describe, it, expect } from 'vitest';
import { isCourseOfferingPublicId } from '../../src/services/reports/courseOfferingPublicId.js';
import {
  assertTeacherMayUseScope,
  TEACHER_REPORT_SCOPES,
} from '../../src/services/reports/teacherReportAccess.js';

describe('isCourseOfferingPublicId', () => {
  it('accepts standard UUIDs', () => {
    expect(isCourseOfferingPublicId('761a3f20-77b2-4247-b0e8-f0f9cb702411')).toBe(true);
  });

  it('rejects teacher numeric ids', () => {
    expect(isCourseOfferingPublicId('373')).toBe(false);
    expect(isCourseOfferingPublicId(373)).toBe(false);
  });
});

describe('teacherReportAccess', () => {
  it('allows teachers on course and teacher scopes', () => {
    for (const scope of TEACHER_REPORT_SCOPES) {
      expect(() => assertTeacherMayUseScope(scope, 'TEACHER')).not.toThrow();
    }
  });

  it('blocks teachers from faculty-wide scopes', () => {
    expect(() => assertTeacherMayUseScope('student', 'TEACHER')).toThrow(/only view/);
  });
});
