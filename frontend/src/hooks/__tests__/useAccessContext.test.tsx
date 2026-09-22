import React from 'react';
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import {
  act,
  renderHook,
  waitFor,
} from '@testing-library/react';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { useAccessContext } from '../useAccessContext';

const mocks = vi.hoisted(() => ({
  getCurrent: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, username: 'tenant-user', role: 'admin' },
    isAuthenticated: true,
  }),
}));

vi.mock('@/services/accessContextService', () => ({
  default: { getCurrent: mocks.getCurrent },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('useAccessContext tenant isolation', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.getCurrent.mockReset();
  });

  it('drops prior-tenant authority when the active tenant changes', async () => {
    localStorage.setItem('saas_current_tenant_id', 'tenant-a');

    mocks.getCurrent.mockResolvedValueOnce({
      tenant_id: 'tenant-a',
      roles: ['school_admin', 'admin'],
      permissions: ['student.read'],
    });

    const { result } = renderHook(
      () => useAccessContext(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.roles).toContain('admin');
    });

    mocks.getCurrent.mockResolvedValueOnce({
      tenant_id: 'tenant-b',
      roles: ['teacher'],
      permissions: ['class.read'],
    });

    act(() => {
      localStorage.setItem('saas_current_tenant_id', 'tenant-b');
      window.dispatchEvent(new Event('local-storage-change'));
    });

    await waitFor(() => {
      expect(result.current.tenantId).toBe('tenant-b');
    });

    expect(result.current.roles).toEqual(['teacher']);
    expect(result.current.roles).not.toContain('admin');
    expect(result.current.permissions).toEqual(['class.read']);
    expect(mocks.getCurrent).toHaveBeenCalledTimes(2);
  });
});
