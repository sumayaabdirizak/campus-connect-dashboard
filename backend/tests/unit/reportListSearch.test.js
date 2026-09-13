import { describe, it, expect } from 'vitest';
import { filterReportListRows } from '../../src/services/reports/listReport.js';

describe('filterReportListRows', () => {
  const students = [
    {
      id: 1,
      name: 'Student 8 (Section B, BSC-CS-B2)',
      studentNumber: 'STU008',
      batch: 'BSC-CS-B2',
      section: 'Section B',
      courses: 3,
      attempts: 0,
      submissions: 0
    },
    {
      id: 2,
      name: 'Ada Lovelace',
      studentNumber: 'STU001',
      batch: 'BSC-CS-B1',
      section: 'Section A',
      courses: 2,
      attempts: 5,
      submissions: 1
    },
    {
      id: 3,
      name: 'Student 1',
      studentNumber: 'STU101',
      batch: 'BSC-CS-B1',
      section: 'Section A',
      courses: 1,
      attempts: 0,
      submissions: 0
    }
  ];

  it('returns all rows when search is empty', () => {
    expect(filterReportListRows(students, '')).toHaveLength(3);
    expect(filterReportListRows(students, '   ')).toHaveLength(3);
  });

  it('matches name, batch, section and student number', () => {
    expect(filterReportListRows(students, 'section b')).toHaveLength(1);
    expect(filterReportListRows(students, 'STU001')).toHaveLength(1);
    expect(filterReportListRows(students, 'bsc-cs-b2')).toHaveLength(1);
    expect(filterReportListRows(students, 'bsc-cs-b1')).toHaveLength(2);
    expect(filterReportListRows(students, 'ada')).toHaveLength(1);
  });

  it('matches numeric columns as text', () => {
    expect(filterReportListRows(students, '5')).toHaveLength(1);
  });

  it('does not match hidden id column', () => {
    expect(filterReportListRows(students, '999')).toHaveLength(0);
    expect(filterReportListRows(students, 'not-in-data')).toHaveLength(0);
  });

  it('is case insensitive', () => {
    expect(filterReportListRows(students, 'ADA')).toHaveLength(1);
  });

  it('matches when each word hits any column (multi-token)', () => {
    expect(filterReportListRows(students, 'ada bsc')).toHaveLength(1);
    expect(filterReportListRows(students, 'section b studen')).toHaveLength(1);
    expect(filterReportListRows(students, 'studen 8')).toHaveLength(1);
    expect(filterReportListRows(students, 'stu008 section')).toHaveLength(1);
  });

  it('matches partial name with number tokens', () => {
    expect(filterReportListRows(students, 'studen 1')).toHaveLength(1);
    expect(filterReportListRows(students, 'student 1')).toHaveLength(1);
  });
});
