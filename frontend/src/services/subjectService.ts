import api from '../lib';
import { ValidationResult } from '../types';

export interface Subject {
  id: number;
  name: string;
  code: string;
  description?: string;
  department?: string;
  department_name?: string | null;
  credit_hours?: number;
  credits?: number;
  is_active: boolean;
  classes?: Array<{ id: number; name: string }>;
  teachers?: Array<{ id: number; name: string }>;
  created_at: string;
  updated_at: string;
}

export interface SubjectCreate {
  name: string;
  code?: string;
  description?: string;
  department?: string;
  department_id?: number | null;
  credit_hours?: number;
  is_active?: boolean;
}

export interface SubjectUpdate {
  name?: string;
  code?: string;
  description?: string;
  department?: string;
  department_id?: number | null;
  credit_hours?: number;
  is_active?: boolean;
}

const subjectService = {
  getSubjects: async (params?: {
    page?: number | undefined;
    per_page?: number | undefined;
    department?: string | undefined;
    is_active?: boolean | undefined;
    class_id?: number | undefined;
  }): Promise<{ subjects: Subject[]; pagination: any }> => {
    try {
      const response = await api.get('/subjects', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching subjects:', error);
      throw error;
    }
  },

  assignClass: async (subjectId: number, classId: number): Promise<Subject> => {
    const response = await api.put(`/subjects/${subjectId}/assign-class`, { class_id: classId });
    return response.data.subject;
  },

  removeClass: async (subjectId: number, classId: number): Promise<Subject> => {
    const response = await api.put(`/subjects/${subjectId}/remove-class`, { class_id: classId });
    return response.data.subject;
  },

  assignTeacher: async (subjectId: number, teacherId: number): Promise<Subject> => {
    const response = await api.put(`/subjects/${subjectId}/assign-teacher`, { teacher_id: teacherId });
    return response.data.subject;
  },

  removeTeacher: async (subjectId: number, teacherId: number): Promise<Subject> => {
    const response = await api.put(`/subjects/${subjectId}/remove-teacher`, { teacher_id: teacherId });
    return response.data.subject;
  },

  getSubjectsByClass: async (classId: number): Promise<{ subjects: Subject[]; pagination: any }> => {
    try {
      const response = await api.get(`/subjects/class/${classId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching subjects for class ${classId}:`, error);
      throw error;
    }
  },

  getSubjectById: async (subjectId: number): Promise<Subject> => {
    try {
      const response = await api.get(`/subjects/${subjectId}`);
      return response.data.subject;
    } catch (error) {
      console.error(`Error fetching subject ${subjectId}:`, error);
      throw error;
    }
  },

  createSubject: async (subjectData: SubjectCreate): Promise<Subject> => {
    try {
      const response = await api.post('/subjects', subjectData);
      return response.data.subject;
    } catch (error) {
      console.error('Error creating subject:', error);
      throw error;
    }
  },

  updateSubject: async (subjectId: number, subjectData: SubjectUpdate): Promise<Subject> => {
    try {
      const response = await api.put(`/subjects/${subjectId}`, subjectData);
      return response.data.subject;
    } catch (error) {
      console.error(`Error updating subject ${subjectId}:`, error);
      throw error;
    }
  },

  deleteSubject: async (subjectId: number, force: boolean = false): Promise<void> => {
    try {
      await api.delete(`/subjects/${subjectId}`, {
        params: { force: force.toString() }
      });
    } catch (error) {
      console.error(`Error deleting subject ${subjectId}:`, error);
      throw error;
    }
  },

  // New validation function
  validateSubjectDeletion: async (subjectId: number): Promise<ValidationResult> => {
    try {
      const response = await api.get(`/subjects/${subjectId}/validate-deletion`);
      return response.data;
    } catch (error) {
      console.error(`Error validating subject deletion ${subjectId}:`, error);
      throw error;
    }
  },

  // New bulk delete function
  bulkDeleteSubjects: async (subjectIds: number[]): Promise<void> => {
    try {
      const response = await api.post('/subjects/bulk-delete', {
        subject_ids: subjectIds
      });
      return response.data;
    } catch (error) {
      console.error('Error bulk deleting subjects:', error);
      throw error;
    }
  }
};

export { subjectService };
export default subjectService;
