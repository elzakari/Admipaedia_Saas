import api from '../lib/api';

export interface AssessmentFramework {
    id: number;
    name: string;
    framework_type: string;
    description?: string;
    assessment_criteria: any;
    scoring_rubric: any;
}

export interface SchoolBasedAssessment {
    id: number;
    title: string;
    subject_id: number;
    class_id: number;
    assessment_type: string;
    description?: string;
    total_marks: number;
    duration_minutes?: number;
    assessment_date: string;
    instructions?: string;
    marking_scheme?: any;
    teacher_id: number;
    term?: string;
    academic_year?: string;
}

export interface ContinuousAssessmentRecord {
    id: number;
    student_id: number;
    subject_id: number;
    assessment_date: string;
    assessment_type: string;
    score: number;
    max_score: number;
    feedback?: string;
    teacher_id: number;
    term?: string;
    academic_year?: string;
}

const assessmentService = {
    getFrameworks: async (educationalLevelId: number): Promise<AssessmentFramework[]> => {
        try {
            const response = await api.get(`/assessment/frameworks/${educationalLevelId}`);
            return response.data.data;
        } catch (error) {
            console.error(`Error fetching assessment frameworks for level ${educationalLevelId}:`, error);
            throw error;
        }
    },

    createSBA: async (sbaData: Omit<SchoolBasedAssessment, 'id' | 'teacher_id'>): Promise<{ id: number }> => {
        try {
            const response = await api.post('/assessment/sba', sbaData);
            return response.data.data;
        } catch (error) {
            console.error('Error creating SBA:', error);
            throw error;
        }
    },

    recordContinuousAssessment: async (studentId: number, recordData: Omit<ContinuousAssessmentRecord, 'id' | 'student_id' | 'teacher_id'>): Promise<{ id: number }> => {
        try {
            const response = await api.post(`/assessment/continuous/${studentId}`, recordData);
            return response.data.data;
        } catch (error) {
            console.error(`Error recording continuous assessment for student ${studentId}:`, error);
            throw error;
        }
    }
};

export default assessmentService;
