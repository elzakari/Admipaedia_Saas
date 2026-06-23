export function canManageAdmissions(role?: string | null): boolean {
  return role === 'admin' || role === 'school_admin' || role === 'super_admin';
}

export function buildParentAdmissionSubmitPath(applicationId: string | number): string {
  return `/admissions/application/${applicationId}/submit`;
}
