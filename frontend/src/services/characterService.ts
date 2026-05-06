import api from '../lib/api';

export interface CharacterDomain {
    id: number;
    name: string;
    description?: string;
    cultural_context?: string;
}

export interface CharacterTrait {
    id: number;
    name: string;
    domain: string;
    description?: string;
    behavioral_indicators: string[];
    assessment_criteria: string[];
}

export interface CharacterAssessment {
    id: number;
    student_id: number;
    trait_id: number;
    assessment_date: string;
    rating: number;
    evidence?: string;
    improvement_areas: string[];
    teacher_id: number;
    term?: string;
    academic_year?: string;
}

const characterService = {
    getDomains: async (): Promise<CharacterDomain[]> => {
        try {
            const response = await api.get('/character/domains');
            return response.data.data;
        } catch (error) {
            console.error('Error fetching character domains:', error);
            throw error;
        }
    },

    getTraits: async (educationalLevelId: number): Promise<CharacterTrait[]> => {
        try {
            const response = await api.get(`/character/traits/${educationalLevelId}`);
            return response.data.data;
        } catch (error) {
            console.error(`Error fetching character traits for level ${educationalLevelId}:`, error);
            throw error;
        }
    },

    assessTrait: async (studentId: number, assessmentData: Omit<CharacterAssessment, 'id' | 'student_id' | 'teacher_id'>): Promise<{ id: number }> => {
        try {
            const response = await api.post(`/character/student/${studentId}/assessment`, assessmentData);
            return response.data.data;
        } catch (error) {
            console.error(`Error assessing character trait for student ${studentId}:`, error);
            throw error;
        }
    }
};

export default characterService;
