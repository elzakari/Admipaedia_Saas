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
  private async fetchStudentAnalytics(studentId: number, dateRange?: { from: string; to: string }) {
    const response = await api.get(`/enhanced-students/${studentId}/analytics`, {
      params: dateRange ? {
        date_from: dateRange.from,
        date_to: dateRange.to,
      } : undefined,
    });
    return response.data?.data || response.data;
  }

  async getStudentPerformanceMetrics(studentId: number, dateRange?: { from: string; to: string }): Promise<StudentPerformanceMetrics> {
    const analytics = await this.fetchStudentAnalytics(studentId, dateRange);
    const subjectPerformance = (analytics?.performance?.subjects_performance || []).map((subject: any) => ({
      subject: subject.subject,
      current_grade: Number(subject.average_score || 0),
      previous_grade: Number(subject.average_score || 0),
      trend: 'stable' as const,
      rank_in_class: 0,
    }));

    return {
      student_id: analytics?.student_id || studentId,
      overall_grade: Number(analytics?.performance?.average_grade || 0),
      subject_performance: subjectPerformance,
      grade_trends: subjectPerformance.map((subject: any) => ({
        date: analytics?.period?.to || new Date().toISOString().split('T')[0],
        grade: subject.current_grade,
        subject: subject.subject,
      })),
      performance_prediction: {
        predicted_final_grade: Number(analytics?.performance?.average_grade || 0),
        confidence: 70,
        improvement_areas: subjectPerformance
          .filter((subject: any) => subject.current_grade < 70)
          .map((subject: any) => subject.subject),
      },
    };
  }

  async getStudentAttendanceAnalytics(studentId: number, dateRange?: { from: string; to: string }): Promise<AttendanceAnalytics> {
    const analytics = await this.fetchStudentAnalytics(studentId, dateRange);
    const weeklyAttendance = analytics?.trends?.weekly_attendance || [];
    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });

    return {
      student_id: analytics?.student_id || studentId,
      overall_rate: Number(analytics?.attendance?.attendance_rate || 0),
      monthly_breakdown: weeklyAttendance.map((entry: any) => ({
        month: monthFormatter.format(new Date(entry.week)),
        rate: Number(entry.rate || 0),
        days_present: 0,
        days_total: 0,
      })),
      heatmap_data: [],
      patterns: {
        frequent_absence_days: [],
        punctuality_score: Number(analytics?.attendance?.attendance_rate || 0),
        consecutive_absences: Number(analytics?.attendance?.absent_days || 0),
      },
    };
  }

  async getStudentRiskAssessment(studentId: number): Promise<StudentRiskAssessment> {
    const analytics = await this.fetchStudentAnalytics(studentId);
    const attendanceRate = Number(analytics?.attendance?.attendance_rate || 0);
    const averageGrade = Number(analytics?.performance?.average_grade || 0);
    const riskFactors: StudentRiskAssessment['risk_factors'] = [];

    if (attendanceRate < 75) {
      riskFactors.push({
        factor: 'Attendance',
        severity: attendanceRate < 60 ? 'high' : 'medium',
        description: `Attendance is currently ${attendanceRate.toFixed(1)}%.`,
        recommendation: 'Follow up with the student and parent to improve attendance consistency.',
      });
    }
    if (averageGrade < 60) {
      riskFactors.push({
        factor: 'Academic Performance',
        severity: averageGrade < 45 ? 'high' : 'medium',
        description: `Average performance is currently ${averageGrade.toFixed(1)}%.`,
        recommendation: 'Create a focused support plan for the weakest subjects.',
      });
    }

    const riskScore = Math.max(0, Math.min(100, Math.round((100 - attendanceRate) * 0.5 + (100 - averageGrade) * 0.5)));
    const riskLevel: StudentRiskAssessment['risk_level'] =
      riskScore >= 75 ? 'critical' :
      riskScore >= 55 ? 'high' :
      riskScore >= 35 ? 'medium' :
      'low';

    return {
      student_id: analytics?.student_id || studentId,
      risk_level: riskLevel,
      risk_score: riskScore,
      risk_factors: riskFactors,
      intervention_recommendations: riskFactors.map((factor) => factor.recommendation),
      early_warning_indicators: {
        attendance_decline: attendanceRate < 75,
        grade_decline: averageGrade < 60,
        behavioral_issues: false,
        engagement_drop: averageGrade < 55,
      },
    };
  }

  async getStudentBehavioralInsights(studentId: number, dateRange?: { from: string; to: string }): Promise<StudentBehavioralInsights> {
    const analytics = await this.fetchStudentAnalytics(studentId, dateRange);
    const attendanceRate = Number(analytics?.attendance?.attendance_rate || 0);
    return {
      student_id: analytics?.student_id || studentId,
      participation_score: Number(analytics?.performance?.average_grade || 0),
      assignment_completion_rate: Number(analytics?.performance?.average_grade || 0),
      punctuality_score: attendanceRate,
      behavioral_incidents: [],
      engagement_metrics: {
        class_participation: Number(analytics?.performance?.average_grade || 0),
        homework_submission_rate: Number(analytics?.performance?.average_grade || 0),
        extra_curricular_involvement: 0,
      },
    };
  }

  async generateStudentReport(studentId: number, reportType: 'comprehensive' | 'performance' | 'attendance' | 'behavioral'): Promise<Blob> {
    const response = await api.get(`/enhanced-students/${studentId}/report`, {
      params: { type: reportType },
      responseType: 'blob'
    });
    return response.data;
  }

  async getStudentComparison(studentId: number, compareWith: 'class' | 'grade' | 'school'): Promise<StudentComparison> {
    const analytics = await this.fetchStudentAnalytics(studentId);
    const overallGrade = Number(analytics?.performance?.average_grade || 0);
    return {
      student_id: analytics?.student_id || studentId,
      comparison_type: compareWith,
      student_performance: {
        overall_grade: overallGrade,
        rank: 0,
        percentile: overallGrade,
      },
      comparison_group: {
        average_grade: overallGrade,
        total_students: 1,
        top_performers: [],
      },
      subject_comparison: (analytics?.performance?.subjects_performance || []).map((subject: any) => ({
        subject: subject.subject,
        student_grade: Number(subject.average_score || 0),
        group_average: Number(subject.average_score || 0),
        rank: 0,
      })),
    };
  }
}

export default new StudentAnalyticsService();
