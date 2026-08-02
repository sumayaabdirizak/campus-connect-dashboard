import { describe, it, expect } from 'vitest';
import {
  getCloseAtMs,
  pickEffectiveDue,
  resolveScheduleStatus,
  resolveStudentWorkStatus,
  publishStatusFromDraft,
} from '../../src/services/assignments/lifecycleCore.js';

describe('features/assignments/lifecycleCore', () => {
  const due = new Date('2026-07-20T12:00:00.000Z');

  it('getCloseAtMs adds late window minutes', () => {
    expect(getCloseAtMs(due, 60)).toBe(due.getTime() + 60 * 60_000);
    expect(getCloseAtMs(due, 0)).toBe(due.getTime());
  });

  it('pickEffectiveDue prefers later extension', () => {
    const ext = new Date('2026-07-22T12:00:00.000Z');
    expect(pickEffectiveDue(due, ext).getTime()).toBe(ext.getTime());
    expect(pickEffectiveDue(due, new Date('2026-07-19T12:00:00.000Z')).getTime()).toBe(
      due.getTime(),
    );
    expect(pickEffectiveDue(due, null).getTime()).toBe(due.getTime());
  });

  it('resolveScheduleStatus covers scheduled/open/closed', () => {
    const openAt = new Date('2026-07-18T12:00:00.000Z');
    expect(resolveScheduleStatus(openAt, due, 0, openAt.getTime() - 1000)).toBe('SCHEDULED');
    expect(resolveScheduleStatus(openAt, due, 0, openAt.getTime() + 1000)).toBe('OPEN');
    expect(resolveScheduleStatus(null, due, 60, getCloseAtMs(due, 60) + 1)).toBe('CLOSED');
  });

  it('resolveStudentWorkStatus uses effective due for missing', () => {
    const nowOpen = due.getTime() - 1000;
    expect(
      resolveStudentWorkStatus({ submitted: false }, due, 0, nowOpen),
    ).toBe('NOT_SUBMITTED');
    expect(
      resolveStudentWorkStatus({ submitted: false }, due, 0, due.getTime() + 1),
    ).toBe('MISSING');
    const extDue = new Date('2026-07-25T12:00:00.000Z');
    expect(
      resolveStudentWorkStatus({ submitted: false }, extDue, 0, due.getTime() + 1),
    ).toBe('NOT_SUBMITTED');
    expect(
      resolveStudentWorkStatus({ submitted: true, isLate: true }, due, 0, nowOpen),
    ).toBe('LATE');
    expect(
      resolveStudentWorkStatus(
        { submitted: true, isReviewed: true, hasGrade: true },
        due,
        0,
        nowOpen,
      ),
    ).toBe('GRADED');
  });

  it('publishStatusFromDraft maps boolean', () => {
    expect(publishStatusFromDraft(true)).toBe('DRAFT');
    expect(publishStatusFromDraft(false)).toBe('PUBLISHED');
  });
});
