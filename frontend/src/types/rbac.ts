/**
 * TypeScript interfaces for RBAC (Role-Based Access Control) system
 */

// Enums matching backend definitions
export enum ResourceType {
  USER = 'user',
  STUDENT = 'student',
  TEACHER = 'teacher',
  CLASS = 'class',
  ATTENDANCE = 'attendance',
  GRADE = 'grade',
  EXAM = 'exam',
  ASSIGNMENT = 'assignment',
  FINANCE = 'finance',
  SYSTEM = 'system',
  DASHBOARD = 'dashboard',
  REPORT = 'report',
  ANNOUNCEMENT = 'announcement',
  MESSAGE = 'message',
  DOCUMENT = 'document',
  SCHEDULE = 'schedule',
  SUBJECT = 'subject',
  DEPARTMENT = 'department',
  PARENT = 'parent'
}

export enum PermissionType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXECUTE = 'execute',
  MANAGE = 'manage',
  APPROVE = 'approve',
  ADMIN = 'admin'
}

export enum AccessType {
  ALLOW = 'allow',
  DENY = 'deny'
}

export enum SubjectType {
  USER = 'user',
  ROLE = 'role',
  GROUP = 'group'
}

// Core RBAC Interfaces
export interface RBACPermission {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  resource_type: ResourceType;
  permission_type: PermissionType;
  scope?: string;
  category: string;
  conditions?: Record<string, any>;
  metadata?: Record<string, any>;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RBACRole {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  color?: string;
  icon?: string;
  level: number;
  department_id?: number;
  max_users?: number;
  auto_assignment_conditions?: Record<string, any>;
  default_properties?: Record<string, any>;
  is_system: boolean;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  permissions?: RBACPermission[];
  parent_roles?: RBACRole[];
  child_roles?: RBACRole[];
  user_count?: number;
}

export interface UserRoleAssignment {
  id: number;
  user_id: number;
  role_id: number;
  assigned_by?: number;
  assigned_reason?: string;
  context?: Record<string, any>;
  conditions?: Record<string, any>;
  assigned_at: string;
  expires_at?: string;
  is_active: boolean;
  role?: RBACRole;
  assigned_by_user?: {
    id: number;
    username: string;
    email: string;
  };
}

export interface PermissionGrant {
  id: number;
  user_id: number;
  permission_id: number;
  granted_by?: number;
  granted_reason?: string;
  context?: Record<string, any>;
  conditions?: Record<string, any>;
  granted_at: string;
  expires_at?: string;
  is_active: boolean;
  is_denied: boolean;
  permission?: RBACPermission;
  granted_by_user?: {
    id: number;
    username: string;
    email: string;
  };
}

export interface AccessControlList {
  id: number;
  resource_type: ResourceType;
  resource_id: string;
  subject_type: SubjectType;
  subject_id: number;
  permission_id: number;
  access_type: AccessType;
  priority: number;
  conditions?: Record<string, any>;
  effective_from?: string;
  effective_until?: string;
  created_at: string;
  permission?: RBACPermission;
}

export interface RoleTemplate {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  category: string;
  permission_names: string[];
  default_properties?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// User with RBAC information
export interface UserWithRBAC {
  id: number;
  username: string;
  email: string;
  role?: string; // Legacy role field
  status: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  role_assignments?: UserRoleAssignment[];
  permission_grants?: PermissionGrant[];
  effective_permissions?: string[];
  effective_roles?: string[];
}

// Permission checking utilities
export interface PermissionCheck {
  permission: string;
  resource_type?: ResourceType;
  resource_id?: string;
  context?: Record<string, any>;
}

export interface RoleCheck {
  roles: string[];
  require_all?: boolean;
}

// API Response types
export interface RBACResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedRBACResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
  };
  message?: string;
}

// Form types for creating/updating RBAC entities
export interface CreateRoleRequest {
  name: string;
  display_name: string;
  description?: string;
  color?: string;
  icon?: string;
  level?: number;
  department_id?: number;
  max_users?: number;
  permission_names?: string[];
  auto_assignment_conditions?: Record<string, any>;
  default_properties?: Record<string, any>;
}

export interface UpdateRoleRequest extends Partial<CreateRoleRequest> {
  id: number;
}

export interface CreatePermissionRequest {
  name: string;
  display_name: string;
  description?: string;
  resource_type: ResourceType;
  permission_type: PermissionType;
  scope?: string;
  category: string;
  conditions?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface UpdatePermissionRequest extends Partial<CreatePermissionRequest> {
  id: number;
}

export interface AssignRoleRequest {
  user_id: number;
  role_name: string;
  reason?: string | undefined;
  expires_at?: string | undefined;
  context?: Record<string, any> | undefined;
  conditions?: Record<string, any> | undefined;
}

export interface GrantPermissionRequest {
  user_id: number;
  permission_name: string;
  reason?: string;
  expires_at?: string;
  context?: Record<string, any>;
  conditions?: Record<string, any>;
  is_denied?: boolean;
}

export interface CreateACLRequest {
  resource_type: ResourceType;
  resource_id: string;
  subject_type: SubjectType;
  subject_id: number;
  permission_name: string;
  access_type: AccessType;
  priority?: number;
  conditions?: Record<string, any>;
  effective_from?: string;
  effective_until?: string;
}

// Dashboard and UI types
export interface RoleStats {
  total_roles: number;
  active_roles: number;
  system_roles: number;
  custom_roles: number;
  roles_by_level: Record<number, number>;
}

export interface PermissionStats {
  total_permissions: number;
  permissions_by_category: Record<string, number>;
  permissions_by_type: Record<PermissionType, number>;
  permissions_by_resource: Record<ResourceType, number>;
}

export interface UserRoleStats {
  total_assignments: number;
  active_assignments: number;
  expired_assignments: number;
  assignments_by_role: Record<string, number>;
}

export interface RBACDashboardData {
  role_stats: RoleStats;
  permission_stats: PermissionStats;
  user_role_stats: UserRoleStats;
  recent_assignments: UserRoleAssignment[];
  recent_grants: PermissionGrant[];
}

// Component props types
export interface RoleCardProps {
  role: RBACRole;
  onEdit?: (role: RBACRole) => void;
  onDelete?: (role: RBACRole) => void;
  onViewUsers?: (role: RBACRole) => void;
  showActions?: boolean;
}

export interface PermissionCardProps {
  permission: RBACPermission;
  onEdit?: (permission: RBACPermission) => void;
  onDelete?: (permission: RBACPermission) => void;
  showActions?: boolean;
}

export interface UserRoleAssignmentProps {
  user: UserWithRBAC;
  onAssignRole?: (userId: number, roleName: string) => void;
  onRevokeRole?: (userId: number, roleName: string) => void;
  onGrantPermission?: (userId: number, permissionName: string) => void;
  onRevokePermission?: (userId: number, permissionName: string) => void;
}

// Hook types
export interface UseRBACReturn {
  // User permissions and roles
  userPermissions: string[];
  userRoles: string[];
  
  // Permission checking functions
  hasPermission: (permission: string, resourceType?: ResourceType, resourceId?: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAllRoles: (roles: string[]) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  
  // Resource access checking
  canAccessResource: (resourceType: ResourceType, resourceId: string, permission: string) => boolean;
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Refresh function
  refresh: () => Promise<void>;
}

export interface UseRolesReturn {
  roles: RBACRole[];
  loading: boolean;
  error: string | null;
  createRole: (data: CreateRoleRequest) => Promise<RBACResponse<RBACRole>>;
  updateRole: (data: UpdateRoleRequest) => Promise<RBACResponse<RBACRole>>;
  deleteRole: (id: number) => Promise<RBACResponse<void>>;
  assignRole: (data: AssignRoleRequest) => Promise<RBACResponse<void>>;
  revokeRole: (userId: number, roleName: string) => Promise<RBACResponse<void>>;
  refresh: () => Promise<void>;
}

export interface UsePermissionsReturn {
  permissions: RBACPermission[];
  loading: boolean;
  error: string | null;
  createPermission: (data: CreatePermissionRequest) => Promise<RBACResponse<RBACPermission>>;
  updatePermission: (data: UpdatePermissionRequest) => Promise<RBACResponse<RBACPermission>>;
  deletePermission: (id: number) => Promise<RBACResponse<void>>;
  grantPermission: (data: GrantPermissionRequest) => Promise<RBACResponse<void>>;
  revokePermission: (userId: number, permissionName: string) => Promise<RBACResponse<void>>;
  refresh: () => Promise<void>;
}

// Context types
export interface RBACContextType {
  // Current user RBAC data
  currentUser: UserWithRBAC | null;
  userPermissions: string[];
  userRoles: string[];
  
  // Permission checking functions
  hasPermission: (permission: string, resourceType?: ResourceType, resourceId?: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAllRoles: (roles: string[]) => boolean;
  
  // Loading and error states
  loading: boolean;
  error: string | null;
  
  // Actions
  refreshUserRBAC: () => Promise<void>;
  checkPermission: (check: PermissionCheck) => Promise<boolean>;
  checkRole: (check: RoleCheck) => Promise<boolean>;
}

// Route protection types
export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export interface ConditionalRenderProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
}

// Audit and logging types
export interface RBACEvent {
  id: number;
  event_type: string;
  user_id?: number;
  target_user_id?: number;
  role_id?: number;
  permission_id?: number;
  resource_type?: ResourceType;
  resource_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface RBACAuditLog {
  events: RBACEvent[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
  };
}