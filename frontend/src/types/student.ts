export interface Student {
  name: any;
  id: number;
  admission_number: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  display_name: string;
  full_name: string;
  email?: string;
  phone?: string;
  telephone?: string;
  gender: string;
  class_id?: number;
  status: string;
  created_at: string;
  attendance_percentage?: number;
  performance_average?: number;
  // Personal Information
  surname?: string;
  date_of_birth?: string;
  place_of_birth?: string;
  religious_denomination?: string; // Make this optional
  whatsapp?: string;
  // Contact Information
  address?: string;
  postal_address?: string;
  digital_address?: string;
  city?: string;
  country?: string;
  residential_address?: string;
  local_landmark?: string;
  // Health Information
  special_circumstance?: string;
  allergies?: string;
  medication?: string;
  physician_name?: string;
  physician_phone?: string;
  // Previous School Information
  previous_school?: string;
  previous_class?: string;
  previous_team?: string;
  previous_year?: string;
  // Parent Information
  father_name?: string;
  father_email?: string;
  father_contact?: string;
  father_address?: string;
  father_profession?: string;
  father_workplace?: string;
  mother_name?: string;
  mother_email?: string;
  mother_contact?: string;
  mother_address?: string;
  mother_profession?: string;
  mother_workplace?: string;
  // System Fields
  parent_id?: number;
  updated_at?: string;
}

export interface StudentProfile {
  // Add new fields
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  medical_conditions?: string;
  allergies?: string;
  special_needs?: string;
  previous_school?: string;
  achievements?: string;
  extracurricular_activities?: string;
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  display_name: string;
  full_name: string;
  email: string;
  phone: string;
  admission_number: string;
  date_of_birth: string;
  gender: string;
  address?: string;
  class_id?: string;
  class_name?: string;
  parent_name?: string;
  parent_email?: string;
  parent_phone?: string;
  enrollment_date: string;
  status: string;
  attendance_percentage: number;
  performance_average: number;
  profile_picture?: string;
  place_of_birth?: string;
  religious_denomination?: string;
  blood_group?: string;
  
}

export interface AttendanceRecord {
  date: string;
  status: 'present' | 'absent' | 'late';
  subject: string;
}

export interface GradeRecord {
  subject: string;
  exam_type: string;
  marks_obtained: number;
  total_marks: number;
  percentage: number;
  grade: string;
  date: string;
}

// Add transformed student interface for frontend components
export interface TransformedStudent {
  id: string;
  classId?: number;
  first_name: string;
  last_name: string;
  middle_name?: string;
  display_name: string;
  full_name: string;
  name: string;
  studentId: string;
  grade: string;
  email: string;
  phone: string;
  gender: string;
  attendance: number;
  performance: number;
  status: string;
  lastActive: string;
  updatedAt?: string;
  profileImage: string;
  recentGrades: Array<{
    subject: string;
    grade: string;
    score: number;
  }>;
  subjects: string[];
  pendingAssignments: number;
  completedAssignments: number;
  enrollmentDate: string;
  parentInfo: {
    name: string;
    email: string;
    phone: string;
  };
  parentLinked?: boolean;
  riskLevel?: 'on-track' | 'monitor' | 'urgent';
  achievements: string[];
  attendanceHistory: Array<{
    date: string;
    status: 'present' | 'absent' | 'late';
  }>;
  performanceHistory: Array<{
    date: string;
    score: number;
    subject: string;
  }>;
  upcomingExams: Array<{
    subject: string;
    date: string;
    type: string;
  }>;
  notifications: Array<{
    id: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'error';
    date: string;
  }>;
}
