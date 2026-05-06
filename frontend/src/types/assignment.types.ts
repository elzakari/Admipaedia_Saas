// Create new types for assignments
export interface Assignment {
  id: number;
  title: string;
  description?: string;
  class_id: number;
  subject_id: number;
  teacher_id: number;
  due_date: string;
  total_points: number;
  assignment_type: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  class_name?: string;
  subject_name?: string;
}

export interface AssignmentSubmission {
  id: number;
  assignment_id: number;
  student_id: number;
  submission_date: string;
  content?: string;
  file_path?: string;
  score?: number;
  feedback?: string;
  status: 'submitted' | 'graded' | 'late' | 'missing';
  graded_by?: number;
  graded_at?: string;
  student_name?: string;
}

export interface AssignmentCreate {
  title: string;
  description?: string;
  class_id: number;
  subject_id: number;
  due_date: string;
  total_points: number;
  assignment_type: string;
}

export interface SubmissionCreate {
  assignment_id: number;
  student_id: number;
  content?: string;
  file_path?: string;
}

export interface GradeSubmission {
  score: number;
  feedback?: string;
}