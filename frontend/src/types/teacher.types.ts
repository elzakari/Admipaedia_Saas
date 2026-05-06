// Teacher entity types
export interface Teacher {
  id: number;
  first_name: string;
  last_name: string;
  full_name?: string;
  email: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  hire_date: string;
  employee_id: string;
  specialization: string;
  qualifications: string[];
  experience_years: number;
  status: 'active' | 'inactive' | 'on_leave';
  profile_image?: string;
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  department: {
    id: number;
    name: string;
    code: string;
  } | null;
  salary_info?: {
    basic_salary: number;
    allowances: Record<string, number>;
    deductions: Record<string, number>;
  };
  created_at: string;
  updated_at: string;
  // Legacy fields for backward compatibility
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  joinDate?: string;
  hireDate?: string;
  dateOfBirth?: string;
  qualification?: string;
  departmentId?: string;
  profileImage?: string;
  createdAt?: string;
  updatedAt?: string;
  classes?: TeacherClass[];
  name?: string;
  position?: string;
}

// Add missing interfaces
export interface Qualification {
  degree: string;
  institution: string;
  year: string;
}

export interface ScheduleItem {
  day: string;
  time: string;
  subject: string;
  class: string;
}

// Teacher class assignment types
export interface TeacherClass {
  id: string;
  teacherId: string;
  classId: string;
  className?: string;
  gradeLevel?: string;
  section?: string;
  academicYear: string;
  isClassTeacher: boolean;
  assignedDate: string;
}

// Teacher subject assignment types
export interface TeacherSubject {
  id: string;
  teacherId: string;
  subjectId: string;
  subjectName?: string;
  classId?: string;
  className?: string;
  academicYear: string;
  assignedDate: string;
}
