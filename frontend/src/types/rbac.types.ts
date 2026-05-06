/**
 * RBAC (Role-Based Access Control) Type Definitions
 * Comprehensive types for permissions, roles, and access control
 */

export enum ResourceType {
  USER = 'user',
  STUDENT = 'student',
  TEACHER = 'teacher',
  PARENT = 'parent',
  CLASS = 'class',
  SUBJECT = 'subject',
  GRADE = 'grade',
  ATTENDANCE = 'attendance',
  EXAM = 'exam',
  ASSIGNMENT = 'assignment',
  REPORT = 'report',
  FINANCE = 'finance',
  SYSTEM = 'system',
  DASHBOARD = 'dashboard'
}

export enum PermissionType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXECUTE = 'execute',
  APPROVE = 'approve',
  MANAGE = 'manage',
  ADMIN = 'admin'
}

export interface RBACPermission {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  resource_type: ResourceType;
  permission_type: PermissionType;
  scope: string;
  conditions?: Record<string, any>;
  is_system: boolean;
  is_active: boolean;
  category?: string;
  priority: number;
}

export interface RBACRole {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  is_system: boolean;
  is_active: boolean;
  is_default: boolean;
  level: number;
  color: string;
  icon?: string;
}