const INVALID_STORED_VALUES = new Set(['', 'null', 'undefined', 'nan']);

export function normalizeStoredContextValue(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (INVALID_STORED_VALUES.has(trimmed.toLowerCase())) {
    return undefined;
  }

  return trimmed;
}

export function getStoredRealtimeContext() {
  const token = normalizeStoredContextValue(
    localStorage.getItem('token') ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('accessToken')
  );
  const tenantId = normalizeStoredContextValue(localStorage.getItem('saas_current_tenant_id'));
  const branchId = normalizeStoredContextValue(
    localStorage.getItem('active_branch_id') ||
    localStorage.getItem('saas_current_branch_id')
  );

  return { token, tenantId, branchId };
}

export function buildSocketAuthPayload() {
  const { token, tenantId, branchId } = getStoredRealtimeContext();

  if (!token) {
    return null;
  }

  return {
    token,
    ...(tenantId ? { tenant_id: tenantId } : {}),
    ...(branchId ? { branch_id: branchId } : {}),
  };
}
