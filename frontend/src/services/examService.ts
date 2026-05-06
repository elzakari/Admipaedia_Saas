import api from '../lib/api';
import { Exam, ExamCreate, ExamUpdate, Grade, GradeCreate, GradeUpdate, GradeBulkCreate, GradingScheme, ExamStatistics } from '../types/academics.types';
import { PaginatedResponse } from '../types';
import { queueDataForSync, STORES } from '../utils/offline';

const examService = {
  // Exam-related API calls
  getExams: async (params?: {
    page?: number;
    per_page?: number;
    class_id?: number;
    subject_id?: number;
    date_from?: string;
    date_to?: string;
    status?: string;
  }): Promise<PaginatedResponse<Exam>> => {
    try {
      const response = await api.get('/exams', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching exams:', error);
      throw error;
    }
  },

  getExamById: async (examId: number): Promise<Exam> => {
    try {
      const response = await api.get(`/exams/${examId}`);
      return response.data.exam;
    } catch (error) {
      console.error(`Error fetching exam ${examId}:`, error);
      throw error;
    }
  },

  createExam: async (examData: ExamCreate): Promise<Exam> => {
    try {
      // If offline, queue for sync
      if (!navigator.onLine) {
        const token = localStorage.getItem('token') || '';
        await queueDataForSync(STORES.EXAMS, { ...examData, endpoint: '/api/v1/exams' }, token);
        throw new Error('OFFLINE_QUEUED');
      }

      const response = await api.post('/exams', examData);
      return response.data.exam;
    } catch (error: any) {
      if (error.message === 'OFFLINE_QUEUED') throw error;

      // If network error, attempt to queue for sync
      if (!error.response || error.code === 'ECONNABORTED' || error.message === 'Network Error') {
        const token = localStorage.getItem('token') || '';
        await queueDataForSync(STORES.EXAMS, { ...examData, endpoint: '/api/v1/exams' }, token);
        throw new Error('OFFLINE_QUEUED');
      }

      console.error('Error creating exam:', error);
      throw error;
    }
  },

  updateExam: async (examId: number, examData: ExamUpdate): Promise<Exam> => {
    try {
      const response = await api.put(`/exams/${examId}`, examData);
      return response.data.exam;
    } catch (error) {
      console.error(`Error updating exam ${examId}:`, error);
      throw error;
    }
  },

  deleteExam: async (examId: number, force: boolean = false): Promise<void> => {
    try {
      await api.delete(`/exams/${examId}`, {
        params: { force }
      });
    } catch (error) {
      console.error(`Error deleting exam ${examId}:`, error);
      throw error;
    }
  },

  // Grade-related API calls
  getGradesByExam: async (examId: number): Promise<Grade[]> => {
    try {
      const response = await api.get(`/exams/${examId}/grades`);
      return response.data.grades || response.data;
    } catch (error) {
      console.error(`Error fetching grades for exam ${examId}:`, error);
      throw error;
    }
  },

  getGradesByStudent: async (studentId: number): Promise<Grade[]> => {
    try {
      const response = await api.get(`/students/${studentId}/grades`);
      return response.data.grades || response.data;
    } catch (error) {
      console.error(`Error fetching grades for student ${studentId}:`, error);
      throw error;
    }
  },

  createGrade: async (gradeData: GradeCreate): Promise<Grade> => {
    try {
      const response = await api.post('/grades', gradeData);
      return response.data.grade || response.data;
    } catch (error) {
      console.error('Error creating grade:', error);
      throw error;
    }
  },

  updateGrade: async (gradeId: number, gradeData: GradeUpdate): Promise<Grade> => {
    try {
      const response = await api.put(`/grades/${gradeId}`, gradeData);
      return response.data.grade || response.data;
    } catch (error) {
      console.error(`Error updating grade ${gradeId}:`, error);
      throw error;
    }
  },

  deleteGrade: async (gradeId: number): Promise<void> => {
    try {
      await api.delete(`/grades/${gradeId}`);
    } catch (error) {
      console.error(`Error deleting grade ${gradeId}:`, error);
      throw error;
    }
  },

  // Bulk grade operations
  bulkCreateGrades: async (bulkData: GradeBulkCreate): Promise<{ grades: Grade[] }> => {
    try {
      // If offline, queue for sync
      if (!navigator.onLine) {
        const token = localStorage.getItem('token') || '';
        await queueDataForSync(STORES.EXAMS, { ...bulkData, endpoint: '/api/v1/grades/bulk' }, token);
        throw new Error('OFFLINE_QUEUED');
      }

      const response = await api.post('/grades/bulk', bulkData);
      return response.data;
    } catch (error: any) {
      if (error.message === 'OFFLINE_QUEUED') throw error;

      // If network error, attempt to queue for sync
      if (!error.response || error.code === 'ECONNABORTED' || error.message === 'Network Error') {
        const token = localStorage.getItem('token') || '';
        await queueDataForSync(STORES.EXAMS, { ...bulkData, endpoint: '/api/v1/grades/bulk' }, token);
        throw new Error('OFFLINE_QUEUED');
      }

      console.error('Error creating bulk grades:', error);
      throw error;
    }
  },

  // Grading scheme
  getGradingScheme: async (): Promise<GradingScheme[]> => {
    try {
      const response = await api.get('/academics/grading-scheme');
      return response.data.gradingScheme || response.data;
    } catch (error) {
      console.error('Error fetching grading scheme:', error);
      // Return fallback data if API fails
      return [
        { grade: 'A+', minScore: 90, maxScore: 100, description: 'Excellent' },
        { grade: 'A', minScore: 80, maxScore: 89, description: 'Very Good' },
        { grade: 'B+', minScore: 75, maxScore: 79, description: 'Good' },
        { grade: 'B', minScore: 70, maxScore: 74, description: 'Above Average' },
        { grade: 'C+', minScore: 65, maxScore: 69, description: 'Average' },
        { grade: 'C', minScore: 60, maxScore: 64, description: 'Below Average' },
        { grade: 'D', minScore: 50, maxScore: 59, description: 'Pass' },
        { grade: 'F', minScore: 0, maxScore: 49, description: 'Fail' },
      ];
    }
  },

  // Exam statistics
  getExamStatistics: async (examId: number): Promise<ExamStatistics> => {
    try {
      const response = await api.get(`/exams/${examId}/statistics`);
      const raw = response.data?.statistics || response.data || {};
      const overall = raw.statistics || {};
      const distribution = raw.grade_distribution || {};

      const totalStudents = Number(overall.total_students || 0);
      const passedStudents = Number(overall.passed_students || 0);

      const gradeOrder = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'E', 'F'];
      const gradeColors: Record<string, string> = {
        'A+': '#16a34a',
        'A': '#22c55e',
        'B+': '#84cc16',
        'B': '#a3e635',
        'C+': '#f59e0b',
        'C': '#fbbf24',
        'D+': '#fb7185',
        'D': '#f43f5e',
        'E': '#ef4444',
        'F': '#991b1b'
      };

      const gradeDistribution = gradeOrder
        .filter((g) => distribution[g])
        .map((g) => ({
          name: g,
          value: Number(distribution[g]?.count || 0),
          color: gradeColors[g] || '#94a3b8'
        }));

      const scoreRanges = gradeOrder
        .filter((g) => distribution[g])
        .map((g) => ({
          range: String(distribution[g]?.range || g),
          count: Number(distribution[g]?.count || 0)
        }));

      const averageScore = Number(overall.mean || 0);
      const highestScore = Number(overall.max || 0);
      const lowestScore = Number(overall.min || 0);
      const passingRate = totalStudents > 0 ? Math.round((passedStudents / totalStudents) * 100) : 0;

      return {
        totalStudents,
        passedStudents,
        failedStudents: Math.max(0, totalStudents - passedStudents),
        averageScore,
        highestScore,
        lowestScore,
        passRate: passingRate,
        passingRate,
        gradeDistribution,
        scoreRanges
      } as any;
    } catch (error) {
      console.error(`Error fetching statistics for exam ${examId}:`, error);
      throw error;
    }
  }
};

export { examService };
export default examService;
