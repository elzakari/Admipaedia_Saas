import api from '../lib/api';

export interface Curriculum {
  id: number;
  title: string;
  description: string;
  grade_level: string;
  educational_level_id: number;
  subject_id: number;
  curriculum_standard: string;
  academic_year: string;
  term: string;
  created_by: number;
  status: string;
  duration_weeks?: number;
  created_at: string;
  updated_at: string;
  subject_name?: string;
}

export interface CurriculumUnit {
  id: number;
  curriculum_id: number;
  title: string;
  description: string;
  objectives: string;
  resources: string;
  duration_weeks: number;
  sequence_order: number;
  created_at: string;
  updated_at: string;
}

export interface CurriculumCreate {
  title: string;
  description: string;
  educational_level_id: number;
  subject_id: number;
  curriculum_standard: string;
  academic_year: string;
  term: string;
  duration_weeks?: number;
  status?: string;
}

export interface CurriculumUnitCreate {
  curriculum_id: number;
  title: string;
  description: string;
  objectives: string;
  resources: string;
  duration_weeks: number;
  sequence_order: number;
}

const curriculumService = {
  getCurricula: async (params?: {
    subject_id?: number;
    educational_level_id?: number;
    academic_year?: string;
    term?: string;
  }): Promise<Curriculum[]> => {
    try {
      const response = await api.get('/curriculum', { params });
      return ((response.data?.curricula || response.data?.data || []) as any[]).map((curriculum) => ({
        ...curriculum,
        grade_level: curriculum.grade_level || curriculum.educational_level?.name || '',
        subject_name: curriculum.subject_name || curriculum.subject?.name,
      }));
    } catch (error) {
      console.error('Error fetching curricula:', error);
      throw error;
    }
  },

  getCurriculumById: async (curriculumId: number): Promise<Curriculum> => {
    try {
      const response = await api.get(`/curriculum/${curriculumId}`);
      const curriculum = response.data?.curriculum || response.data?.data;
      return {
        ...curriculum,
        grade_level: curriculum?.grade_level || curriculum?.educational_level?.name || '',
        subject_name: curriculum?.subject_name || curriculum?.subject?.name,
      };
    } catch (error) {
      console.error(`Error fetching curriculum ${curriculumId}:`, error);
      throw error;
    }
  },

  createCurriculum: async (curriculumData: CurriculumCreate): Promise<Curriculum> => {
    try {
      const response = await api.post('/curriculum/', curriculumData);
      const curriculum = response.data?.curriculum || response.data?.data;
      return {
        ...curriculum,
        grade_level: curriculum?.grade_level || curriculum?.educational_level?.name || '',
        subject_name: curriculum?.subject_name || curriculum?.subject?.name,
      };
    } catch (error) {
      console.error('Error creating curriculum:', error);
      throw error;
    }
  },

  getCurriculumUnits: async (curriculumId: number): Promise<CurriculumUnit[]> => {
    try {
      const response = await api.get(`/curriculum/${curriculumId}/units`);
      return response.data?.units || response.data?.data || [];
    } catch (error) {
      console.error(`Error fetching units for curriculum ${curriculumId}:`, error);
      throw error;
    }
  },

  createCurriculumUnit: async (unitData: CurriculumUnitCreate): Promise<CurriculumUnit> => {
    try {
      const response = await api.post(`/curriculum/${unitData.curriculum_id}/units`, unitData);
      return response.data?.unit || response.data?.data;
    } catch (error) {
      console.error('Error creating curriculum unit:', error);
      throw error;
    }
  },

  updateCurriculum: async (curriculumId: number, curriculumData: Partial<CurriculumCreate>): Promise<Curriculum> => {
    try {
      const response = await api.put(`/curriculum/${curriculumId}`, curriculumData);
      const curriculum = response.data?.curriculum || response.data?.data;
      return {
        ...curriculum,
        grade_level: curriculum?.grade_level || curriculum?.educational_level?.name || '',
        subject_name: curriculum?.subject_name || curriculum?.subject?.name,
      };
    } catch (error) {
      console.error(`Error updating curriculum ${curriculumId}:`, error);
      throw error;
    }
  },

  deleteCurriculum: async (curriculumId: number): Promise<void> => {
    try {
      await api.delete(`/curriculum/${curriculumId}`);
    } catch (error) {
      console.error(`Error deleting curriculum ${curriculumId}:`, error);
      throw error;
    }
  },

  updateCurriculumUnit: async (unitId: number, unitData: Partial<CurriculumUnitCreate>): Promise<CurriculumUnit> => {
    try {
      const response = await api.put(`/curriculum/units/${unitId}`, unitData);
      return response.data?.unit || response.data?.data;
    } catch (error) {
      console.error(`Error updating curriculum unit ${unitId}:`, error);
      throw error;
    }
  },

  deleteCurriculumUnit: async (unitId: number): Promise<void> => {
    try {
      await api.delete(`/curriculum/units/${unitId}`);
    } catch (error) {
      console.error(`Error deleting curriculum unit ${unitId}:`, error);
      throw error;
    }
  }
};

export default curriculumService;
