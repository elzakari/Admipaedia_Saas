import { describe, expect, it } from 'vitest';

import { buildParentAdmissionSubmitPath, canManageAdmissions } from './admissionsRoles';

describe('canManageAdmissions', () => {
  it('allows admin-style portal roles', () => {
    expect(canManageAdmissions('admin')).toBe(true);
    expect(canManageAdmissions('school_admin')).toBe(true);
    expect(canManageAdmissions('super_admin')).toBe(true);
  });

  it('rejects parent and undefined roles', () => {
    expect(canManageAdmissions('parent')).toBe(false);
    expect(canManageAdmissions('student')).toBe(false);
    expect(canManageAdmissions(undefined)).toBe(false);
    expect(canManageAdmissions(null)).toBe(false);
  });

  it('builds the dedicated parent submission endpoint', () => {
    expect(buildParentAdmissionSubmitPath(42)).toBe('/admissions/application/42/submit');
    expect(buildParentAdmissionSubmitPath('12')).toBe('/admissions/application/12/submit');
  });
});
