import api from '../lib/api';

export interface StudentPrediction {
  student_id: number;
  prediction_available: boolean;
  predicted_score: number;
  confidence: number;
  current_average: number;
  trend_analysis: {
    trend_direction: 'improving' | 'stable' | 'declining';
    trend_strength: number;
    volatility: number;
    recent_average: number;
  };
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  prediction_period_days: number;
  recommendations: Recommendation[];
  model_metrics: {
    data_points_used: number;
    model_accuracy: number;
    last_updated: string;
  };
}

export interface RiskAssessment {
  student_id: number;
  risk_assessment_available: boolean;
  overall_risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_factors: {
    attendance_risk: number;
    performance_risk: number;
    engagement_risk: number;
    consistency_risk: number;
  };
  early_warning_indicators: {
    attendance_decline: boolean;
    performance_decline: boolean;
    engagement_issues: boolean;
    inconsistent_performance: boolean;
  };
  recommended_interventions: Recommendation[];
  assessment_date: string;
}

export interface ClassPrediction {
  class_id: number;
  predictions_available: boolean;
  student_predictions: Array<{
    student_id: number;
    student_name: string;
    predicted_score: number;
    confidence: number;
    risk_level: string;
    trend: string;
  }>;
  class_statistics: {
    predicted_average: number;
    predicted_median: number;
    standard_deviation: number;
    predicted_pass_rate: number;
    total_students: number;
    successful_predictions: number;
  };
  risk_distribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  average_confidence: number;
  class_recommendations: Recommendation[];
  prediction_period_days: number;
  generated_at: string;
}

export interface SchoolInsights {
  school_insights_available: boolean;
  analysis_period: {
    from: string;
    to: string;
  };
  school_statistics: {
    total_students: number;
    total_classes: number;
    predicted_school_average: number;
    predicted_pass_rate: number;
    average_risk_score: number;
  };
  risk_distribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  class_predictions: Array<{
    class_id: number;
    class_name: string;
    class_statistics: any;
    risk_distribution: any;
  }>;
  trend_analysis: any;
  school_recommendations: Recommendation[];
  generated_at: string;
}

export interface Recommendation {
  category: string;
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  actions: string[];
}

export interface AttendancePattern {
  pattern_type: string;
  description: string;
  confidence: number;
  recommendations: string[];
}

export interface PerformanceAnomaly {
  student_id: number;
  student_name: string;
  anomaly_type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  detected_at: string;
  recommended_actions: string[];
}

export class AIAnalyticsService {
  /**
   * Get AI-powered performance prediction for a student
   */
  static async getStudentPrediction(
    studentId: number,
    period: number = 30,
    subjectId?: number
  ): Promise<StudentPrediction> {
    try {
      const params = new URLSearchParams();
      params.append('period', period.toString());
      if (subjectId) {
        params.append('subject_id', subjectId.toString());
      }

      const response = await api.get(
        `/ai-analytics/predictions/student/${studentId}?${params}`
      );
      return response.data.data;
    } catch (error) {
      console.error('Error fetching student prediction:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive risk assessment for a student
   */
  static async getStudentRiskAssessment(studentId: number): Promise<RiskAssessment> {
    try {
      const response = await api.get(`/ai-analytics/risk-assessment/student/${studentId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching risk assessment:', error);
      throw error;
    }
  }

  /**
   * Get AI predictions for entire class
   */
  static async getClassPredictions(
    classId: number,
    period: number = 30,
    subjectId?: number
  ): Promise<ClassPrediction> {
    try {
      const params = new URLSearchParams();
      params.append('period', period.toString());
      if (subjectId) {
        params.append('subject_id', subjectId.toString());
      }

      const response = await api.get(
        `/ai-analytics/predictions/class/${classId}?${params}`
      );
      return response.data.data;
    } catch (error) {
      console.error('Error fetching class predictions:', error);
      throw error;
    }
  }

  /**
   * Get school-wide AI insights
   */
  static async getSchoolInsights(
    dateFrom?: string,
    dateTo?: string
  ): Promise<SchoolInsights> {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const response = await api.get(`/ai-analytics/insights/school-wide?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching school insights:', error);
      throw error;
    }
  }

  /**
   * Get AI-generated recommendations for a student
   */
  static async getStudentRecommendations(
    studentId: number,
    type: string = 'all'
  ): Promise<Recommendation[]> {
    try {
      const params = new URLSearchParams();
      params.append('type', type);

      const response = await api.get(
        `/ai-analytics/recommendations/student/${studentId}?${params}`
      );
      return response.data.data;
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      throw error;
    }
  }

  /**
   * Analyze attendance patterns using AI
   */
  static async analyzeAttendancePatterns(
    classId?: number,
    studentId?: number,
    period: number = 90
  ): Promise<AttendancePattern[]> {
    try {
      const params = new URLSearchParams();
      params.append('period', period.toString());
      if (classId) params.append('class_id', classId.toString());
      if (studentId) params.append('student_id', studentId.toString());

      const response = await api.get(`/ai-analytics/patterns/attendance?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error analyzing attendance patterns:', error);
      throw error;
    }
  }

  /**
   * Detect performance anomalies using machine learning
   */
  static async detectPerformanceAnomalies(
    classId?: number,
    subjectId?: number,
    sensitivity: number = 0.1
  ): Promise<PerformanceAnomaly[]> {
    try {
      const params = new URLSearchParams();
      params.append('sensitivity', sensitivity.toString());
      if (classId) params.append('class_id', classId.toString());
      if (subjectId) params.append('subject_id', subjectId.toString());

      const response = await api.get(`/ai-analytics/anomalies/detection?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      throw error;
    }
  }

  /**
   * Generate batch predictions for multiple entities
   */
  static async generateBatchPredictions(
    type: 'student' | 'class' | 'school',
    entityIds: number[],
    period: number = 30
  ): Promise<any> {
    try {
      const response = await api.post('/ai-analytics/predictions/batch', {
        type,
        entity_ids: entityIds,
        period
      });
      return response.data.data;
    } catch (error) {
      console.error('Error generating batch predictions:', error);
      throw error;
    }
  }

  /**
   * Get AI dashboard summary
   */
  static async getDashboardSummary(
    role: string = 'admin',
    classId?: number
  ): Promise<any> {
    try {
      const params = new URLSearchParams();
      params.append('role', role);
      if (classId) params.append('class_id', classId.toString());

      const response = await api.get(`/ai-analytics/dashboard/ai-summary?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching AI dashboard summary:', error);
      throw error;
    }
  }

  /**
   * Forecast enrollment trends
   */
  static async forecastEnrollment(months: number = 12): Promise<any> {
    try {
      const params = new URLSearchParams();
      params.append('months', months.toString());

      const response = await api.get(`/ai-analytics/forecasting/enrollment?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error forecasting enrollment:', error);
      throw error;
    }
  }

  /**
   * Get resource allocation optimization recommendations
   */
  static async optimizeResourceAllocation(type: string = 'all'): Promise<any> {
    try {
      const params = new URLSearchParams();
      params.append('type', type);

      const response = await api.get(`/ai-analytics/optimization/resource-allocation?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error optimizing resources:', error);
      throw error;
    }
  }

  /**
   * Analyze teacher performance using AI
   */
  static async analyzeTeacherPerformance(
    teacherId?: number,
    period: number = 90
  ): Promise<any> {
    try {
      const params = new URLSearchParams();
      params.append('period', period.toString());
      if (teacherId) params.append('teacher_id', teacherId.toString());

      const response = await api.get(`/ai-analytics/insights/teacher-performance?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error analyzing teacher performance:', error);
      throw error;
    }
  }

  /**
   * Retrain AI models with latest data
   */
  static async retrainModels(modelType: string = 'all'): Promise<any> {
    try {
      const response = await api.post('/ai-analytics/model/retrain', {
        model_type: modelType
      });
      return response.data.data;
    } catch (error) {
      console.error('Error retraining models:', error);
      throw error;
    }
  }
}

export default AIAnalyticsService;