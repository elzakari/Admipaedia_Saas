/**
 * API service for RBAC operations
 */

import { apiClient } from './apiClient';
import {
  RBACRole,
  RBACPermission,
  UserRoleAssignment,
  PermissionGrant,
  UserWithRBAC,
  ResourceType,
  RBACResponse,
  PaginatedRBACResponse,
  CreateRoleRequest,
  UpdateRoleRequest,
  CreatePermissionRequest,
  UpdatePermissionRequest,
  AssignRoleRequest,
  GrantPermissionRequest,
  CreateACLRequest,
  RBACDashboardData
} from '../types/rbac';

class RBACApiService {
  private baseUrl = '/rbac';

  // Role management
  async getAllRoles(): Promise<RBACResponse<RBACRole[]>> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/roles`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getRole(id: number): Promise<RBACResponse<RBACRole>> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/roles/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createRole(data: CreateRoleRequest): Promise<RBACResponse<RBACRole>> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/roles`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateRole(id: number, data: Partial<UpdateRoleRequest>): Promise<RBACResponse<RBACRole>> {
    try {
      const response = await apiClient.put(`${this.baseUrl}/roles/${id}`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteRole(id: number): Promise<RBACResponse<void>> {
    try {
      const response = await apiClient.delete(`${this.baseUrl}/roles/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getRoleUsers(roleId: number): Promise<RBACResponse<UserWithRBAC[]>> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/roles/${roleId}/users`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Permission management
  async getAllPermissions(category?: string): Promise<RBACResponse<RBACPermission[]>> {
    try {
      const params = category ? { category } : {};
      const response = await apiClient.get(`${this.baseUrl}/permissions`, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getPermission(id: number): Promise<RBACResponse<RBACPermission>> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/permissions/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createPermission(data: CreatePermissionRequest): Promise<RBACResponse<RBACPermission>> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/permissions`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updatePermission(id: number, data: Partial<UpdatePermissionRequest>): Promise<RBACResponse<RBACPermission>> {
    try {
      const response = await apiClient.put(`${this.baseUrl}/permissions/${id}`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deletePermission(id: number): Promise<RBACResponse<void>> {
    try {
      const response = await apiClient.delete(`${this.baseUrl}/permissions/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // User role assignments
  async getUserRoles(userId: number): Promise<RBACResponse<UserRoleAssignment[]>> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/users/${userId}/roles`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async assignRole(data: AssignRoleRequest): Promise<RBACResponse<void>> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/users/${data.user_id}/roles`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async revokeRole(userId: number, roleName: string): Promise<RBACResponse<void>> {
    try {
      const response = await apiClient.delete(`${this.baseUrl}/users/${userId}/roles/${roleName}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // User permission grants
  async getUserPermissions(userId: number): Promise<RBACResponse<string[]>> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/users/${userId}/permissions`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getUserPermissionGrants(userId: number): Promise<RBACResponse<PermissionGrant[]>> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/users/${userId}/permission-grants`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async grantPermission(data: GrantPermissionRequest): Promise<RBACResponse<void>> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/users/${data.user_id}/permissions`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async revokePermission(userId: number, permissionName: string): Promise<RBACResponse<void>> {
    try {
      const response = await apiClient.delete(`${this.baseUrl}/users/${userId}/permissions/${permissionName}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Permission checking
  async checkPermission(userId: number, permission: string): Promise<RBACResponse<boolean>> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/check/permission`, {
        user_id: userId,
        permission
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async checkRole(userId: number, role: string): Promise<RBACResponse<boolean>> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/check/role`, {
        user_id: userId,
        role
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async checkResourceAccess(
    userId: number,
    resourceType: ResourceType,
    resourceId: string,
    permission: string
  ): Promise<RBACResponse<boolean>> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/check/resource-access`, {
        user_id: userId,
        resource_type: resourceType,
        resource_id: resourceId,
        permission
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Access Control Lists
  async createACL(data: CreateACLRequest): Promise<RBACResponse<void>> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/acl`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getResourceACL(resourceType: ResourceType, resourceId: string): Promise<RBACResponse<any[]>> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/acl/${resourceType}/${resourceId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteACL(id: number): Promise<RBACResponse<void>> {
    try {
      const response = await apiClient.delete(`${this.baseUrl}/acl/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Dashboard and analytics
  async getDashboardData(): Promise<RBACResponse<RBACDashboardData>> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/dashboard`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Bulk operations
  async bulkAssignRoles(assignments: AssignRoleRequest[]): Promise<RBACResponse<void>> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/bulk/assign-roles`, { assignments });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async bulkRevokeRoles(revocations: { user_id: number; role_name: string }[]): Promise<RBACResponse<void>> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/bulk/revoke-roles`, { revocations });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async bulkGrantPermissions(grants: GrantPermissionRequest[]): Promise<RBACResponse<void>> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/bulk/grant-permissions`, { grants });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // System initialization
  async initializeDefaultRoles(): Promise<RBACResponse<void>> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/initialize/roles`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async initializeDefaultPermissions(): Promise<RBACResponse<void>> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/initialize/permissions`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Error handling
  private handleError(error: any): Error {
    if (error.response?.data?.message) {
      return new Error(error.response.data.message);
    }
    if (error.message) {
      return new Error(error.message);
    }
    return new Error('An unexpected error occurred');
  }
}

export const rbacApi = new RBACApiService();