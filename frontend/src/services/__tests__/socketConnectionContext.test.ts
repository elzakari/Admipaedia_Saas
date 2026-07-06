import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildSocketAuthPayload,
  getStoredRealtimeContext,
  normalizeStoredContextValue,
} from '../socketConnectionContext';

describe('socketConnectionContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('normalizes empty and placeholder storage values', () => {
    expect(normalizeStoredContextValue('')).toBeUndefined();
    expect(normalizeStoredContextValue('   ')).toBeUndefined();
    expect(normalizeStoredContextValue('null')).toBeUndefined();
    expect(normalizeStoredContextValue('undefined')).toBeUndefined();
    expect(normalizeStoredContextValue('NaN')).toBeUndefined();
    expect(normalizeStoredContextValue(' tenant-1 ')).toBe('tenant-1');
  });

  it('reads stored realtime context without leaking placeholder branch ids', () => {
    localStorage.setItem('token', 'access-token');
    localStorage.setItem('saas_current_tenant_id', 'tenant-1');
    localStorage.setItem('active_branch_id', 'null');

    expect(getStoredRealtimeContext()).toEqual({
      token: 'access-token',
      tenantId: 'tenant-1',
      branchId: undefined,
    });
  });

  it('builds socket auth without invalid branch scope', () => {
    localStorage.setItem('token', 'access-token');
    localStorage.setItem('saas_current_tenant_id', 'tenant-1');
    localStorage.setItem('saas_current_branch_id', 'undefined');

    expect(buildSocketAuthPayload()).toEqual({
      token: 'access-token',
      tenant_id: 'tenant-1',
    });
  });
});
