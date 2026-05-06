import api from '../lib/api';
import { StandardPaginatedResponse, StandardApiResponse } from '../types';
import { ApiResponseStandardizer } from '../lib/apiResponseStandardizer';

export interface Assignment {
  id: number;
  title: string;
  description: string;
  subject_id: number;
  class_id: number;
  teacher_id: number;
  due_date: string;
  total_marks: number;
  assignment_type: 'homework' | 'project' | 'quiz' | 'exam';
  status: 'draft' | 'published' | 'closed';
  instructions?: string;
  attachments?: string[];
  created_at: string;
  updated_at: string;
}

export interface AssignmentCreate {
  title: string;
  description: string;
  subject_id: number;
  class_id: number;
  due_date: string;
  total_marks: number;
  assignment_type: 'homework' | 'project' | 'quiz' | 'exam';
  instructions?: string;
  attachments?: File[];
}

export interface AssignmentUpdate {
  title?: string;
  description?: string;
  due_date?: string;
  total_marks?: number;
  status?: 'draft' | 'published' | 'closed';
  instructions?: string;
}

export interface Submission {
  id: number;
  assignment_id: number;
  student_id: number;
  content: string;
  attachments?: string[];
  submitted_at: string;
  grade?: number;
  feedback?: string;
  status: 'submitted' | 'graded' | 'late';
}

export interface SubmissionCreate {
  content: string;
  attachments?: File[];
}

export interface SubmissionGrade {
  score: number;
  feedback: string;
}

export interface AssignmentFilters {
  page?: number;
  per_page?: number;
  teacher_id?: number;
  class_id?: number;
  subject_id?: number;
  status?: string;
}

// Define the assignmentService object
const assignmentService = {
  // Get assignments with pagination and filtering
  getAssignments: async (params?: AssignmentFilters): Promise<StandardPaginatedResponse<Assignment>> => {
    try {
      const response = await api.get('/assignments', { params });
      return ApiResponseStandardizer.standardizePaginatedResponse<Assignment>(response, 'assignments');
    } catch (error) {
      console.error('Error fetching assignments:', error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  // Get a specific assignment by ID
  getAssignment: async (id: number): Promise<StandardApiResponse<Assignment>> => {
    try {
      const response = await api.get(`/assignments/${id}`);
      return ApiResponseStandardizer.standardizeSingleResponse<Assignment>(response, 'assignment');
    } catch (error) {
      console.error(`Error fetching assignment ${id}:`, error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  // Create a new assignment
  createAssignment: async (assignmentData: AssignmentCreate): Promise<StandardApiResponse<Assignment>> => {
    try {
      const formData = new FormData();
      Object.entries(assignmentData).forEach(([key, value]) => {
        if (key === 'attachments' && value) {
          (value as File[]).forEach(file => formData.append('attachments', file));
        } else {
          formData.append(key, value as string);
        }
      });

      const response = await api.post('/assignments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return ApiResponseStandardizer.standardizeSingleResponse<Assignment>(response, 'assignment');
    } catch (error) {
      console.error('Error creating assignment:', error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  // Update an assignment
  updateAssignment: async (id: number, assignmentData: AssignmentUpdate): Promise<StandardApiResponse<Assignment>> => {
    try {
      const response = await api.put(`/assignments/${id}`, assignmentData);
      return ApiResponseStandardizer.standardizeSingleResponse<Assignment>(response, 'assignment');
    } catch (error) {
      console.error(`Error updating assignment ${id}:`, error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },

  // Delete an assignment
  deleteAssignment: async (id: number): Promise<StandardApiResponse<void>> => {
    try {
      const response = await api.delete(`/assignments/${id}`);
      return ApiResponseStandardizer.standardizeSingleResponse<void>(response);
    } catch (error) {
      console.error(`Error deleting assignment ${id}:`, error);
      ApiResponseStandardizer.handleApiError(error);
    }
  },
};

export default assignmentService;