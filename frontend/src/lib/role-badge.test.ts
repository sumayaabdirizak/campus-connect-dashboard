import { describe, it, expect } from 'vitest';
import { roleBadgeVariant } from '@/lib/role-badge';

describe('roleBadgeVariant', () => {
  it('maps known roles to labels and variants', () => {
    expect(roleBadgeVariant('STUDENT').label).toBe('Student');
    expect(roleBadgeVariant('STUDENT').variant).toBe('success');
    expect(roleBadgeVariant('TEACHER').variant).toBe('warning');
    expect(roleBadgeVariant('DEAN').variant).toBe('info');
    expect(roleBadgeVariant('SUPER_ADMIN').label).toBe('Super Admin');
    expect(roleBadgeVariant('SUPER_ADMIN').className).toBeTruthy();
  });

  it('title-cases unknown roles', () => {
    expect(roleBadgeVariant('CUSTOM_ROLE').label).toBe('Custom Role');
    expect(roleBadgeVariant(null).label).toBe('');
  });
});
