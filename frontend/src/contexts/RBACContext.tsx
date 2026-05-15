/**
 * RBAC Context Provider
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { rbacApi } from '../services/rbacApi';
import {
  RBACContextType,
  UserWithRBAC,
  ResourceType,
  PermissionCheck,
  RoleCheck
} from '../types/rbac';

const RBACContext = createContext<RBACContextType | undefined>(undefined);

export const useRBACContext = (): RBACContextType => {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useRBACContext must be used within an RBACProvider');
  }
  return context;
};

interface RBACProviderProps {
  children: React.ReactNode;
}

export const RBACProvider: React.FC<RBACProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [currentUser, setCurrentUser] = useState<UserWithRBAC | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUserRBAC = useCallback(async () => {
    if (!user?.id || !isAuthenticated) {
      setCurrentUser(null);
      setUserPermissions([]);
      setUserRoles([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [permissionsResponse, rolesResponse] = await Promise.all([
        rbacApi.getUserPermissions(user.id),
        rbacApi.getUserRoles(user.id)
      ]);

      if (permissionsResponse.success) {
        setUserPermissions(permissionsResponse.data || []);
      }

      if (rolesResponse.success) {
        const roles = rolesResponse.data?.map(assignment => assignment.role?.name || '') || [];
        setUserRoles(roles);
      }

      // Set current user with RBAC data
      setCurrentUser({
        ...user,
        role_assignments: rolesResponse.data,
        effective_permissions: permissionsResponse.data,
        effective_roles: rolesResponse.data?.map(assignment => assignment.role?.name || '') || []
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch RBAC data');
    } finally {
      setLoading(false);
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    refreshUserRBAC();
  }, [refreshUserRBAC]);

  const hasPermission = useCallback((
    permission: string,
    resourceType?: ResourceType,
    resourceId?: string
  ): boolean => {
    if (!currentUser || loading) return false;

    // Check if user has the specific permission
    if (userPermissions.includes(permission)) {
      return true;
    }

    // Check for admin permissions that override specific permissions
    if (userPermissions.includes('system.admin')) {
      return true;
    }

    return false;
  }, [currentUser, userPermissions, loading]);

  const hasRole = useCallback((role: string): boolean => {
    if (!currentUser || loading) return false;
    return userRoles.includes(role);
  }, [currentUser, userRoles, loading]);

  const hasAnyRole = useCallback((roles: string[]): boolean => {
    if (!currentUser || loading) return false;
    return roles.some(role => userRoles.includes(role));
  }, [currentUser, userRoles, loading]);

  const hasAllRoles = useCallback((roles: string[]): boolean => {
    if (!currentUser || loading) return false;
    return roles.every(role => userRoles.includes(role));
  }, [currentUser, userRoles, loading]);

  const checkPermission = useCallback(async (check: PermissionCheck): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      if (check.resource_type && check.resource_id) {
        const response = await rbacApi.checkResourceAccess(
          currentUser.id,
          check.resource_type,
          check.resource_id,
          check.permission
        );
        return response.success && response.data === true;
      } else {
        const response = await rbacApi.checkPermission(currentUser.id, check.permission);
        return response.success && response.data === true;
      }
    } catch {
      return false;
    }
  }, [currentUser]);

  const checkRole = useCallback(async (check: RoleCheck): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      if (check.require_all) {
        const results = await Promise.all(
          check.roles.map(role => rbacApi.checkRole(currentUser.id, role))
        );
        return results.every(result => result.success && result.data === true);
      } else {
        const results = await Promise.all(
          check.roles.map(role => rbacApi.checkRole(currentUser.id, role))
        );
        return results.some(result => result.success && result.data === true);
      }
    } catch {
      return false;
    }
  }, [currentUser]);

  const contextValue: RBACContextType = {
    currentUser,
    userPermissions,
    userRoles,
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    loading,
    error,
    refreshUserRBAC,
    checkPermission,
    checkRole
  };

  return (
    <RBACContext.Provider value={contextValue}>
      {children}
    </RBACContext.Provider>
  );
};
