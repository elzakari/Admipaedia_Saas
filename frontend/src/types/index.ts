// User related types
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
  PARENT = 'PARENT'
}

// Standardized API Response types (aligned with ApiResponseStandardizer)
export interface Pagination {
  total: number;
  total_pages: number;
  current_page: number;
  per_page: number;
}

export interface StandardApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  pagination?: Pagination;
}

export interface StandardPaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
  success: boolean;
  message?: string;
}

// Legacy API Response types (for backward compatibility)
/**
 * Main Types Export File
 * Centralized export for all TypeScript interfaces
 */

// Core types
export * from './api-responses.types';
export * from './enhanced-auth.types';
export * from './academic.types';

// Existing types (for backward compatibility)
export * from './auth.types';
export * from './student.types';
export * from './teacher.types';
export * from './parent.types';
export * from './administration.types';
export * from './curriculum.types';
export * from './communication.types';
export * from './academics.types';

export type { Student as UserManagementStudent, Teacher as UserManagementTeacher, Parent as UserManagementParent } from './user-management.types';

// Legacy compatibility exports
export interface ApiResponse<T> {
  data: T;
  pagination?: Pagination;
  message?: string;
  success?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

// Re-export commonly used types with legacy names
export type { User as LegacyUser } from './auth.types';
export type { StandardApiResponse as ApiResponseV2 } from './api-responses.types';
export type { StandardPaginatedResponse as PaginatedResponseV2 } from './api-responses.types';

// Generic API Error type
export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  status?: number;
  success: false;
}

// Academic related types
export interface Class {
  id: string;
  name: string;
  teacherId: string;
  students: string[];
  subjects: Subject[];
}

export interface Subject {
  id: number; // Changed from string to number
  name: string;
  code: string;
  description?: string;
  department_id?: number;
  department?: { id: number; name: string; code: string };
  credit_hours: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Subject deletion validation types
export interface ValidationResult {
  can_delete: boolean;
  related_records: {
    grades: number;
    exams: number;
    external_exam_results: number;
    final_grades: number;
    enhanced_grades: number;
    continuous_assessments: number;
    school_based_assessments: number;
    assessment_frameworks: number;
    stem_subjects: number;
    teacher_assignments: number;
    class_assignments: number;
  };
  total_affected: number;
  subject_name: string;
}

export interface Grade {
  id: string;
  studentId: string;
  subjectId: string;
  score: number;
  term: string;
  date: string;
}

// Dashboard related types
export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  attendanceRate: number;
  averageGrade: number;
}

// Re-export standardized types for convenience
export type { StandardApiResponse as ApiResponseStandard };
export type { StandardPaginatedResponse as PaginatedResponseStandard };
