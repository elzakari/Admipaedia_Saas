import api from '../lib/api';

export interface GESGradeBoundary {
    min: number;
    max: number;
    points: number;
    interpretation: string;
}

export interface GESGradeBoundaries {
    [key: string]: GESGradeBoundary;
}

export interface EnhancedGrade {
    id: number;
    student_id: number;
    subject_id: number;
    class_id: number;
    assessment_type_id: number;
    grading_scheme_id: number;
    raw_score: number;
    total_marks: number;
    percentage: number;
    grade_symbol: string;
    grade_points: number;
    is_passing: boolean;
    weight: number;
    assessment_name: string;
    assessment_date: string;
    term: string;
    academic_year: string;
    teacher_comments?: string;
}

const enhancedGradingService = {
    createGrade: async (gradeData: any): Promise<any> => {
        try {
            const response = await api.post('/enhanced-grading/create-grade', gradeData);
            return response.data;
        } catch (error) {
            console.error('Error creating enhanced grade:', error);
            throw error;
        }
    },

    calculateFinalGrade: async (data: any): Promise<any> => {
        try {
            const response = await api.post('/enhanced-grading/calculate-final-grade', data);
            return response.data;
        } catch (error) {
            console.error('Error calculating final grade:', error);
            throw error;
        }
    },

    getStudentAnalytics: async (studentId: number, params: { academic_year: string; term?: string }): Promise<any> => {
        try {
            const response = await api.get(`/enhanced-grading/student-analytics/${studentId}`, { params });
            return response.data;
        } catch (error) {
            console.error(`Error fetching analytics for student ${studentId}:`, error);
            throw error;
        }
    },

    getClassAnalytics: async (classId: number, params: { subject_id?: number; term?: string; academic_year?: string }): Promise<any> => {
        try {
            const response = await api.get(`/enhanced-grading/class-analytics/${classId}`, { params });
            return response.data;
        } catch (error) {
            console.error(`Error fetching analytics for class ${classId}:`, error);
            throw error;
        }
    },

    getGESGradeBoundaries: async (): Promise<any> => {
        try {
            const response = await api.get('/enhanced-grading/ges-grade-boundaries');
            return response.data;
        } catch (error) {
            console.error('Error fetching GES grade boundaries:', error);
            throw error;
        }
    }
};

export default enhancedGradingService;
export { enhancedGradingService };
