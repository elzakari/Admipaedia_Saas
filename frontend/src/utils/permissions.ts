import React from 'react';

type Role = 'admin' | 'teacher' | 'student' | 'parent';

type Permission = 
  | 'view_students'
  | 'create_student'
  | 'edit_student'
  | 'delete_student'
  | 'view_teachers'
  | 'create_teacher'
  | 'edit_teacher'
  | 'delete_teacher'
  | 'view_parents'
  | 'create_parent'
  | 'edit_parent'
  | 'delete_parent'
  | 'view_classes'
  | 'create_class'
  | 'edit_class'
  | 'delete_class'
  | 'view_grades'
  | 'create_grade'
  | 'edit_grade'
  | 'delete_grade'
  | 'view_attendance'
  | 'create_attendance'
  | 'edit_attendance'
  | 'delete_attendance';

const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    'view_students', 'create_student', 'edit_student', 'delete_student',
    'view_teachers', 'create_teacher', 'edit_teacher', 'delete_teacher',
    'view_parents', 'create_parent', 'edit_parent', 'delete_parent',
    'view_classes', 'create_class', 'edit_class', 'delete_class',
    'view_grades', 'create_grade', 'edit_grade', 'delete_grade',
    'view_attendance', 'create_attendance', 'edit_attendance', 'delete_attendance',
  ],
  teacher: [
    'view_students', 'edit_student',
    'view_parents',
    'view_classes',
    'view_grades', 'create_grade', 'edit_grade',
    'view_attendance', 'create_attendance', 'edit_attendance',
  ],
  student: [
    'view_grades',
    'view_attendance',
  ],
  parent: [
    'view_grades',
    'view_attendance',
  ],
};

export const hasPermission = (role: Role, permission: Permission): boolean => {
  return rolePermissions[role]?.includes(permission) || false;
};

export const PermissionGuard: React.FC<{
  permission: Permission;
  userRole: Role;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ permission, userRole, children, fallback = null }) => {
  if (hasPermission(userRole, permission)) {
    return children;
  }
  return fallback;
};