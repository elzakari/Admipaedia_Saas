import api from '../lib/api';

export interface AssessmentFramework {
    id: number;
    name: string;
    subject_id?: number;
    framework_type: string;
    description?: string;
    assessment_criteria: {
        formative_weight?: number;
        summative_weight?: number;
        school_based_weight?: number;
        project_weight?: number;
        formative_frequency?: string;
        summative_frequency?: string;
    };
    scoring_rubric: {
        curriculum_standards?: any[];
        competency_indicators?: any[];
    };
}

export interface SchoolBasedAssessmentPayload {
    student_id: number;
    subject_id: number;
    class_id: number;
    academic_year: string;
    term: string;
    assessment_date: string;
    class_exercises_score?: number;
    homework_score?: number;
    project_score?: number;
    assignment_score?: number;
    class_test_scores?: number[];
    class_test_average?: number;
    total_sba_score?: number;
    sba_percentage?: number;
    core_competencies_score?: any;
    subject_competencies_score?: any;
    // Backward-compatible legacy fields still accepted by the backend route.
    title?: string;
    assessment_type?: string;
    description?: string;
    total_marks?: number;
    duration_minutes?: number;
    instructions?: string;
    marking_scheme?: any;
}

export interface ContinuousAssessmentPayload {
    subject_id: number;
    class_id?: number;
    academic_year: string;
    term: string;
    assessment_date: string;
    assessment_type?: string;
    assessment_focus?: string;
    score?: number;
    max_score?: number;
    class_score?: number;
    homework_score?: number;
    participation_score?: number;
    quiz_score?: number;
    feedback?: string;
    teacher_observations?: string;
    competencies_demonstrated?: any[];
    competency_levels?: Record<string, any>;
    learning_difficulties?: string;
    strengths_noted?: string;
    next_steps?: string;
    support_needed?: string;
    week_number?: number;
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

    createSBA: async (sbaData: SchoolBasedAssessmentPayload): Promise<{ id: number }> => {
        try {
            const response = await api.post('/assessment/sba', sbaData);
            return response.data.data;
        } catch (error) {
            console.error('Error creating SBA:', error);
            throw error;
        }
    },

    recordContinuousAssessment: async (studentId: number, recordData: ContinuousAssessmentPayload): Promise<{ id: number }> => {
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
