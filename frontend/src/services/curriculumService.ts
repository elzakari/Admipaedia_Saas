import api from '../lib';

export interface Curriculum {
  id: number;
  title: string;
  description: string;
  grade_level: string;
  subject_id: number;
  academic_year: string;
  created_by: number;
  status: string;
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
  grade_level: string;
  subject_id: number;
  academic_year: string;
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
    grade_level?: string;
    academic_year?: string;
  }): Promise<Curriculum[]> => {
    try {
      const response = await api.get('/curricula', { params });
      return response.data.curricula;
    } catch (error) {
      console.error('Error fetching curricula:', error);
      throw error;
    }
  },

  getCurriculumById: async (curriculumId: number): Promise<Curriculum> => {
    try {
      const response = await api.get(`/curricula/${curriculumId}`);
      return response.data.curriculum;
    } catch (error) {
      console.error(`Error fetching curriculum ${curriculumId}:`, error);
      throw error;
    }
  },

  createCurriculum: async (curriculumData: CurriculumCreate): Promise<Curriculum> => {
    try {
      const response = await api.post('/curricula', curriculumData);
      return response.data.curriculum;
    } catch (error) {
      console.error('Error creating curriculum:', error);
      throw error;
    }
  },

  getCurriculumUnits: async (curriculumId: number): Promise<CurriculumUnit[]> => {
    try {
      const response = await api.get(`/curricula/${curriculumId}/units`);
      return response.data.units;
    } catch (error) {
      console.error(`Error fetching units for curriculum ${curriculumId}:`, error);
      throw error;
    }
  },

  createCurriculumUnit: async (unitData: CurriculumUnitCreate): Promise<CurriculumUnit> => {
    try {
      const response = await api.post('/curriculum-units', unitData);
      return response.data.unit;
    } catch (error) {
      console.error('Error creating curriculum unit:', error);
      throw error;
    }
  },

  updateCurriculum: async (curriculumId: number, curriculumData: Partial<CurriculumCreate>): Promise<Curriculum> => {
    try {
      const response = await api.put(`/curricula/${curriculumId}`, curriculumData);
      return response.data.curriculum;
    } catch (error) {
      console.error(`Error updating curriculum ${curriculumId}:`, error);
      throw error;
    }
  },

  deleteCurriculum: async (curriculumId: number): Promise<void> => {
    try {
      await api.delete(`/curricula/${curriculumId}`);
    } catch (error) {
      console.error(`Error deleting curriculum ${curriculumId}:`, error);
      throw error;
    }
  },

  updateCurriculumUnit: async (unitId: number, unitData: Partial<CurriculumUnitCreate>): Promise<CurriculumUnit> => {
    try {
      const response = await api.put(`/curriculum-units/${unitId}`, unitData);
      return response.data.unit;
    } catch (error) {
      console.error(`Error updating curriculum unit ${unitId}:`, error);
      throw error;
    }
  },

  deleteCurriculumUnit: async (unitId: number): Promise<void> => {
    try {
      await api.delete(`/curriculum-units/${unitId}`);
    } catch (error) {
      console.error(`Error deleting curriculum unit ${unitId}:`, error);
      throw error;
    }
  }
};

export default curriculumService;