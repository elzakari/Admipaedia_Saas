import { api } from '../lib/api';

export interface EducationalLevel {
  id: number;
  level_name: string;
  level_code: string;
  key_phase: string;
  key_phase_description: string;
  min_age?: number;
  max_age?: number;
  curriculum_focus?: string;
  is_active: boolean;
}

export interface CoreCompetency {
  id: number;
  name: string;
  description: string;
  category: string;
  is_active: boolean;
}

export interface GradingScheme {
  grade: string;
  minScore: number;
  maxScore: number;
  description: string;
}

export const gesService = {
  getEducationalLevels: async (): Promise<EducationalLevel[]> => {
    try {
      const response = await api.get('/academics/educational-levels');
      return response.data.success ? response.data.levels : [];
    } catch (error) {
      console.error('Error fetching educational levels:', error);
      return [];
    }
  },

  getCoreCompetencies: async (): Promise<CoreCompetency[]> => {
    try {
      const response = await api.get('/academics/core-competencies');
      return response.data.success ? response.data.competencies : [];
    } catch (error) {
      console.error('Error fetching core competencies:', error);
      return [];
    }
  },

  getGradingScheme: async (): Promise<GradingScheme[]> => {
    try {
      const response = await api.get('/academics/grading-scheme');
      return response.data.success ? response.data.gradingScheme : [];
    } catch (error) {
      console.error('Error fetching grading scheme:', error);
      return [];
    }
  }
};
