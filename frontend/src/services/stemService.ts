import api from '../lib/api';

export interface STEMDomain {
    id: number;
    name: string;
    code: string;
    description?: string;
    color_code?: string;
}

export interface STEMSubject {
    id: number;
    subject_name: string;
    stem_domain: string;
    integration_level: string;
    practical_hours_per_week: number;
    theory_hours_per_week: number;
}

export interface STEMProject {
    id: number;
    learning_module_id: number;
    title: string;
    description: string;
    problem_statement: string;
    duration_days: number;
    difficulty_level?: string;
    is_individual?: boolean;
    is_group?: boolean;
    max_group_size?: number;
    milestones?: unknown[];
    required_resources?: unknown[];
    expected_deliverables?: unknown[];
    evaluation_criteria?: unknown[];
    industry_connections?: unknown[];
    community_impact?: string;
    sustainability_focus?: boolean;
    created_by: number;
}

const stemService = {
    getDomains: async (): Promise<STEMDomain[]> => {
        try {
            const response = await api.get('/stem/domains');
            return response.data.data;
        } catch (error) {
            console.error('Error fetching STEM domains:', error);
            throw error;
        }
    },

    getSubjects: async (educationalLevelId: number): Promise<STEMSubject[]> => {
        try {
            const response = await api.get(`/stem/subjects/${educationalLevelId}`);
            return response.data.data;
        } catch (error) {
            console.error(`Error fetching STEM subjects for level ${educationalLevelId}:`, error);
            throw error;
        }
    },

    createProject: async (projectData: Omit<STEMProject, 'id' | 'created_by'>): Promise<{ id: number }> => {
        try {
            const response = await api.post('/stem/projects', projectData);
            return response.data.data;
        } catch (error) {
            console.error('Error creating STEM project:', error);
            throw error;
        }
    }
};

export default stemService;
