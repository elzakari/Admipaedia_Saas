import { renderHook } from '@testing-library/react';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { useRBAC } from '../useRBAC';
import { ResourceType } from '@/types/rbac';

const mocks = vi.hoisted(() => ({
  context: {
    tenantId: 'tenant-a' as string | null,
    roles: ['teacher'] as string[],
    permissions: ['student.read'] as string[],
    loading: false,
    error: null as string | null,
  },
  refresh: vi.fn(),
}));

vi.mock('../useAccessContext', () => ({
  useAccessContext: () => ({
    ...mocks.context,
    refresh: mocks.refresh,
  }),
}));

describe('useRBAC tenant authority', () => {
  beforeEach(() => {
    mocks.context = {
      tenantId: 'tenant-a',
      roles: ['teacher'],
      permissions: ['student.read'],
      loading: false,
      error: null,
    };
    mocks.refresh.mockReset();
  });

  it('uses only request-scoped roles and permissions', async () => {
    const { result } = renderHook(() => useRBAC());

    expect(result.current.hasRole('teacher')).toBe(true);
    expect(result.current.hasRole('admin')).toBe(false);
    expect(result.current.hasPermission('student.read')).toBe(true);
    expect(result.current.hasPermission('system.admin')).toBe(false);

    expect(
      result.current.hasPermission(
        'student.read',
        ResourceType.STUDENT,
        '123'
      )
    ).toBe(false);

    await expect(
      result.current.canAccessResource(
        ResourceType.STUDENT,
        '123',
        'student.read'
      )
    ).resolves.toBe(false);
  });

  it('preserves platform wildcard authority', async () => {
    mocks.context = {
      tenantId: null,
      roles: ['super_admin'],
      permissions: ['*'],
      loading: false,
      error: null,
    };

    const { result } = renderHook(() => useRBAC());

    expect(result.current.hasPermission('anything')).toBe(true);

    await expect(
      result.current.canAccessResource(
        ResourceType.SYSTEM,
        'platform',
        'system.admin'
      )
    ).resolves.toBe(true);
  });
});
