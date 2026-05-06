import { api } from '../lib/api';
import { PaginatedResponse } from '../types';

// External Exam Interfaces
export interface ExternalExamination {
  id: number;
  exam_type: 'bece' | 'wassce' | 'novdec' | 'private';
  exam_year: number;
  exam_session: 'may_june' | 'november_december' | 'march_april';
  exam_name: string;
  exam_code: string;
  exam_start_date: string;
  exam_end_date: string;
  result_status: 'pending' | 'released' | 'verified' | 'disputed' | 'cancelled';
  result_release_date?: string;
  total_registrations: number;
  total_results: number;
  auto_import_enabled: boolean;
  last_import_date?: string;
}

export interface ExternalExamRegistration {
  id: number;
  examination_id: number;
  student_id: number;
  index_number: string;
  center_number: string;
  center_name: string;
  registration_date: string;
  registration_status: string;
  is_private_candidate: boolean;
  registered_subjects: string[];
  registration_fee?: number;
  payment_status: string;
  payment_date?: string;
}

export interface ExternalExamResult {
  id: number;
  examination: {
    exam_type: string;
    exam_year: number;
    exam_name: string;
    exam_code: string;
  };
  subject: {
    id: number;
    name: string;
    code: string;
  };
  subject_code: string;
  raw_score?: number;
  percentage_score?: number;
  grade_symbol: string;
  grade_points?: number;
  result_status: string;
  is_verified: boolean;
  is_integrated: boolean;
  remarks?: string;
}

export interface ImportResult {
  batch_id: string;
  total_records: number;
  successful_imports: number;
  failed_imports: number;
  duplicate_records: number;
  errors: Array<{
    row: number;
    index_number: string;
    error: string;
  }>;
}

export interface PerformanceComparison {
  total_students: number;
  subjects_analyzed: number;
  average_external_performance: number;
  average_internal_performance: number;
  performance_correlation: number;
  subject_breakdown: Array<{
    subject_name: string;
    external_average: number;
    internal_average: number;
    correlation: number;
  }>;
  grade_distribution: {
    external: Record<string, number>;
    internal: Record<string, number>;
  };
}

export interface ExaminationFilters {
  page?: number;
  per_page?: number;
  exam_type?: string;
  exam_year?: number;
}

class ExternalExamsService {
  // Get all external examinations
  async getExaminations(params?: ExaminationFilters): Promise<PaginatedResponse<ExternalExamination>> {
    try {
      const response = await api.get('/external-exams/examinations', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching examinations:', error);
      throw error;
    }
  }

  // Create new external examination
  async createExamination(examData: {
    exam_type: string;
    exam_year: number;
    exam_session: string;
    exam_name: string;
    exam_start_date: string;
    exam_end_date: string;
    registration_start_date?: string;
    registration_end_date?: string;
    result_release_date?: string;
    auto_import_enabled?: boolean;
    import_source?: string;
  }): Promise<ExternalExamination> {
    try {
      const response = await api.post('/external-exams/examinations', examData);
      return response.data.data;
    } catch (error) {
      console.error('Error creating examination:', error);
      throw error;
    }
  }

  // Register student for external exam
  async registerStudent(examId: number, registrationData: {
    student_id: number;
    index_number: string;
    center_number: string;
    center_name: string;
    registered_subjects: string[];
    registration_date?: string;
    is_private_candidate?: boolean;
    registration_fee?: number;
    payment_status?: string;
  }): Promise<ExternalExamRegistration> {
    try {
      const response = await api.post(
        `/external-exams/examinations/${examId}/register-student`,
        registrationData
      );
      return response.data.data;
    } catch (error) {
      console.error('Error registering student:', error);
      throw error;
    }
  }

  // Import exam results from file
  async importResults(examId: number, file: File): Promise<ImportResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post(
        `/external-exams/examinations/${examId}/import-results`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data.data;
    } catch (error) {
      console.error('Error importing results:', error);
      throw error;
    }
  }

  // Get student's external exam results
  async getStudentResults(studentId: number, params?: {
    exam_type?: string;
    exam_year?: number;
  }): Promise<ExternalExamResult[]> {
    try {
      const response = await api.get(
        `/external-exams/students/${studentId}/results`,
        { params }
      );
      return response.data.data;
    } catch (error) {
      console.error('Error fetching student results:', error);
      throw error;
    }
  }

  // Integrate external result with internal system
  async integrateResult(resultId: number): Promise<{
    internal_grade_id: number;
    grade_symbol: string;
    grade_points: number;
  }> {
    try {
      const response = await api.post(
        `/external-exams/results/${resultId}/integrate`
      );
      return response.data.data;
    } catch (error) {
      console.error('Error integrating result:', error);
      throw error;
    }
  }

  // Get performance comparison analytics
  async getPerformanceComparison(params?: {
    exam_type?: string;
    exam_year?: number;
    class_id?: number;
  }): Promise<PerformanceComparison> {
    try {
      const response = await api.get(
        '/external-exams/analytics/performance-comparison',
        { params }
      );
      return response.data.data;
    } catch (error) {
      console.error('Error fetching performance comparison:', error);
      throw error;
    }
  }

  // Download sample import template
  async downloadImportTemplate(examType: string): Promise<Blob> {
    try {
      const response = await api.get(
        `/external-exams/import-template/${examType}`,
        { responseType: 'blob' }
      );
      return response.data;
    } catch (error) {
      console.error('Error downloading template:', error);
      throw error;
    }
  }
}

export const externalExamsService = new ExternalExamsService();
export default externalExamsService;