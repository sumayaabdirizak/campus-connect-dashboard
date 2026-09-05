import { describe, it, expect } from 'vitest';
import { filterNavItems, pathAllowed, roleAllows } from '@/lib/nav-access';
import type { NavItem } from '@/types';

const studentItem: NavItem = {
  title: 'Courses',
  url: '/dashboard/courses',
  access: { roles: ['STUDENT', 'TEACHER'] }
};

const deanStudentsNav: NavItem = {
  title: 'Students',
  url: '/dashboard/dean/students',
  access: { roles: ['DEAN'] }
};

const deanLecturersNav: NavItem = {
  title: 'Lecturers',
  url: '/dashboard/dean/lecturers',
  access: { roles: ['DEAN'] }
};

const openItem: NavItem = {
  title: 'Dashboard',
  url: '/dashboard'
};

describe('nav-access', () => {
  it('roleAllows respects ACL and open items', () => {
    expect(roleAllows(openItem, 'STUDENT')).toBe(true);
    expect(roleAllows(deanStudentsNav, 'STUDENT')).toBe(false);
    expect(roleAllows(deanStudentsNav, 'DEAN')).toBe(true);
    expect(roleAllows(deanStudentsNav, undefined)).toBe(false);
  });

  it('pathAllowed always allows dashboard; otherwise checks the set', () => {
    expect(pathAllowed('/dashboard', new Set())).toBe(true);
    expect(pathAllowed('/dashboard/dean/students', new Set(['/dashboard/dean/students']))).toBe(true);
    expect(pathAllowed('/dashboard/dean/students', new Set(['/dashboard/courses']))).toBe(false);
    expect(pathAllowed('/dashboard/courses', null)).toBe(true);
  });

  it('filterNavItems applies role then path allowlist', () => {
    const items = [openItem, studentItem, deanStudentsNav, deanLecturersNav];
    const byRole = filterNavItems(items, 'STUDENT', null);
    expect(byRole.map((i) => i.url)).toEqual(['/dashboard', '/dashboard/courses']);

    const byPath = filterNavItems(
      items,
      'STUDENT',
      new Set(['/dashboard/courses'])
    );
    expect(byPath.map((i) => i.url)).toEqual(['/dashboard', '/dashboard/courses']);
  });
});
