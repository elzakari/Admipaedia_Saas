import api from '../lib/api';
import { StandardPaginatedResponse, StandardApiResponse } from '../types';
import { ApiResponseStandardizer } from '../lib/apiResponseStandardizer';
import { Student, StudentCreate, StudentUpdate, StudentFilters, StudentProfile } from '../types/student.types';

export interface StudentAnalyticsSummary {
  total_students: number;
  average_attendance_rate: number;
  average_performance_score: number;
  at_risk_students_count: number;
  class_performance?: Array<{ class_name: string; average_score: number }>;
  trends?: Array<{ date: string; average_score: number }>;
}

interface PasswordOptions {
  length?: number;
  includeUppercase?: boolean;
  includeLowercase?: boolean;
  includeNumbers?: boolean;
  includeSymbols?: boolean;
}

// Enhanced error handling with specific error types
export class StudentServiceError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorCode?: string
  ) {
    super(message);
    this.name = 'StudentServiceError';
  }
}

export interface StudentDashboardSummary {
  enrollment_scope: {
    class_name: string;
    student_id: number;
    admission_number: string;
  };
  attendance_percentage: number;
  pending_assignments_count: number;
  term_average_grade: number | null;
  todays_classes: Array<{
    id: number;
    subject: string;
    teacher: string;
    time: string;
    room: string;
  }>;
  upcoming_deadlines: Array<{
    id: number;
    title: string;
    subject_name: string;
    due_date: string;
  }>;
}

export interface StudentCourse {
  id: number;
  subject: string;
  code: string;
  teacher: string;
  room: string;
  nextSession: string;
}

export interface StudentTimetableItem {
  id: number;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | string;
  start: string;
  end: string;
  subject: string;
  room: string;
  teacher: string;
}

export interface StudentCourseList {
  courses: StudentCourse[];
  timetable: StudentTimetableItem[];
}

export interface StudentAssignment {
  id: number;
  classId: string;
  title: string;
  description: string;
  subject_name: string;
  due_date: string;
  dueAt: string;
  status: 'open' | 'submitted' | 'graded' | 'overdue' | 'pending' | string;
  score: number | null;
  max_points: number;
  feedback: string | null;
  attachments?: Array<{ id: string; filename: string; download_url: string }>;
  submission_attachments?: Array<{ id: string; filename: string; download_url: string }>;
  submission_date?: string | null;
  submitted_file_path?: string | null;
}

export interface StudentAssignmentSubmission {
  id: number;
  assignment_id: number;
  student_id: number;
  status: string;
  submission_date?: string | null;
  file_path?: string | null;
  attachments?: Array<{ id: string; filename: string; download_url: string }>;
}

export interface StudentGrade {
  id: number;
  subject: {
    id: number;
    name: string;
    code: string;
  };
  ca_score: number;
  exam_score: number;
  total_score: number;
  grade_letter: string;
  remarks: string;
}

export interface StudentGradesResponse {
  cumulative_average: number;
  class_rank: number;
  total_students: number;
  grades: StudentGrade[];
}

export interface StudentAttendanceHistoryItem {
  id: number;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused' | string;
  remarks: string;
}

export interface StudentAttendanceSummary {
  overall_percentage: number;
  days_present: number;
  days_absent: number;
  days_late: number;
  days_excused: number;
  history: StudentAttendanceHistoryItem[];
}

export interface StudentTimetableResponse {
  timetable: StudentTimetableItem[];
}

const studentService = {
  getDashboardSummary: async (): Promise<StudentDashboardSummary> => {
    const response = await api.get('/student/dashboard-summary');
    return (response.data?.data || response.data) as StudentDashboardSummary;
  },

  getGrades: async (termId?: string): Promise<StudentGradesResponse> => {
    const response = await api.get('/student/grades', { params: { term_id: termId } });
    return (response.data?.data || response.data) as StudentGradesResponse;
  },

  getAttendanceSummary: async (): Promise<StudentAttendanceSummary> => {
    const response = await api.get('/student/attendance/summary');
    return (response.data?.data || response.data) as StudentAttendanceSummary;
  },

  getTimetable: async (): Promise<StudentTimetableResponse> => {
    const response = await api.get('/student/timetable');
    return (response.data?.data || response.data) as StudentTimetableResponse;
  },

  getCourses: async (): Promise<StudentCourseList> => {
    const response = await api.get('/student/courses');
    return (response.data?.data || response.data) as StudentCourseList;
  },

  getAssignments: async (status?: string): Promise<StudentAssignment[]> => {
    const response = await api.get('/student/assignments', { params: { status } });
    return (response.data?.assignments || response.data?.data?.assignments || response.data || []) as StudentAssignment[];
  },

  getAssignmentById: async (assignmentId: number): Promise<StudentAssignment | null> => {
    const assignments = await studentService.getAssignments();
    return assignments.find((assignment) => assignment.id === assignmentId) ?? null;
  },

  submitAssignment: async (
    assignmentId: number,
    payload: { content?: string; file?: File | null }
  ): Promise<StudentAssignmentSubmission> => {
    const formData = new FormData();
    if (payload.content) {
      formData.append('content', payload.content);
    }
    if (payload.file) {
      formData.append('file', payload.file);
    }
    const response = await api.post(`/student/assignments/${assignmentId}/submit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return (response.data?.submission || response.data?.data?.submission) as StudentAssignmentSubmission;
  },

  downloadAttachment: async (downloadUrl: string): Promise<Blob> => {
    const relativeUrl = downloadUrl.startsWith('/api/v1') ? downloadUrl.replace('/api/v1', '') : downloadUrl;
    const response = await api.get(relativeUrl, { responseType: 'blob' });
    return response.data as Blob;
  },

  getOwnProfile: async (): Promise<StudentProfile> => {
    const response = await api.get('/students/profile')
    const student = response.data?.student || response.data?.data?.student
    return student as StudentProfile
  },

  getMyDashboard: async (): Promise<any> => {
    const response = await api.get('/students/dashboard')
    return response.data?.data || response.data
  },

  // Get all students with pagination and filtering
  getStudents: async (params?: {
    page?: number;
    per_page?: number;
    class_id?: number;
    status?: string;
    search?: string;
  }): Promise<StandardPaginatedResponse<Student>> => {
    try {
      console.log('📡 Making API request to /students with params:', params);

      const response = await api.get('/students', { params });

      console.log('✅ API Response received:', {
        status: response.status,
        statusText: response.statusText,
        dataType: typeof response.data,
        dataKeys: response.data ? Object.keys(response.data) : 'No data'
      });

      // Validate response structure
      if (!response.data) {
        console.error('❌ No data received from server');
        throw new StudentServiceError('No data received from server', 500, 'INVALID_RESPONSE');
      }

      const result = ApiResponseStandardizer.standardizePaginatedResponse<Student>(response, 'students');

      console.log('✅ Processed response:', {
        studentCount: result.data?.length || 0,
        total: result.pagination.total,
        page: result.pagination.current_page,
        hasNextPage: result.pagination.current_page < result.pagination.total_pages
      });

      return result;
    } catch (error) {
      console.error('❌ Student service error:', error);

      // Enhanced error handling
      if (error instanceof StudentServiceError) {
        throw error;
      }

      ApiResponseStandardizer.handleApiError(error);
    }
  },

  // Get a specific student by ID
  getStudentById: async (studentId: number): Promise<StandardApiResponse<Student>> => {
    try {
      if (!Number.isInteger(studentId) || studentId <= 0) {
        throw new StudentServiceError('Invalid student id supplied', 400, 'INVALID_STUDENT_ID');
      }
      const response = await api.get(`/students/${studentId}`);
      return ApiResponseStandardizer.standardizeSingleResponse<Student>(response, 'student');
    } catch (error) {
      console.error(`Error fetching student ${studentId}:`, error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  // Create a new student
  createStudent: async (studentData: StudentCreate): Promise<StandardApiResponse<Student>> => {
    try {
      const password = (studentData as any).password;
      const forcePasswordReset = (studentData as any).force_password_reset;

      if (password || forcePasswordReset) {
        const { password: _pw, force_password_reset: _fpr, ...studentPayload } = studentData as any;
        const response = await api.post('/enhanced-students/create-with-user', {
          student: studentPayload,
          user: {
            email: studentData.email,
            password: password
          }
        });

        return {
          data: response.data?.data,
          success: response.data?.success ?? true,
          message: response.data?.message,
          errors: response.data?.errors
        };
      }

      const response = await api.post('/students', studentData);
      return ApiResponseStandardizer.standardizeSingleResponse<Student>(response, 'student');
    } catch (error) {
      console.error('Error creating student:', error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  // Update a student
  updateStudent: async (studentId: number, studentData: Partial<StudentCreate>): Promise<StandardApiResponse<Student>> => {
    try {
      const response = await api.put(`/students/${studentId}`, studentData);
      return ApiResponseStandardizer.standardizeSingleResponse<Student>(response, 'student');
    } catch (error) {
      console.error(`Error updating student ${studentId}:`, error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  // Delete a student
  deleteStudent: async (studentId: number): Promise<StandardApiResponse<void>> => {
    try {
      const response = await api.delete(`/students/${studentId}`);
      return ApiResponseStandardizer.standardizeSingleResponse<void>(response);
    } catch (error) {
      console.error(`Error deleting student ${studentId}:`, error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  // Get students by class
  getStudentsByClass: async (classId: number): Promise<Student[]> => {
    try {
      const result = await studentService.getStudents({ page: 1, per_page: 200, class_id: classId });
      return result.data;
    } catch (error) {
      console.error(`Error fetching students for class ${classId}:`, error);
      throw error;
    }
  },

  // Get student profile with additional data
  getStudentProfile: async (studentId: number): Promise<StudentProfile> => {
    try {
      const response = await api.get(`/enhanced-students/${studentId}/report`, { params: { type: 'comprehensive' } });
      return response.data?.data;
    } catch (error) {
      console.error(`Error fetching student profile ${studentId}:`, error);
      throw error;
    }
  },

  getStudentAnalyticsSummary: async (params?: {
    class_id?: number;
    date_from?: string;
    date_to?: string;
    tenant_id?: string;
  }): Promise<StudentAnalyticsSummary> => {
    const tenantId = params?.tenant_id || localStorage.getItem('saas_current_tenant_id');
    const finalParams = {
      ...params,
      tenant_id: tenantId
    };
    const response = await api.get('/enhanced-students/analytics/summary', {
      params: finalParams,
      headers: tenantId ? { 'X-Tenant-ID': tenantId } : undefined
    });
    return response.data?.data as StudentAnalyticsSummary;
  },

  // Bulk operations
  bulkCreateStudents: async (studentsData: StudentCreate[]): Promise<{ created: Student[]; errors: any[] }> => {
    try {
      const response = await api.post('/students/bulk', { students: studentsData });
      return response.data;
    } catch (error) {
      console.error('Error bulk creating students:', error);
      throw error;
    }
  },

  bulkUpdateStudents: async (updates: Array<{ id: number; data: StudentUpdate }>): Promise<{ updated: Student[]; errors: any[] }> => {
    try {
      const response = await api.put('/students/bulk', { updates });
      return response.data;
    } catch (error) {
      console.error('Error bulk updating students:', error);
      throw error;
    }
  },

  bulkDeleteStudents: async (studentIds: number[]): Promise<{ deleted_count: number; errors: any[] }> => {
    try {
      const response = await api.delete('/students/bulk', { data: { student_ids: studentIds } });
      return response.data;
    } catch (error) {
      console.error('Error bulk deleting students:', error);
      throw error;
    }
  },

  // Import/Export operations
  importStudents: async (file: File): Promise<{ imported: number; errors: any[] }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('create_users', 'true');
      formData.append('update_existing', 'true');
      const response = await api.post('/enhanced-students/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const d = response.data?.data || {};
      return {
        imported: Number(d.successful_count || 0) + Number(d.updated_count || 0),
        errors: d.failed || []
      };
    } catch (error) {
      console.error('Error importing students:', error);
      throw error;
    }
  },

  exportStudents: async (filters?: StudentFilters): Promise<Blob> => {
    try {
      const response = await api.get('/enhanced-students/export', {
        params: {
          format: 'csv',
          class_id: (filters as any)?.class_id,
          status: (filters as any)?.status,
          fields: Array.isArray((filters as any)?.fields)
            ? (filters as any).fields.join(',')
            : (filters as any)?.fields
        }
      });

      const filePath = response.data?.data?.file_path;
      if (!filePath) throw new Error('Export did not return a file path');

      const download = await api.get(`/download/${filePath}`, { responseType: 'blob' });
      return download.data;
    } catch (error) {
      console.error('Error exporting students:', error);
      throw error;
    }
  },

  // Password management
  generatePassword: (options: PasswordOptions = {}): string => {
    const {
      length = 12,
      includeUppercase = true,
      includeLowercase = true,
      includeNumbers = true,
      includeSymbols = false
    } = options;

    let charset = '';
    if (includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (includeNumbers) charset += '0123456789';
    if (includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  },

  resetPassword: async (studentId: number, newPassword?: string): Promise<{ password: string }> => {
    try {
      const password = newPassword || studentService.generatePassword();
      const studentResp = await studentService.getStudentById(studentId);
      const userId = (studentResp as any)?.data?.user_id;
      if (!userId) throw new Error('Student has no linked user account');
      await api.post(`/users/${userId}/reset-password`, { new_password: password });
      return { password };
    } catch (error) {
      console.error(`Error resetting password for student ${studentId}:`, error);
      throw error;
    }
  },

  generateActivationLink: async (studentId: number): Promise<{ success: boolean; url: string }> => {
    try {
      const response = await api.post(`/students/${studentId}/generate-activation`);
      return response.data;
    } catch (error) {
      console.error(`Error generating activation link for student ${studentId}:`, error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  // Student promotion
  promoteStudents: async (promotionData: {
    current_class_id: number;
    next_class_id: number;
    student_ids: number[];
    academic_year: string;
  }): Promise<{ promoted_count: number; failed_promotions: Array<{ student_id: number; reason: string }> }> => {
    try {
      const response = await api.post('/students/promote', promotionData);
      return response.data;
    } catch (error) {
      console.error('Error promoting students:', error);
      throw error;
    }
  },

  getCalendarEvents: async (month?: number, year?: number): Promise<any> => {
    const response = await api.get('/student/calendar/events', { params: { month, year } });
    return response.data?.events || [];
  },

  getNotifications: async (): Promise<any> => {
    const response = await api.get('/student/notifications');
    return response.data?.notifications || [];
  },

  markNotificationAsRead: async (id: string): Promise<any> => {
    const response = await api.put(`/student/notifications/${id}/read`);
    return response.data;
  },

  markAllNotificationsAsRead: async (): Promise<any> => {
    const response = await api.put('/student/notifications/read-all');
    return response.data;
  },

  clearNotificationHistory: async (): Promise<any> => {
    const response = await api.delete('/student/notifications/clear');
    return response.data;
  },

  getConversations: async (): Promise<any> => {
    const response = await api.get('/student/messages/conversations');
    return response.data?.threads || [];
  },

  sendMessage: async (recipientUserId: number, content: string): Promise<any> => {
    const response = await api.post('/student/messages/send', { recipient_id: recipientUserId, content });
    return response.data;
  }
};

export { studentService };
export default studentService;
