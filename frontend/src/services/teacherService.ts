import api from '../lib/api';
import { TeacherClass } from '../types/teacher.types';
import { Pagination } from '../types';
import { ApiResponseStandardizer } from '../lib/apiResponseStandardizer';

// Teacher interface - consolidated and properly typed
export interface Teacher {
  id: number;
  first_name: string;
  last_name: string;
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
  employeeId?: string;
  profileImage?: string;
  createdAt?: string;
  updatedAt?: string;
  classes?: TeacherClass[];
  name?: string;
  position?: string;
  full_name?: string;
}

export interface TeacherCreate {
  first_name: string;
  last_name: string;
  employee_id: string;
  phone_number?: string;
  joining_date?: string;
  email: string;
  address?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  qualification?: string;
  specialization?: string;
  departmentId?: string;
  profileImage?: string;
  status?: 'active' | 'inactive' | 'on_leave';
}

export interface TeacherUpdate extends Partial<TeacherCreate> { }

export interface TeacherAttendance {
  id: number;
  teacher_id: number;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  check_in_time?: string;
  check_out_time?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TeacherAttendanceCreate {
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  check_in_time?: string;
  check_out_time?: string;
  notes?: string;
}

export interface TeacherClassAssignment {
  teacher_id: number;
  class_id: number;
  subject_id: number;
}

export interface TeacherAnalytics {
  totalClasses: number;
  attendanceRate: number;
  upcomingLessons: {
    id: number;
    title: string;
    class_name: string;
    subject: string;
    start_time: string;
    end_time: string;
    room: string;
  }[];
  recentActivities: {
    id: number;
    type: string;
    description: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
  }[];
}

// Teacher dashboard data
export interface TeacherDashboard {
  teacher: Teacher;
  stats: {
    total_classes: number;
    total_students: number;
    pending_assignments: number;
    upcoming_exams: number;
  };
  upcomingLessons: {
    id: number;
    title: string;
    class_name: string;
    subject: string;
    start_time: string;
    end_time: string;
    room: string;
  }[];
  recentActivities: {
    id: number;
    type: string;
    description: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
  }[];
}

const teacherService = {
  getOwnProfile: async (): Promise<Teacher> => {
    const response = await api.get('/teachers/profile')
    const teacher = response.data?.teacher || response.data?.data?.teacher
    return teacherService.transformTeacherFromBackend(teacher)
  },

  // Get all teachers with pagination and filtering
  getTeachers: async (params?: {
    page?: number;
    per_page?: number;
    status?: 'active' | 'inactive' | 'on_leave';
    specialization?: string;
    search?: string;
  }): Promise<{ teachers: Teacher[]; pagination: Pagination }> => {
    try {
      const response = await api.get('/teachers', { params });
      const standardized = ApiResponseStandardizer.standardizePaginatedResponse<any>(response, 'teachers');

      const teachers = (standardized.data || []).map((t: any) => {
        const base = teacherService.transformTeacherFromBackend(t);
        return {
          ...base,
          firstName: base.first_name,
          lastName: base.last_name,
          employeeId: base.employee_id,
          joinDate: (t.joining_date || t.hire_date || base.hire_date) ? String(t.joining_date || t.hire_date || base.hire_date) : undefined,
          hireDate: base.hire_date,
          phoneNumber: (t.phone_number || t.phone || base.phone) ? String(t.phone_number || t.phone || base.phone) : undefined,
          qualification: t.qualification ? String(t.qualification) : undefined,
          full_name: t.full_name ? String(t.full_name) : base.full_name,
          name: t.name ? String(t.name) : base.full_name
        } as Teacher;
      });

      const rawPagination = (response.data?.pagination || {}) as any;
      const pagination = {
        ...standardized.pagination,
        total_pages: standardized.pagination.total_pages || rawPagination.total_pages || rawPagination.pages || 0,
        current_page: standardized.pagination.current_page || rawPagination.current_page || rawPagination.page || 1,
        per_page: standardized.pagination.per_page || rawPagination.per_page || params?.per_page || 10
      } as any;

      return {
        teachers,
        pagination
      };
    } catch (error) {
      console.error('Error fetching teachers:', error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  updateTeacherStatus: async (teacherId: number, status: 'active' | 'inactive' | 'on_leave'): Promise<Teacher> => {
    try {
      const response = await api.patch(`/teachers/${teacherId}/status`, { status });
      const standardized = ApiResponseStandardizer.standardizeSingleResponse<any>(response, 'teacher');
      const t = standardized.data;
      const base = teacherService.transformTeacherFromBackend(t);
      return {
        ...base,
        firstName: base.first_name,
        lastName: base.last_name,
        employeeId: base.employee_id,
        name: base.full_name
      } as Teacher;
    } catch (error) {
      console.error(`Error updating teacher status ${teacherId}:`, error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  // Get a specific teacher by ID
  getTeacherById: async (teacherId: number): Promise<Teacher> => {
    try {
      const response = await api.get(`/teachers/${teacherId}`);
      const standardized = ApiResponseStandardizer.standardizeSingleResponse<Teacher>(response, 'teacher');

      return standardized.data;
    } catch (error) {
      console.error(`Error fetching teacher ${teacherId}:`, error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  // Create a new teacher
  createTeacher: async (teacherData: TeacherCreate): Promise<Teacher> => {
    try {
      const response = await api.post('/teachers', teacherData);
      const standardized = ApiResponseStandardizer.standardizeSingleResponse<Teacher>(response, 'teacher');

      return standardized.data;
    } catch (error) {
      console.error('Error creating teacher:', error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  // Update an existing teacher
  updateTeacher: async (teacherId: number, teacherData: TeacherUpdate): Promise<Teacher> => {
    try {
      const response = await api.put(`/teachers/${teacherId}`, teacherData);
      const standardized = ApiResponseStandardizer.standardizeSingleResponse<Teacher>(response, 'teacher');

      return standardized.data;
    } catch (error) {
      console.error(`Error updating teacher ${teacherId}:`, error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  // Delete a teacher
  deleteTeacher: async (teacherId: number): Promise<void> => {
    try {
      await api.delete(`/teachers/${teacherId}`);
    } catch (error) {
      console.error(`Error deleting teacher ${teacherId}:`, error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  // Get teacher classes
  getTeacherClasses: async (teacherId: number, params?: {
    page?: number;
    per_page?: number;
    academic_year?: string;
    status?: 'active' | 'inactive';
  }): Promise<{ classes: TeacherClass[]; pagination: Pagination }> => {
    try {
      const response = await api.get(`/teachers/${teacherId}/classes`, { params });
      const standardized = ApiResponseStandardizer.standardizePaginatedResponse<TeacherClass>(response, 'classes');

      return {
        classes: standardized.data,
        pagination: standardized.pagination
      };
    } catch (error) {
      console.error(`Error fetching classes for teacher ${teacherId}:`, error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  getTeacherAttendance: async (teacherId: number, params?: {
    page?: number;
    per_page?: number;
    start_date?: string;
    end_date?: string;
    status?: 'present' | 'absent' | 'late' | 'excused';
  }): Promise<{ attendance: TeacherAttendance[]; pagination: Pagination }> => {
    try {
      const response = await api.get(`/teachers/${teacherId}/attendance`, { params });
      const standardized = ApiResponseStandardizer.standardizePaginatedResponse<TeacherAttendance>(response, 'attendance');

      return {
        attendance: standardized.data,
        pagination: standardized.pagination
      };
    } catch (error) {
      console.error(`Error fetching attendance for teacher ${teacherId}:`, error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  markAttendance: async (teacherId: number, data: { date: string; status: 'present' | 'absent' | 'late'; note?: string }): Promise<TeacherAttendance> => {
    try {
      const response = await api.post(`/teachers/${teacherId}/attendance`, {
        date: data.date,
        status: data.status,
        notes: data.note
      });
      const standardized = ApiResponseStandardizer.standardizeSingleResponse<TeacherAttendance>(response, 'attendance');
      return standardized.data;
    } catch (error) {
      console.error(`Error marking attendance for teacher ${teacherId}:`, error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  getTeacherStats: async (teacherId: number): Promise<any> => {
    try {
      const response = await api.get(`/teachers/${teacherId}/stats`);
      const standardized = ApiResponseStandardizer.standardizeSingleResponse<any>(response, 'stats');
      return standardized.data;
    } catch (error) {
      console.error(`Error fetching stats for teacher ${teacherId}:`, error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  getTeacherDashboardAnalytics: async (teacherId: number): Promise<any> => {
    try {
      const response = await api.get(`/teachers/${teacherId}/analytics`);
      const standardized = ApiResponseStandardizer.standardizeSingleResponse<any>(response, 'analytics');
      return standardized.data;
    } catch (error) {
      console.error(`Error fetching analytics for teacher ${teacherId}:`, error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  // Get teacher's assigned subjects
  getTeacherSubjects: async (teacherId: number, params?: { academic_year?: string }): Promise<any[]> => {
    try {
      const response = await api.get(`/teachers/${teacherId}/subjects`, { params });
      return response.data?.subjects || response.data?.data?.subjects || [];
    } catch (error) {
      console.error(`Error fetching subjects for teacher ${teacherId}:`, error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  // Assign a class to a teacher
  assignClass: async (teacherId: number, classData: { class_id: number; subject_id?: number }): Promise<any> => {
    try {
      const response = await api.post(`/teachers/${teacherId}/classes`, classData);
      return response.data;
    } catch (error) {
      console.error(`Error assigning class to teacher ${teacherId}:`, error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  // Assign a subject to a teacher
  assignSubject: async (teacherId: number, subjectData: { subject_id: number }): Promise<any> => {
    try {
      const response = await api.post(`/teachers/${teacherId}/subjects`, subjectData);
      return response.data;
    } catch (error) {
      console.error(`Error assigning subject to teacher ${teacherId}:`, error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  // Remove a class assignment
  removeClassAssignment: async (teacherId: number, classId: number): Promise<void> => {
    try {
      await api.delete(`/teachers/${teacherId}/classes/${classId}`);
    } catch (error) {
      console.error(`Error removing class assignment for teacher ${teacherId}:`, error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  // Remove a subject assignment
  removeSubjectAssignment: async (teacherId: number, subjectId: number): Promise<void> => {
    try {
      await api.delete(`/teachers/${teacherId}/subjects/${subjectId}`);
    } catch (error) {
      console.error(`Error removing subject assignment for teacher ${teacherId}:`, error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  getPendingGrades: async (teacherId: number): Promise<any[]> => {
    try {
      const response = await api.get(`/teachers/${teacherId}/pending-grades`);
      const data = response.data?.data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (_error) {
      return [];
    }
  },

  getRecentMessages: async (teacherId: number, limit: number = 10): Promise<Array<{ read?: boolean }>> => {
    try {
      const response = await api.get(`/teachers/${teacherId}/messages`, { params: { limit } });
      const data = response.data?.data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (_error) {
      return [];
    }
  },

  // Transform functions with proper typing
  transformTeacherFromBackend: (backendTeacher: Record<string, unknown>): Teacher => {
    const phoneVal = (backendTeacher.phone_number || backendTeacher.phone)
      ? String(backendTeacher.phone_number || backendTeacher.phone)
      : undefined;
    const addressVal = backendTeacher.address ? String(backendTeacher.address) : undefined;
    const dobVal = backendTeacher.date_of_birth ? String(backendTeacher.date_of_birth) : undefined;
    const profileImageVal = backendTeacher.profile_image ? String(backendTeacher.profile_image) : undefined;
    const emergencyContactVal = backendTeacher.emergency_contact as Teacher['emergency_contact'] | undefined;
    const salaryInfoVal = backendTeacher.salary_info as Teacher['salary_info'] | undefined;
    const departmentVal = (backendTeacher.department as Teacher['department'] | undefined) ?? null;

    return {
      id: Number(backendTeacher.id),
      first_name: String(backendTeacher.first_name || ''),
      last_name: String(backendTeacher.last_name || ''),
      email: String(backendTeacher.email || ''),
      hire_date: String((backendTeacher.joining_date || backendTeacher.hire_date) || ''),
      employee_id: String(backendTeacher.employee_id || ''),
      specialization: String(backendTeacher.specialization || ''),
      qualifications: Array.isArray(backendTeacher.qualifications)
        ? backendTeacher.qualifications.map(String)
        : [],
      experience_years: Number(backendTeacher.experience_years || 0),
      status: (backendTeacher.status as 'active' | 'inactive' | 'on_leave') || 'active',
      department: departmentVal,
      created_at: String(backendTeacher.created_at || ''),
      updated_at: String(backendTeacher.updated_at || ''),
      full_name: String(backendTeacher.full_name || `${backendTeacher.first_name || ''} ${backendTeacher.last_name || ''}`.trim()),
      ...(phoneVal ? { phone: phoneVal } : {}),
      ...(addressVal ? { address: addressVal } : {}),
      ...(dobVal ? { date_of_birth: dobVal } : {}),
      ...(profileImageVal ? { profile_image: profileImageVal } : {}),
      ...(emergencyContactVal ? { emergency_contact: emergencyContactVal } : {}),
      ...(salaryInfoVal ? { salary_info: salaryInfoVal } : {}),
    };
  },

  transformTeacherToBackend: (frontendTeacher: Partial<Teacher>): Record<string, unknown> => {
    const backendData: Record<string, unknown> = {};

    Object.entries(frontendTeacher).forEach(([key, value]) => {
      if (value !== undefined) {
        backendData[key] = value;
      }
    });

    return backendData;
  },
};

export { teacherService };
export default teacherService;
