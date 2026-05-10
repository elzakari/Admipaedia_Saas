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

const studentService = {
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
  }): Promise<StudentAnalyticsSummary> => {
    const response = await api.get('/enhanced-students/analytics/summary', { params });
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
          fields: (filters as any)?.fields
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
  }
};

export { studentService };
export default studentService;
