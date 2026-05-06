/**
 * User Management TypeScript Interfaces
 * Comprehensive user-related types for all roles
 */

import { User, Class, Grade, Subject } from ".";
import { Department } from "./academic.types";

// Student Interface
export interface Student {
  id: number;
  user_id: number;
  student_id: string;
  
  // Personal information
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  
  // Contact information
  email?: string;
  phone?: string;
  address?: Address;
  
  // Academic information
  admission_date: string;
  current_class_id?: number;
  grade_level: number;
  academic_year: string;
  
  // Guardian information
  parent_ids: number[];
  emergency_contact?: EmergencyContact;
  
  // Status
  enrollment_status: 'active' | 'inactive' | 'graduated' | 'transferred' | 'suspended';
  
  // Relationships
  user?: User;
  current_class?: Class;
  parents?: Parent[];
  grades?: Grade[];
  attendance_records?: AttendanceRecord[];
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// Teacher Interface
export interface Teacher {
  id: number;
  user_id: number;
  employee_id: string;
  
  // Personal information
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  
  // Contact information
  email: string;
  phone?: string;
  address?: Address;
  
  // Professional information
  hire_date: string;
  specialization: string;
  qualifications: string[];
  experience_years: number;
  
  // Employment details
  department_id?: number;
  salary_info?: SalaryInfo;
  employment_status: 'active' | 'inactive' | 'on_leave' | 'terminated';
  
  // Emergency contact
  emergency_contact?: EmergencyContact;
  
  // Relationships
  user?: User;
  department?: Department;
  classes?: Class[];
  subjects?: Subject[];
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// Parent Interface
export interface Parent {
  id: number;
  user_id: number;
  
  // Personal information
  first_name: string;
  last_name: string;
  
  // Contact information
  email: string;
  phone?: string;
  address?: Address;
  
  // Professional information
  occupation?: string;
  workplace?: string;
  
  // Relationship to students
  children_ids: number[];
  relationship_type: 'father' | 'mother' | 'guardian' | 'other';
  
  // Status
  is_primary_contact: boolean;
  
  // Relationships
  user?: User;
  children?: Student[];
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// Address Interface
export interface Address {
  street: string;
  city: string;
  state?: string;
  postal_code?: string;
  country: string;
}

// Emergency Contact Interface
export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
  address?: Address;
}

// Salary Information Interface
export interface SalaryInfo {
  basic_salary: number;
  allowances: Record<string, number>;
  deductions: Record<string, number>;
  currency: string;
}

// Attendance Record Interface
export interface AttendanceRecord {
  id: number;
  student_id: number;
  class_id: number;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  check_in_time?: string;
  check_out_time?: string;
  notes?: string;
  marked_by: number;
  
  // Relationships
  student?: Student;
  class?: Class;
  teacher?: Teacher;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}