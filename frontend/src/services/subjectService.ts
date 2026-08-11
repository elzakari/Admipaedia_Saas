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
  classes?: Array<{ id: number; name: string; display_name?: string; section?: string | null }>;
  teachers?: Array<{ id: number; name: string }>;
  created_at: string;
  updated_at: string;
}

export interface SubjectCreate {
  name: string;
  code?: string | null;
  description?: string;
  department?: string;
  department_id?: number | null;
  credit_hours?: number | null;
  is_active?: boolean;
  assigned_class_ids?: number[];
  assigned_teacher_ids?: number[];
}

export interface SubjectUpdate {
  name?: string;
  code?: string | null;
  description?: string;
  department?: string;
  department_id?: number | null;
  credit_hours?: number | null;
  is_active?: boolean;
  assigned_class_ids?: number[];
  assigned_teacher_ids?: number[];
}

const subjectService = {
  getSubjects: async (params?: {
    page?: number | undefined;
    per_page?: number | undefined;
    department?: string | undefined;
    is_active?: boolean | undefined;
    class_id?: number | undefined;
    search?: string | undefined;
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
      const { assigned_class_ids, assigned_teacher_ids, ...basePayload } = subjectData;
      const payload: Record<string, unknown> = { ...basePayload };
      if (assigned_class_ids !== undefined) payload.assigned_class_ids = assigned_class_ids;
      if (assigned_teacher_ids !== undefined) payload.assigned_teacher_ids = assigned_teacher_ids;
      if (payload.code !== undefined && (payload.code === null || String(payload.code).trim() === '')) {
        delete payload.code;
      }
      if (payload.credit_hours !== undefined && payload.credit_hours !== null) {
        const numeric = Number(payload.credit_hours);
        payload.credit_hours = Number.isFinite(numeric) ? numeric : null;
      }
      const response = await api.post('/subjects', payload);
      return response.data.subject;
    } catch (error: any) {
      const message = error?.response?.data?.message
        || (() => {
          const err = error?.response?.data?.errors;
          if (!err) return undefined;
          const firstKey = Object.keys(err)[0];
          const firstVal = firstKey ? err[firstKey] : undefined;
          return Array.isArray(firstVal) ? `${firstKey}: ${firstVal[0]}` : firstKey ? `${firstKey}: ${firstVal}` : undefined;
        })()
        || error?.message
        || 'Failed to create subject';
      const wrapper: any = new Error(message);
      wrapper.response = error?.response;
      wrapper.original = error;
      console.error('Error creating subject:', error);
      throw wrapper;
    }
  },

  updateSubject: async (subjectId: number, subjectData: SubjectUpdate): Promise<Subject> => {
    try {
      const { assigned_class_ids, assigned_teacher_ids, ...apiPayload } = (subjectData as SubjectUpdate & {
        assigned_class_ids?: number[];
        assigned_teacher_ids?: number[];
      });
      if (assigned_class_ids !== undefined) (apiPayload as any).assigned_class_ids = assigned_class_ids;
      if (assigned_teacher_ids !== undefined) (apiPayload as any).assigned_teacher_ids = assigned_teacher_ids;
      const response = await api.put(`/subjects/${subjectId}`, apiPayload);
      return response.data.subject;
    } catch (error: any) {
      const message = error?.response?.data?.message
        || (() => {
          const err = error?.response?.data?.errors;
          if (!err) return undefined;
          const firstKey = Object.keys(err)[0];
          const firstVal = firstKey ? err[firstKey] : undefined;
          return Array.isArray(firstVal) ? `${firstKey}: ${firstVal[0]}` : firstKey ? `${firstKey}: ${firstVal}` : undefined;
        })()
        || error?.message
        || 'Failed to update subject';
      const wrapper: any = new Error(message);
      wrapper.response = error?.response;
      wrapper.original = error;
      console.error(`Error updating subject ${subjectId}:`, error);
      throw wrapper;
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
