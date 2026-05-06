import api from '../lib';

export interface CoreCompetency {
  id: number;
  name: string;
  code: string;
  description: string;
  category: string;
  applicable_key_phases: number[];
  assessment_indicators: string[];
  is_active: boolean;
}

export interface CompetencyAssessment {
  id: number;
  student_id: number;
  competency_id: number;
  assessment_date: string;
  term: string;
  academic_year: string;
  level_achieved: number; // 1-4 scale
  evidence: string;
  teacher_comments: string;
  assessed_by: number;
}

export interface StudentCompetencyProfile {
  id: number;
  student_id: number;
  academic_year: string;
  communication_collaboration_score: number;
  critical_thinking_score: number;
  creativity_innovation_score: number;
  cultural_identity_score: number;
  personal_development_score: number;
  digital_literacy_score: number;
  overall_competency_level: 'beginning' | 'developing' | 'proficient' | 'excellent';
  overall_score: number;
  strengths: string[];
  areas_for_improvement: string[];
  recommended_activities: string[];
  teacher_comments: string;
}

export interface CompetencyIndicator {
  id: number;
  competency_id: number;
  indicator_code: string;
  indicator_text: string;
  domain: string;
  min_educational_level: number;
  max_educational_level: number;
  level_1_descriptor: string;
  level_2_descriptor: string;
  level_3_descriptor: string;
  level_4_descriptor: string;
}

export interface CompetencyDashboardData {
  student_competencies: StudentCompetencyProfile[];
  class_averages: {
    [domain: string]: number;
  };
  competency_trends: {
    period: string;
    scores: { [domain: string]: number };
  }[];
  top_performers: {
    student_id: number;
    student_name: string;
    overall_score: number;
  }[];
  improvement_needed: {
    student_id: number;
    student_name: string;
    weak_areas: string[];
  }[];
}

export interface CompetencyAnalytics {
  overall_averages: { [domain: string]: number };
  level_distribution: { [level: string]: number };
  trends: { period: string; scores: { [domain: string]: number } }[];
}

export interface CompetencyMapping {
  student_id: number;
  competency_map: {
    [competency_code: string]: {
      current_level: number;
      target_level: number;
      progress_percentage: number;
      recent_assessments: CompetencyAssessment[];
    };
  };
  overall_progress: number;
  next_milestones: string[];
}

const competencyService = {
  // Get all core competencies
  getCoreCompetencies: async (): Promise<CoreCompetency[]> => {
    try {
      const response = await api.get('/core-competencies');
      return response.data.competencies;
    } catch (error) {
      console.error('Error fetching core competencies:', error);
      throw error;
    }
  },

  // Get competency indicators for a specific competency
  getCompetencyIndicators: async (competencyId: number): Promise<CompetencyIndicator[]> => {
    try {
      const response = await api.get(`/core-competencies/${competencyId}/indicators`);
      return response.data.indicators;
    } catch (error) {
      console.error(`Error fetching indicators for competency ${competencyId}:`, error);
      throw error;
    }
  },

  // Get student competency profile
  getStudentCompetencyProfile: async (studentId: number, academicYear?: string): Promise<StudentCompetencyProfile> => {
    try {
      const params = academicYear ? { academic_year: academicYear } : {};
      const response = await api.get(`/students/${studentId}/competency-profile`, { params });
      return response.data.profile;
    } catch (error) {
      console.error(`Error fetching competency profile for student ${studentId}:`, error);
      throw error;
    }
  },

  // Get competency assessments for a student
  getStudentCompetencyAssessments: async (studentId: number, params?: {
    academic_year?: string;
    term?: string;
    competency_id?: number;
  }): Promise<CompetencyAssessment[]> => {
    try {
      const response = await api.get(`/students/${studentId}/competency-assessments`, { params });
      return response.data.assessments;
    } catch (error) {
      console.error(`Error fetching competency assessments for student ${studentId}:`, error);
      throw error;
    }
  },

  // Create competency assessment
  createCompetencyAssessment: async (assessmentData: Omit<CompetencyAssessment, 'id'>): Promise<CompetencyAssessment> => {
    try {
      const response = await api.post('/competency-assessments', assessmentData);
      return response.data.assessment;
    } catch (error) {
      console.error('Error creating competency assessment:', error);
      throw error;
    }
  },

  // Update competency assessment
  updateCompetencyAssessment: async (assessmentId: number, assessmentData: Partial<CompetencyAssessment>): Promise<CompetencyAssessment> => {
    try {
      const response = await api.put(`/competency-assessments/${assessmentId}`, assessmentData);
      return response.data.assessment;
    } catch (error) {
      console.error(`Error updating competency assessment ${assessmentId}:`, error);
      throw error;
    }
  },

  // Get class competency dashboard data
  getClassCompetencyDashboard: async (classId: number, academicYear?: string): Promise<CompetencyDashboardData> => {
    try {
      const params = academicYear ? { academic_year: academicYear } : {};
      const response = await api.get(`/classes/${classId}/competency-dashboard`, { params });
      return response.data;
    } catch (error) {
      console.error(`Error fetching competency dashboard for class ${classId}:`, error);
      throw error;
    }
  },

  // Get school-wide competency analytics
  getSchoolCompetencyAnalytics: async (params?: {
    academic_year?: string;
    educational_level?: number;
  }): Promise<CompetencyAnalytics> => {
    try {
      const response = await api.get('/competencies/analytics', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching school competency analytics:', error);
      throw error;
    }
  },

  getCompetencyMapping: async (studentId: number): Promise<CompetencyMapping> => {
    try {
      const response = await api.get(`/competencies/mapping/${studentId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching competency mapping for student ${studentId}:`, error);
      throw error;
    }
  }
};

export default competencyService;