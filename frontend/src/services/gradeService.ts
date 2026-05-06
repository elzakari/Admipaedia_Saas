import api from '../lib/api';
import { API_BASE_URL } from '../config/constants';
import { Pagination, PaginatedResponse } from '../types';
import { queueDataForSync, STORES } from '../utils/offline';

// Types for grade data
export interface Grade {
  id: number;
  student_id: number;
  subject_id: number;
  class_id: number;
  term: string;
  academic_year: string;
  assessment_type: 'exam' | 'quiz' | 'assignment' | 'project' | 'midterm' | 'final';
  score: number;
  max_score: number;
  percentage: number;
  grade_letter?: string;
  remarks?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface GradeCreate {
  student_id: number;
  subject_id: number;
  class_id: number;
  term: string;
  academic_year: string;
  assessment_type: 'exam' | 'quiz' | 'assignment' | 'project' | 'midterm' | 'final';
  score: number;
  max_score: number;
  remarks?: string;
}

export interface GradeUpdate {
  score?: number;
  max_score?: number;
  remarks?: string;
}

export interface BulkGradeCreate {
  subject_id: number;
  class_id: number;
  term: string;
  academic_year: string;
  assessment_type: 'exam' | 'quiz' | 'assignment' | 'project' | 'midterm' | 'final';
  max_score: number;
  grades: {
    student_id: number;
    score: number;
    remarks?: string;
  }[];
}

export interface GradeImportResult {
  success: boolean;
  imported_count: number;
  failed_count: number;
  errors: Array<{
    row: number;
    message: string;
  }>;
}

export interface GradeExportResult {
  success: boolean;
  file_url: string;
  filename: string;
}

export interface GradeBulkUpdateResult {
  success: boolean;
  updated_count: number;
  failed_count: number;
  errors: Array<{
    grade_id: number;
    message: string;
  }>;
}

// Define the gradeService object
const gradeService = {
  // Get grades with pagination and filtering
  getGrades: async (params?: {
    page?: number;
    per_page?: number;
    student_id?: number;
    subject_id?: number;
    class_id?: number;
    term?: string;
    academic_year?: string;
    assessment_type?: 'exam' | 'quiz' | 'assignment' | 'project' | 'midterm' | 'final';
  }): Promise<{ grades: Grade[]; pagination: Pagination }> => {
    try {
      const response = await api.get('/grades', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching grades:', error);
      throw error;
    }
  },

  // Get grade by ID
  getGradeById: async (gradeId: number): Promise<Grade> => {
    try {
      const response = await api.get(`/grades/${gradeId}`);
      return response.data.grade;
    } catch (error) {
      console.error(`Error fetching grade ${gradeId}:`, error);
      throw error;
    }
  },

  // Create a new grade
  createGrade: async (gradeData: GradeCreate): Promise<Grade> => {
    try {
      // If offline, queue for sync
      if (!navigator.onLine) {
        const token = localStorage.getItem('token');
        await queueDataForSync(STORES.GRADES, gradeData, token);
        throw new Error('OFFLINE_QUEUED');
      }

      const response = await api.post('/grades', gradeData);
      return response.data.grade;
    } catch (error: any) {
      if (error.message === 'OFFLINE_QUEUED') throw error;

      // If network error, attempt to queue for sync
      if (!error.response || error.code === 'ECONNABORTED' || error.message === 'Network Error') {
        const token = localStorage.getItem('token');
        await queueDataForSync(STORES.GRADES, gradeData, token);
        throw new Error('OFFLINE_QUEUED');
      }

      console.error('Error creating grade:', error);
      throw error;
    }
  },

  // Update an existing grade
  updateGrade: async (gradeId: number, gradeData: GradeUpdate): Promise<Grade> => {
    try {
      const response = await api.put(`/grades/${gradeId}`, gradeData);
      return response.data.grade;
    } catch (error) {
      console.error(`Error updating grade ${gradeId}:`, error);
      throw error;
    }
  },

  // Delete a grade
  deleteGrade: async (gradeId: number): Promise<void> => {
    try {
      await api.delete(`/grades/${gradeId}`);
    } catch (error) {
      console.error(`Error deleting grade ${gradeId}:`, error);
      throw error;
    }
  },

  // Create bulk grades for a class and subject
  createBulkGrades: async (bulkData: BulkGradeCreate): Promise<{ grades: Grade[] }> => {
    try {
      // If offline, queue for sync
      if (!navigator.onLine) {
        const token = localStorage.getItem('token');
        await queueDataForSync(STORES.GRADES, bulkData, token);
        throw new Error('OFFLINE_QUEUED');
      }

      const response = await api.post('/grades/bulk', bulkData);
      return response.data;
    } catch (error: any) {
      if (error.message === 'OFFLINE_QUEUED') throw error;

      // If network error, attempt to queue for sync
      if (!error.response || error.code === 'ECONNABORTED' || error.message === 'Network Error') {
        const token = localStorage.getItem('token');
        await queueDataForSync(STORES.GRADES, bulkData, token);
        throw new Error('OFFLINE_QUEUED');
      }

      console.error('Error creating bulk grades:', error);
      throw error;
    }
  },

  // Get student report card
  getStudentReportCard: async (studentId: number, params?: {
    academic_year?: string;
    term?: string;
  }): Promise<any> => {
    try {
      const response = await api.get(`/students/${studentId}/report-card`, { params });
      return response.data;
    } catch (error) {
      console.error(`Error fetching report card for student ${studentId}:`, error);
      throw error;
    }
  },

  // Get class performance analytics
  getClassPerformance: async (classId: number, params?: {
    subject_id?: number;
    academic_year?: string;
    term?: string;
  }): Promise<any> => {
    try {
      const response = await api.get(`/classes/${classId}/performance`, { params });
      return response.data;
    } catch (error) {
      console.error(`Error fetching performance data for class ${classId}:`, error);
      throw error;
    }
  },

  // Get grade statistics for a subject
  getSubjectStatistics: async (subjectId: number, params?: {
    class_id?: number;
    academic_year?: string;
    term?: string;
  }): Promise<any> => {
    try {
      const response = await api.get(`/subjects/${subjectId}/statistics`, { params });
      return response.data;
    } catch (error) {
      console.error(`Error fetching statistics for subject ${subjectId}:`, error);
      throw error;
    }
  },

  // Import grades from CSV/Excel file
  exportGrades: async (params: {
    class_id?: number;
    subject_id?: number;
    exam_id?: number;
    format?: 'csv' | 'xlsx';
  }): Promise<GradeExportResult> => {
    try {
      const response = await api.get('/grades/export', { params });
      return response.data;
    } catch (error) {
      console.error('Error exporting grades:', error);
      throw error;
    }
  },

  bulkUpdateGrades: async (updates: Array<{
    grade_id: number;
    score?: number;
    remarks?: string;
  }>): Promise<GradeBulkUpdateResult> => {
    try {
      const response = await api.put('/grades/bulk-update', { updates });
      return response.data;
    } catch (error) {
      console.error('Error bulk updating grades:', error);
      throw error;
    }
  },

  getGradeDistribution: async (params: {
    class_id?: number;
    subject_id?: number;
    exam_id?: number;
  }): Promise<GradeExportResult> => {
    try {
      const response = await api.get('/grades/distribution', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching grade distribution:', error);
      throw error;
    }
  },

  importGrades: async (formData: FormData): Promise<GradeImportResult> => {
    try {
      const response = await api.post('/grades/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error importing grades:', error);
      throw error;
    }
  }
};

export { gradeService };
export default gradeService;
