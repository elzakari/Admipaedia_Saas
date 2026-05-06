import api from '../lib/api';

export interface StudentPerformanceMetrics {
  student_id: number;
  overall_grade: number;
  subject_performance: Array<{
    subject: string;
    current_grade: number;
    previous_grade: number;
    trend: 'up' | 'down' | 'stable';
    rank_in_class: number;
  }>;
  grade_trends: Array<{
    date: string;
    grade: number;
    subject: string;
  }>;
  performance_prediction: {
    predicted_final_grade: number;
    confidence: number;
    improvement_areas: string[];
  };
}

export interface AttendanceAnalytics {
  student_id: number;
  overall_rate: number;
  monthly_breakdown: Array<{
    month: string;
    rate: number;
    days_present: number;
    days_total: number;
  }>;
  heatmap_data: Array<{
    date: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    subject?: string;
  }>;
  patterns: {
    frequent_absence_days: string[];
    punctuality_score: number;
    consecutive_absences: number;
  };
}

export interface StudentRiskAssessment {
  student_id: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  risk_factors: Array<{
    factor: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    recommendation: string;
  }>;
  intervention_recommendations: string[];
  early_warning_indicators: {
    attendance_decline: boolean;
    grade_decline: boolean;
    behavioral_issues: boolean;
    engagement_drop: boolean;
  };
}

export interface StudentBehavioralInsights {
  student_id: number;
  participation_score: number;
  assignment_completion_rate: number;
  punctuality_score: number;
  behavioral_incidents: Array<{
    date: string;
    type: 'positive' | 'negative';
    description: string;
    severity?: 'low' | 'medium' | 'high';
  }>;
  engagement_metrics: {
    class_participation: number;
    homework_submission_rate: number;
    extra_curricular_involvement: number;
  };
}

export interface StudentComparison {
  student_id: number;
  comparison_type: 'class' | 'grade' | 'school';
  student_performance: {
    overall_grade: number;
    rank: number;
    percentile: number;
  };
  comparison_group: {
    average_grade: number;
    total_students: number;
    top_performers: Array<{
      student_id: number;
      name: string;
      grade: number;
    }>;
  };
  subject_comparison: Array<{
    subject: string;
    student_grade: number;
    group_average: number;
    rank: number;
  }>;
}

class StudentAnalyticsService {
  async getStudentPerformanceMetrics(studentId: number, dateRange?: { from: string; to: string }): Promise<StudentPerformanceMetrics> {
    const params = dateRange ? `?from=${dateRange.from}&to=${dateRange.to}` : '';
    const response = await api.get(`/students/${studentId}/analytics/performance${params}`);
    return response.data;
  }

  async getStudentAttendanceAnalytics(studentId: number, dateRange?: { from: string; to: string }): Promise<AttendanceAnalytics> {
    const params = dateRange ? `?from=${dateRange.from}&to=${dateRange.to}` : '';
    const response = await api.get(`/students/${studentId}/analytics/attendance${params}`);
    return response.data;
  }

  async getStudentRiskAssessment(studentId: number): Promise<StudentRiskAssessment> {
    const response = await api.get(`/students/${studentId}/analytics/risk-assessment`);
    return response.data;
  }

  async getStudentBehavioralInsights(studentId: number, dateRange?: { from: string; to: string }): Promise<StudentBehavioralInsights> {
    const params = dateRange ? `?from=${dateRange.from}&to=${dateRange.to}` : '';
    const response = await api.get(`/students/${studentId}/analytics/behavioral${params}`);
    return response.data;
  }

  async generateStudentReport(studentId: number, reportType: 'comprehensive' | 'performance' | 'attendance' | 'behavioral'): Promise<Blob> {
    const response = await api.get(`/students/${studentId}/reports/${reportType}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async getStudentComparison(studentId: number, compareWith: 'class' | 'grade' | 'school'): Promise<StudentComparison> {
    const response = await api.get(`/students/${studentId}/analytics/comparison?compare_with=${compareWith}`);
    return response.data;
  }
}

export default new StudentAnalyticsService();