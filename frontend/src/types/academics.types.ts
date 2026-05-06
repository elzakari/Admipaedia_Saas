
// Exam Types
export interface Exam {
  id: number;
  title: string;
  description?: string;
  exam_date: string;
  duration: number; // in minutes
  total_marks: number;
  passing_marks: number;
  class_id: number;
  subject_id: number;
  created_by: number;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  subject_name?: string;
  conflicts?: {
    has_conflicts: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
    recommendations: string[];
  };
  class_?: {
    id: number;
    name: string;
    grade_level: string;
    section?: string;
  };
  subject?: {
    id: number;
    name: string;
    code: string;
  };
  creator?: {
    id: number;
    email: string;
    full_name: string;
  };
  grades?: Grade[];
}

export interface ExamCreate {
  title: string;
  description?: string;
  exam_date: string;
  duration: number;
  total_marks: number;
  passing_marks: number;
  class_id: number;
  subject_id: number;
  status?: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
}

export interface ExamUpdate {
  title?: string;
  description?: string;
  exam_date?: string;
  duration?: number;
  total_marks?: number;
  passing_marks?: number;
  status?: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
}

// Grade Types
export interface Grade {
  id: number;
  student_id: number;
  exam_id: number;
  marks_obtained: number;
  percentage: number;
  grade_letter: string;
  score?: number; // Optional score field for compatibility
  remarks?: string;
  graded_by: number;
  created_at: string;
  updated_at: string;
  student?: {
    id: number;
    first_name: string;
    last_name: string;
    full_name: string;
  };
  exam?: {
    id: number;
    title: string;
    exam_date: string;
    total_marks: number;
  };
  grader?: {
    id: number;
    email: string;
    full_name: string;
  };
}

export interface GradeCreate {
  student_id: number;
  exam_id: number;
  marks_obtained: number;
  remarks?: string;
}

export interface GradeUpdate {
  marks_obtained?: number;
  remarks?: string;
}

export interface GradeBulkCreate {
  exam_id: number;
  grades: {
    student_id: number;
    marks_obtained: number;
    remarks?: string;
  }[];
}

// Grading Scheme
export interface GradingScheme {
  grade: string;
  minScore: number;
  maxScore: number;
  description: string;
}

// Exam Statistics
export interface ExamStatistics {
  totalStudents: number;
  submittedCount?: number;
  passedStudents?: number;
  failedStudents?: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  passingRate?: number;
  gradeDistribution: ({
    grade: string;
    count: number;
    percentage: number;
  } | {
    name: string;
    value: number;
    color?: string;
  })[];
  scoreRanges?: { range: string; count: number }[];
  subjectPerformance?: {
    subject: string;
    averageScore: number;
    passRate: number;
  }[];
}
