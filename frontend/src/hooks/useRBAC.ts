/**
 * React hooks for RBAC functionality
 */

import { useState, useEffect, useCallback, useContext } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { rbacApi } from '../services/rbacApi';
import {
  RBACRole,
  RBACPermission,
  UserWithRBAC,
  ResourceType,
  UseRBACReturn,
  UseRolesReturn,
  UsePermissionsReturn,
  CreateRoleRequest,
  UpdateRoleRequest,
  CreatePermissionRequest,
  UpdatePermissionRequest,
  AssignRoleRequest,
  GrantPermissionRequest,
  RBACResponse
} from '../types/rbac';

/**
 * Main RBAC hook for permission and role checking
 */
export const useRBAC = (): UseRBACReturn => {
  const { user } = useAuth();
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserRBAC = useCallback(async () => {
    if (!user?.id) {
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
        setUserRoles(rolesResponse.data?.map(r => r.role?.name || '') || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch RBAC data');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchUserRBAC();
  }, [fetchUserRBAC]);

  const hasPermission = useCallback((
    permission: string,
    resourceType?: ResourceType,
    resourceId?: string
  ): boolean => {
    if (!user?.id || loading) return false;

    // Check if user has the specific permission
    if (userPermissions.includes(permission)) {
      return true;
    }

    // Check for admin permissions that override specific permissions
    if (userPermissions.includes('system.admin')) {
      return true;
    }

    // Resource-specific permission checking would require additional API call
    // For now, we'll use the general permission check
    return false;
  }, [user?.id, userPermissions, loading]);

  const hasRole = useCallback((role: string): boolean => {
    if (!user?.id || loading) return false;
    return userRoles.includes(role);
  }, [user?.id, userRoles, loading]);

  const hasAnyRole = useCallback((roles: string[]): boolean => {
    if (!user?.id || loading) return false;
    return roles.some(role => userRoles.includes(role));
  }, [user?.id, userRoles, loading]);

  const hasAllRoles = useCallback((roles: string[]): boolean => {
    if (!user?.id || loading) return false;
    return roles.every(role => userRoles.includes(role));
  }, [user?.id, userRoles, loading]);

  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    if (!user?.id || loading) return false;
    return permissions.some(permission => userPermissions.includes(permission));
  }, [user?.id, userPermissions, loading]);

  const hasAllPermissions = useCallback((permissions: string[]): boolean => {
    if (!user?.id || loading) return false;
    return permissions.every(permission => userPermissions.includes(permission));
  }, [user?.id, userPermissions, loading]);

  const canAccessResource = useCallback(async (
    resourceType: ResourceType,
    resourceId: string,
    permission: string
  ): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const response = await rbacApi.checkResourceAccess(
        user.id,
        resourceType,
        resourceId,
        permission
      );
      return response.success && response.data === true;
    } catch {
      return false;
    }
  }, [user?.id]);

  return {
    userPermissions,
    userRoles,
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    hasAnyPermission,
    hasAllPermissions,
    canAccessResource,
    loading,
    error,
    refresh: fetchUserRBAC
  };
};

/**
 * Hook for managing roles
 */
export const useRoles = (): UseRolesReturn => {
  const [roles, setRoles] = useState<RBACRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await rbacApi.getAllRoles();
      if (response.success) {
        setRoles(response.data || []);
      } else {
        setError(response.message || 'Failed to fetch roles');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const createRole = useCallback(async (data: CreateRoleRequest): Promise<RBACResponse<RBACRole>> => {
    try {
      const response = await rbacApi.createRole(data);
      if (response.success) {
        await fetchRoles(); // Refresh the list
      }
      return response;
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to create role'
      };
    }
  }, [fetchRoles]);

  const updateRole = useCallback(async (data: UpdateRoleRequest): Promise<RBACResponse<RBACRole>> => {
    try {
      const response = await rbacApi.updateRole(data.id, data);
      if (response.success) {
        await fetchRoles(); // Refresh the list
      }
      return response;
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to update role'
      };
    }
  }, [fetchRoles]);

  const deleteRole = useCallback(async (id: number): Promise<RBACResponse<void>> => {
    try {
      const response = await rbacApi.deleteRole(id);
      if (response.success) {
        await fetchRoles(); // Refresh the list
      }
      return response;
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to delete role'
      };
    }
  }, [fetchRoles]);

  const assignRole = useCallback(async (data: AssignRoleRequest): Promise<RBACResponse<void>> => {
    try {
      return await rbacApi.assignRole(data);
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to assign role'
      };
    }
  }, []);

  const revokeRole = useCallback(async (userId: number, roleName: string): Promise<RBACResponse<void>> => {
    try {
      return await rbacApi.revokeRole(userId, roleName);
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to revoke role'
      };
    }
  }, []);

  return {
    roles,
    loading,
    error,
    createRole,
    updateRole,
    deleteRole,
    assignRole,
    revokeRole,
    refresh: fetchRoles
  };
};

/**
 * Hook for managing permissions
 */
export const usePermissions = (): UsePermissionsReturn => {
  const [permissions, setPermissions] = useState<RBACPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await rbacApi.getAllPermissions();
      if (response.success) {
        setPermissions(response.data || []);
      } else {
        setError(response.message || 'Failed to fetch permissions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch permissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const createPermission = useCallback(async (data: CreatePermissionRequest): Promise<RBACResponse<RBACPermission>> => {
    try {
      const response = await rbacApi.createPermission(data);
      if (response.success) {
        await fetchPermissions(); // Refresh the list
      }
      return response;
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to create permission'
      };
    }
  }, [fetchPermissions]);

  const updatePermission = useCallback(async (data: UpdatePermissionRequest): Promise<RBACResponse<RBACPermission>> => {
    try {
      const response = await rbacApi.updatePermission(data.id, data);
      if (response.success) {
        await fetchPermissions(); // Refresh the list
      }
      return response;
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to update permission'
      };
    }
  }, [fetchPermissions]);

  const deletePermission = useCallback(async (id: number): Promise<RBACResponse<void>> => {
    try {
      const response = await rbacApi.deletePermission(id);
      if (response.success) {
        await fetchPermissions(); // Refresh the list
      }
      return response;
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to delete permission'
      };
    }
  }, [fetchPermissions]);

  const grantPermission = useCallback(async (data: GrantPermissionRequest): Promise<RBACResponse<void>> => {
    try {
      return await rbacApi.grantPermission(data);
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to grant permission'
      };
    }
  }, []);

  const revokePermission = useCallback(async (userId: number, permissionName: string): Promise<RBACResponse<void>> => {
    try {
      return await rbacApi.revokePermission(userId, permissionName);
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to revoke permission'
      };
    }
  }, []);

  return {
    permissions,
    loading,
    error,
    createPermission,
    updatePermission,
    deletePermission,
    grantPermission,
    revokePermission,
    refresh: fetchPermissions
  };
};
