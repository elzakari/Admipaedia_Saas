/**
 * Academic Management TypeScript Interfaces
 * Aligned with backend academic models
 */

import { Student } from "./student";
import { Teacher } from "./teacher.types";

// Class Interface
export interface Class {
  id: number;
  name: string;
  code: string;
  description?: string;
  academic_year: string;
  term: string;
  grade_level: number;
  section?: string;
  
  // Relationships
  teacher_id?: number;
  teacher?: Teacher;
  students?: Student[];
  subjects?: Subject[];
  
  // Metadata
  max_students?: number;
  current_enrollment: number;
  is_active: boolean;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// Subject Interface
export interface Subject {
  id: number;
  name: string;
  code: string;
  description?: string;
  
  // Academic details
  department_id?: number;
  department?: Department;
  credit_hours?: number;
  is_core: boolean;
  grade_levels: number[];
  
  // Status
  is_active: boolean;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// Department Interface
export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  
  // Leadership
  head_of_department_id?: number;
  head_of_department?: Teacher;
  
  // Relationships
  teachers?: Teacher[];
  subjects?: Subject[];
  
  // Status
  is_active: boolean;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// Grade Interface
export interface Grade {
  id: number;
  student_id: number;
  subject_id: number;
  class_id: number;
  teacher_id: number;
  
  // Grade details
  assessment_type: 'quiz' | 'test' | 'assignment' | 'project' | 'exam' | 'participation';
  score: number;
  max_score: number;
  percentage: number;
  letter_grade?: string;
  
  // Metadata
  assessment_name: string;
  assessment_date: string;
  weight?: number;
  comments?: string;
  
  // Relationships
  student?: Student;
  subject?: Subject;
  class?: Class;
  teacher?: Teacher;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// Assignment Interface
export interface Assignment {
  id: number;
  title: string;
  description: string;
  
  // Academic context
  subject_id: number;
  class_id: number;
  teacher_id: number;
  
  // Assignment details
  assignment_type: 'homework' | 'project' | 'essay' | 'presentation' | 'lab' | 'other';
  max_score: number;
  due_date: string;
  submission_format: 'online' | 'physical' | 'both';
  
  // Settings
  allow_late_submission: boolean;
  late_penalty_percentage?: number;
  is_group_assignment: boolean;
  
  // Status
  is_published: boolean;
  
  // Relationships
  subject?: Subject;
  class?: Class;
  teacher?: Teacher;
  submissions?: AssignmentSubmission[];
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// Assignment Submission Interface
export interface AssignmentSubmission {
  id: number;
  assignment_id: number;
  student_id: number;
  
  // Submission details
  submission_text?: string;
  file_attachments?: FileAttachment[];
  submitted_at: string;
  is_late: boolean;
  
  // Grading
  score?: number;
  feedback?: string;
  graded_at?: string;
  graded_by?: number;
  
  // Status
  status: 'draft' | 'submitted' | 'graded' | 'returned';
  
  // Relationships
  assignment?: Assignment;
  student?: Student;
  grader?: Teacher;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// File Attachment Interface
export interface FileAttachment {
  id: number;
  filename: string;
  original_filename: string;
  file_size: number;
  file_type: string;
  file_path: string;
  download_url?: string;
  uploaded_at: string;
}