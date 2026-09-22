import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import accessContextService, {
  AccessContextData,
} from '@/services/accessContextService';

const EMPTY_ACCESS_CONTEXT: AccessContextData = {
  tenant_id: null,
  roles: [],
  permissions: [],
};

function readActiveTenantId(): string | null {
  try {
    const value = localStorage.getItem(
      'saas_current_tenant_id'
    );

    return value && value.trim()
      ? value.trim()
      : null;
  } catch {
    return null;
  }
}

export const useAccessContext = () => {
  const { user, isAuthenticated } = useAuth();
  const [activeTenantId, setActiveTenantId] =
    useState<string | null>(() => readActiveTenantId());

  useEffect(() => {
    const syncTenant = () => {
      setActiveTenantId(readActiveTenantId());
    };

    syncTenant();
    window.addEventListener('local-storage-change', syncTenant);
    window.addEventListener('storage', syncTenant);

    return () => {
      window.removeEventListener('local-storage-change', syncTenant);
      window.removeEventListener('storage', syncTenant);
    };
  }, []);

  const enabled = Boolean(isAuthenticated && user?.id);

  const {
    data,
    error,
    isError,
    isFetching,
    refetch,
  } = useQuery<AccessContextData, Error>({
    queryKey: [
      'access-context',
      user?.id ?? null,
      activeTenantId,
    ],
    queryFn: () => accessContextService.getCurrent(),
    enabled,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
  });

  const context =
    enabled && !isFetching && !isError && data
      ? data
      : EMPTY_ACCESS_CONTEXT;

  const refresh = useCallback(async (): Promise<void> => {
    if (!enabled) {
      return;
    }

    await refetch();
  }, [enabled, refetch]);

  return {
    tenantId: context.tenant_id,
    roles: context.roles,
    permissions: context.permissions,
    loading: Boolean(enabled && isFetching),
    error:
      isError
        ? (
            error instanceof Error
              ? error.message
              : 'Failed to load access context'
          )
        : null,
    refresh,
  };
};
