/**
 * RBAC Context Provider
 *
 * Current-user authority is derived exclusively from the request-scoped
 * access context. Legacy global RBAC management APIs are not tenant authority.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from 'react';

import { useAuth } from './AuthContext';
import { useRBAC } from '../hooks/useRBAC';
import {
  RBACContextType,
  UserWithRBAC,
  ResourceType,
  PermissionCheck,
  RoleCheck,
} from '../types/rbac';

const RBACContext =
  createContext<RBACContextType | undefined>(undefined);

export const useRBACContext = (): RBACContextType => {
  const context = useContext(RBACContext);

  if (!context) {
    throw new Error(
      'useRBACContext must be used within an RBACProvider'
    );
  }

  return context;
};

interface RBACProviderProps {
  children: React.ReactNode;
}

export const RBACProvider: React.FC<RBACProviderProps> = ({
  children,
}) => {
  const { user, isAuthenticated } = useAuth();

  const {
    userPermissions,
    userRoles,
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    canAccessResource,
    loading,
    error,
    refresh,
  } = useRBAC();

  const currentUser = useMemo<UserWithRBAC | null>(
    () =>
      user && isAuthenticated
        ? ({
            ...user,
            effective_permissions: userPermissions,
            effective_roles: userRoles,
          } as UserWithRBAC)
        : null,
    [
      isAuthenticated,
      user,
      userPermissions,
      userRoles,
    ]
  );

  const refreshUserRBAC = useCallback(
    async (): Promise<void> => {
      await refresh();
    },
    [refresh]
  );

  const checkPermission = useCallback(
    async (check: PermissionCheck): Promise<boolean> => {
      if (!currentUser || loading) {
        return false;
      }

      if (check.resource_type || check.resource_id) {
        if (!check.resource_type || !check.resource_id) {
          return false;
        }

        return canAccessResource(
          check.resource_type,
          check.resource_id,
          check.permission
        );
      }

      return hasPermission(check.permission);
    },
    [canAccessResource, currentUser, hasPermission, loading]
  );

  const checkRole = useCallback(
    async (check: RoleCheck): Promise<boolean> => {
      if (!currentUser || loading) {
        return false;
      }

      return check.require_all
        ? hasAllRoles(check.roles)
        : hasAnyRole(check.roles);
    },
    [currentUser, hasAllRoles, hasAnyRole, loading]
  );

  const contextValue: RBACContextType = {
    currentUser,
    userPermissions,
    userRoles,
    hasPermission: (
      permission: string,
      resourceType?: ResourceType,
      resourceId?: string
    ) => hasPermission(permission, resourceType, resourceId),
    hasRole,
    hasAnyRole,
    hasAllRoles,
    loading,
    error,
    refreshUserRBAC,
    checkPermission,
    checkRole,
  };

  return (
    <RBACContext.Provider value={contextValue}>
      {children}
    </RBACContext.Provider>
  );
};
